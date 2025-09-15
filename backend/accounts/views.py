from django.shortcuts import redirect, get_object_or_404
from django.http import HttpResponseRedirect, HttpResponse
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate, login
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from dotenv import load_dotenv
import os
import urllib.parse
import requests
from .utils import get_access_token, get_user_info, get_kakao_user_info
from .serializers import UserSerializer, UserProfileUpdateSerializer

# Create your views here.
# 환경변수 로드
load_dotenv()

# Allow custom app scheme globally for redirects (fixes unsafe redirect error)
try:
    HttpResponseRedirect.allowed_schemes.add('timetravelapp')
except Exception:
    pass

# OAuth
# 구글 로그인 요청 보내기
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def google_login(request):
    # TODO: 아래 하드코딩 값들은 환경변수(.env)로 이동해야 합니다.
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = "https://incheon-time-traveler.duckdns.org/v1/users/google/callback/"
    scope = "openid email profile"
    response_type = "code"
    # 외부 브라우저(RN Linking) 플로우 지원을 위한 state 설정
    # 앱에서 /google/login?client=app 로 호출하면 state=app 으로 전달
    state = "app" if request.GET.get("client") == "app" else "web"

    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode({
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": response_type,
            "scope": scope,
            "state": state,
            "prompt": "select_account",
        })
    )

    return redirect(google_auth_url)


# 토큰 생성 함수
def generate_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh)
    }

# 구글 응답 처리하기
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def google_callback(request):
    User = get_user_model()
    # Debug diagnostics for incoming callback
    try:
        print("[google_callback] full_path:", request.get_full_path())
        print("[google_callback] query:", dict(request.GET))
    except Exception:
        pass

    # Google 에서 준 인가 코드
    code = request.GET.get("code")
    if not code:
        print("No code provided")
        return redirect("/")
    
    # Google에서 엑세스 토큰 요청
    access_token = get_access_token(code)
    if not access_token:
        print("[google_callback] Failed to exchange code for access_token")
        return redirect("/")
    
    # 사용자 정보 요청
    email, name, nickname = get_user_info(access_token)
    if not email:
        print("[google_callback] Failed to fetch userinfo with access_token")
        return redirect("/")
    
    # 사용자 생성 또는 로그인
    user, created = User.objects.get_or_create(
        useremail=email,
        defaults={
            "username" : name,
            "nickname" : nickname,
            "age" : "",
            "gender" : "",
            "phone" : "",
            "isSuperUser" : False,
        },
    )
    
    refresh_token = RefreshToken.for_user(user)
    access_token = str(refresh_token.access_token)
    
    # TODO: 아래 리다이렉트 대상(도메인/스킴)은 하드코딩이며 .env로 이동하세요.
    app_scheme_success = f"timetravelapp://login-success?access={access_token}"
    web_success = f"https://incheon-time-traveler.duckdns.org/v1/users/login-success?access={access_token}"
    state = request.GET.get("state", "web")
    # Google은 WebView 금지 → 앱에서 Linking 사용 시(state=app) 커스텀 스킴으로 리다이렉트
    if state == "app":
        # Use raw 302 redirect to custom scheme to bypass Django safety checks
        return HttpResponse(status=302, headers={"Location": app_scheme_success})
    else:
        response = redirect(web_success)
        response.set_cookie(
            key='refresh_token',
            value=str(refresh_token),
            httponly=True,  # HTTPS에서는 True
            secure=True,  # HTTPS에서는 True
            samesite='Lax',
            domain='incheon-time-traveler.duckdns.org',  # 운영 도메인
            path='/',  # 경로 설정
            max_age=60 * 60 * 24 * 14  # 14일
        )
        return response


