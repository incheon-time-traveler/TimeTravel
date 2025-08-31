from django.shortcuts import render
from .models import Spot
from .serializers import SpotSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
import random
# Create your views here.
@api_view(['GET'])
def spots(request):
    """
    스팟 조회 API
    모든 스팟을 조회합니다.
    """
    try:
        spots = Spot.objects.all()
        serializer = SpotSerializer(spots, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'서버 오류가 발생했습니다: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def spot_detail(request, spot_id):
    """
    스팟 상세 조회 API
    특정 스팟의 상세 정보를 조회합니다.
    """
    try:
        spot = Spot.objects.get(id=spot_id)
        serializer = SpotSerializer(spot)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Spot.DoesNotExist:
        return Response({'error': '스팟을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response(
            {'error': f'서버 오류가 발생했습니다: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_mission_photos(request, spot_id):
    """
    미션 사진 조회 API
    미션 스팟의 과거 사진을 포함한 총 4개의 사진을 반환합니다.
    """
    try:
        # 정답 과거 사진 가져오기
        target_spot = Spot.objects.filter(is_mission_available=True, id=spot_id).first()
        # 에러 처리
        if not target_spot or not target_spot.past_image_url:
            return Response({"error": "과거 사진이 없는 스팟. 요청을 확인해주세요."}, status=status.HTTP_404_NOT_FOUND)
        
        # 정답 과거 사진 제외 다른 3개의 과거 사진 가져오기 (order_by '?'로 무작위 처리)
        other_spots = list(Spot.objects.exclude(id=spot_id)
                                    .exclude(past_image_url='')
                                    .order_by('?')[:3])
        
        # 응답데이터
        response_data = [
            {"past_image_url": target_spot.past_image_url, "isAnswer": True}
        ]
        
        # 다른 3개의 과거 사진 추가
        for spot in other_spots:
            response_data.append({"past_image_url": spot.past_image_url, "isAnswer": False})
        
        # 결과 섞기
        random.shuffle(response_data)
        
        return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'서버 오류가 발생했습니다: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
