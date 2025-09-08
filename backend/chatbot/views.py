from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

import requests
import json
from django.conf import settings

@api_view(["POST"])
def chat_with_bot(request):
    """
    사용자 질문에 대한 답변 반환 - FastAPI AI 서버와 통신
    """
    try:
        # 사용자 질문 받기 (JSON 또는 POST 데이터 모두 지원)
        user_input = request.data.get("user_question") or request.POST.get("user_question")
        
        # 사용자 위치 받기
        user_lat = request.data.get("lat") or request.POST.get("lat")
        user_lon = request.data.get("lng") or request.POST.get("lng")

        # 사용자 고유 정보 받기
        user_id = request.data.get("user_id") or request.POST.get("user_id")

        if not user_input or not user_id:
            return Response(
                {"error": "user_question, user_id 파라미터가 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # FastAPI AI 서버로 요청 데이터 준비
        payload = {
            "user_question": user_input,
            "user_id": user_id,
        }
        
        # 위치 정보가 있으면 추가
        if user_lat and user_lon:
            payload["user_location"] = {
                "lat": float(user_lat),
                "lng": float(user_lon)
            }

        # FastAPI AI 서버에 요청
        fastapi_url = f"{settings.FASTAPI_AI_SERVER_URL}/v1/chatbot"
        
        try:
            response = requests.post(
                fastapi_url,
                json=payload,
                timeout=30,  # 30초 타임아웃
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()  # HTTP 에러가 있으면 예외 발생
            
            ai_response = response.json()
            
            return Response(
                {"ai_answer": ai_response.get("ai_answer", "응답을 받을 수 없습니다.")},
                status=status.HTTP_200_OK
            )
            
        except requests.exceptions.ConnectionError:
            return Response(
                {"error": "AI 서버에 연결할 수 없습니다. 서버 상태를 확인해주세요."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except requests.exceptions.Timeout:
            return Response(
                {"error": "AI 서버 응답 시간이 초과되었습니다."},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        except requests.exceptions.HTTPError as e:
            return Response(
                {"error": f"AI 서버 오류: {e}"},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except json.JSONDecodeError:
            return Response(
                {"error": "AI 서버 응답을 파싱할 수 없습니다."},
                status=status.HTTP_502_BAD_GATEWAY
            )

    except Exception as e:
        return Response(
            {"error": f"챗봇 오류가 발생했습니다: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
def health_check(request):
    """
    FastAPI AI 서버 상태 확인
    """
    try:
        fastapi_url = f"{settings.FASTAPI_AI_SERVER_URL}/health"
        
        response = requests.get(fastapi_url, timeout=5)
        response.raise_for_status()
        
        return Response(
            {"status": "healthy", "ai_server": "connected"},
            status=status.HTTP_200_OK
        )
        
    except requests.exceptions.ConnectionError:
        return Response(
            {"status": "unhealthy", "ai_server": "disconnected", "error": "AI 서버에 연결할 수 없습니다."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except requests.exceptions.Timeout:
        return Response(
            {"status": "unhealthy", "ai_server": "timeout", "error": "AI 서버 응답 시간 초과"},
            status=status.HTTP_504_GATEWAY_TIMEOUT
        )
    except Exception as e:
        return Response(
            {"status": "unhealthy", "ai_server": "error", "error": str(e)},
            status=status.HTTP_502_BAD_GATEWAY
        )