# 카카오 로그인
@api_view(['GET'])
@permission_classes([AllowAny])
def kakao_login(request):
    # TODO: 아래 하드코딩 값들은 환경변수(.env)로 이동해야 합니다.
    client_id = os.getenv("KAKAO_REST_API_KEY", "REPLACE_WITH_KAKAO_REST_API_KEY")
    redirect_uri = "https://incheon-time-traveler.duckdns.org/v1/users/kakao/callback/"
    response_type = "code"

    kakao_auth_url = (
        "https://kauth.kakao.com/oauth/authorize?"
        + urllib.parse.urlencode({
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": response_type,
            "prompt": "select_account",
        })
    )

    return redirect(kakao_auth_url)

# 카카오 응답 처리하기
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def kakao_callback(request):
    code = request.GET.get("code")
    if not code:
        return Response({"error": "No code provided"}, status=400)

    # 1. access token 요청
    token_url = "https://kauth.kakao.com/oauth/token"
    # TODO: 아래 client_id, redirect_uri는 하드코딩되어 있으며 .env로 이동해야 합니다.
    data = {
        "grant_type": "authorization_code",
        "client_id": os.getenv("KAKAO_REST_API_KEY", "REPLACE_WITH_KAKAO_REST_API_KEY"),
        "redirect_uri": "https://incheon-time-traveler.duckdns.org/v1/users/kakao/callback/",
        "code": code,
    }
    token_response = requests.post(token_url, data=data)
    token_json = token_response.json()
    access_token = token_json.get("access_token")

    if not access_token:
        return Response({"error": "Failed to retrieve access token"}, status=400)

    # 2. 사용자 정보 요청 (utils)
    email, name,nickname = get_kakao_user_info(access_token)

    # 3. 유저 생성 or 로그인 처리
    User = get_user_model()
    
    user, created = User.objects.get_or_create(
        useremail=email,
        defaults={
            "username" : name,
            "nickname" : nickname,
            "age" : "",
            "gender" : "",
            "phone" : "",
            "isSuperUser" : False,
        },
    )

    refresh_token = RefreshToken.for_user(user)
    access_token = str(refresh_token.access_token)
    
    # React Native WebView에서 토큰을 감지할 수 있도록 우리 도메인의 특정 경로로 리다이렉트합니다.
    # TODO: 경로/도메인은 하드코딩되어 있으며, 추후 환경변수로 분리하세요.
    response = redirect(f"https://incheon-time-traveler.duckdns.org/v1/users/login-success?access={access_token}")
    response.set_cookie(
        key='refresh_token',
        value=str(refresh_token),
        httponly=True,
        secure=True,  # HTTPS 운영 환경
        samesite='Lax',
        domain='incheon-time-traveler.duckdns.org',  # 운영 도메인
        path='/',  # 경로 설정
        max_age=60 * 60 * 24 * 14  # 14일
    )
    return response


