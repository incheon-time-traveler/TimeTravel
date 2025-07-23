from django.shortcuts import redirect, get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
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

# OAuth
# 구글 로그인 요청 보내기
@api_view(['GET', 'POST'])
def google_login(request):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = "http://127.0.0.1:8000/accounts/google/callback/"
    scope = "openid email profile"
    response_type = "code"

    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode({
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": response_type,
            "scope": scope,
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
def google_callback(request):
    User = get_user_model()
    
    # Google 에서 준 인가 코드
    code = request.GET.get("code")
    if not code:
        print("No code provided")
        return redirect("/")
    
    # Google에서 엑세스 토큰 요청
    access_token = get_access_token(code)
    
    # 사용자 정보 요청
    email, name, nickname = get_user_info(access_token)
    
    # 사용자 생성 또는 로그인
    user, created = User.objects.get_or_create(
        useremail=email,
        defaults={
            "username" : name,
            "nickname" : nickname,
            "age" : "",
            "gender" : "",
            "phone" : "",
            
        },
    )
    
    refresh_token = RefreshToken.for_user(user)
    access_token = str(refresh_token.access_token)
    
    response = redirect(f"http://localhost:5173/login-success?access={access_token}")
    response.set_cookie(
        key='refresh_token',
        value=str(refresh_token),
        httponly=True,
        secure=False,  # 개발 환경에서는 False
        samesite='Lax',
        domain='localhost',  # 도메인 설정
        path='/',  # 경로 설정
        max_age=60 * 60 * 24 * 14  # 14일
    )
    return response


# 카카오 로그인
@api_view(['GET'])
def kakao_login(request):
    client_id = os.getenv("KAKAO_REST_API_KEY")
    redirect_uri = os.getenv("KAKAO_REDIRECT_URI")
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

@api_view(['GET', 'POST'])
# 카카오 응답 처리하기
def kakao_callback(request):
    code = request.GET.get("code")
    if not code:
        return Response({"error": "No code provided"}, status=400)

    # 1. access token 요청
    token_url = "https://kauth.kakao.com/oauth/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": os.getenv("KAKAO_REST_API_KEY"),
        "redirect_uri": os.getenv("KAKAO_REDIRECT_URI"),
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
        },
    )

    refresh_token = RefreshToken.for_user(user)
    access_token = str(refresh_token.access_token)
    
    response = redirect(f"http://localhost:5173/login-success?access={access_token}")
    response.set_cookie(
        key='refresh_token',
        value=str(refresh_token),
        httponly=True,
        secure=False,  # 개발 환경에서는 False
        samesite='Lax',
        domain='localhost',  # 도메인 설정
        path='/',  # 경로 설정
        max_age=60 * 60 * 24 * 14  # 14일
    )
    return response


# 로그아웃
@api_view(['POST'])
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
        user = get_object_or_404(get_user_model(), pk=user_id)
        
        if request.method == 'GET':
            serializer = UserSerializer(user)
            return Response(serializer.data)
            
        elif request.method == 'PUT':
            # 자신의 프로필만 수정할 수 있도록 체크
            if request.user.id != user_id:
                return Response({'error': '자신의 프로필만 수정할 수 있습니다.'}, status=403)
            serializer = UserProfileUpdateSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
            
    except Exception as e:
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