# 로그아웃
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data["refresh_token"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response(status=205)
    except Exception:
        return Response(status=400)


# 프로필 조회 및 수정
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile(request, user_id):
    try:
        # JWT 토큰 디버깅 정보 추가
        print(f"[DEBUG] Profile view called - user_id: {user_id}")
        print(f"[DEBUG] request.user.id: {request.user.id}")
        print(f"[DEBUG] request.user.username: {request.user.username}")
        print(f"[DEBUG] request.user.email: {request.user.email}")
        print(f"[DEBUG] request.auth: {request.auth}")
        
        user = get_object_or_404(get_user_model(), pk=user_id)
        
        if request.method == 'GET':
            serializer = UserSerializer(user)
            return Response(serializer.data)
            
        elif request.method == 'PUT':
            # 자신의 프로필만 수정할 수 있도록 체크
            print(f"[DEBUG] PUT request - request.user.id: {request.user.id}, user_id: {user_id}")
            if request.user.id != user_id:
                print(f"[DEBUG] 403 Error - User ID mismatch: {request.user.id} != {user_id}")
                return Response({'error': '자신의 프로필만 수정할 수 있습니다.'}, status=403)
            serializer = UserProfileUpdateSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
            
    except Exception as e:
        print(f"[DEBUG] Profile view error: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_profile(request, user_id):
    try:
        user = get_object_or_404(get_user_model(), pk=user_id)
        user.delete()
        return Response(status=204)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# refresh 토큰 전달하기
class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        print('쿠키:', request.COOKIES)  # ✅ 확인용
        request.data['refresh'] = request.COOKIES.get('refresh_token')
        return super().post(request, *args, **kwargs)


# 인증 성공 페이지 (React Native 앱에서 토큰을 받기 위한 페이지)
@api_view(['GET'])
def auth_success(request):
    """
    React Native 앱에서 OAuth 로그인 성공 후 토큰을 받기 위한 페이지
    """
    access_token = request.GET.get('access')
    
    if not access_token:
        return Response({"error": "No access token provided"}, status=400)
    
    # 간단한 HTML 페이지 반환 (토큰을 JavaScript로 추출할 수 있도록)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>로그인 성공</title>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 50px;
                background-color: #f5f5f5;
            }}
            .success-box {{
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 400px;
                margin: 0 auto;
            }}
            .success-icon {{
                color: #4CAF50;
                font-size: 48px;
                margin-bottom: 20px;
            }}
            h1 {{
                color: #333;
                margin-bottom: 20px;
            }}
            p {{
                color: #666;
                line-height: 1.6;
            }}
        </style>
    </head>
    <body>
        <div class="success-box">
            <div class="success-icon">✅</div>
            <h1>로그인 성공!</h1>
            <p>TimeTravel 앱으로 돌아가세요.</p>
            <p>자동으로 메인 화면으로 이동됩니다.</p>
        </div>
        
        <script>
            // React Native 앱으로 토큰 전달
            if (window.ReactNativeWebView) {{
                window.ReactNativeWebView.postMessage(JSON.stringify({{
                    type: 'LOGIN_SUCCESS',
                    accessToken: '{access_token}'
                }}));
            }}
            
            // 3초 후 자동으로 앱으로 돌아가기
            setTimeout(() => {{
                if (window.ReactNativeWebView) {{
                    window.ReactNativeWebView.postMessage(JSON.stringify({{
                        type: 'AUTO_RETURN'
                    }}));
                }}
            }}, 3000);
        </script>
    </body>
    </html>
    """
    
    return Response(html_content, content_type='text/html')


@api_view(['GET'])
@permission_classes([AllowAny])
def login_success(request):
    """
    카카오 로그인 성공 후 리다이렉트되는 페이지
    React Native WebView에서 토큰을 추출할 수 있도록 단순한 HTML 페이지 반환
    """
    access_token = request.GET.get('access', '')
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>로그인 성공</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }}
            .container {{
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }}
            .success-icon {{
                font-size: 4rem;
                margin-bottom: 1rem;
            }}
            h1 {{
                margin: 0 0 1rem 0;
                font-size: 1.5rem;
                font-weight: 600;
            }}
            p {{
                margin: 0;
                opacity: 0.8;
                font-size: 1rem;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✅</div>
            <h1>로그인 성공!</h1>
            <p>잠시 후 앱으로 돌아갑니다...</p>
        </div>
        
        <script>
            // React Native WebView에서 URL 변경을 감지할 수 있도록 
            // 현재 URL에 토큰 정보가 포함되어 있음을 확인
            console.log('Login success page loaded with token');
            
            // 3초 후 페이지를 닫거나 뒤로 가기 (선택사항)
            setTimeout(() => {{
                if (window.ReactNativeWebView) {{
                    // React Native WebView인 경우
                    window.ReactNativeWebView.postMessage(JSON.stringify({{
                        type: 'LOGIN_SUCCESS',
                        token: '{access_token}'
                    }}));
                }} else {{
                    // 일반 브라우저인 경우 (테스트용)
                    window.close();
                }}
            }}, 2000);
        </script>
    </body>
    </html>
    """
    
    return Response(html_content, content_type='text/html')

