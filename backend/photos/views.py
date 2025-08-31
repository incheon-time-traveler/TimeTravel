from django.shortcuts import render
from .models import Photo
from accounts.models import CustomUser
from courses.models import Route
from spots.models import Spot
from .serializers import PhotoSerializer, PhotoDetailSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

# Create your views here.
# get, api/v1/photos

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def photos(request):
    user_id = request.user.id
    photos = Photo.objects.filter(user_id=user_id)
    serializer = PhotoSerializer(photos, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

# post, api/v1/photos/{route_id}/{spot_id}
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def photo(request, route_id, spot_id):
    user_id = request.user.id
    
    print(f"[photos] POST 요청 받음: route_id={route_id}, spot_id={spot_id}")
    print(f"[photos] 요청 데이터: {request.data}")
    print(f"[photos] 사용자 ID: {user_id}")
    
    # 요청 데이터에 route_id와 spot_id 추가
    data = request.data.copy()
    data['route_id'] = route_id
    data['spot_id'] = spot_id
    print(f"[photos] 요청 데이터: {request.data}")  # 일반 폼 데이터
    print(f"[photos] 파일 데이터: {request.FILES}")  # 파일 데이터
    print(f"[photos] 요청 헤더: {request.headers}")  # 요청 헤더 확인
    
    # 수정 필요
    if 'image_url' in request.FILES:
        data['image_url'] = request.FILES['image_url']  # 모델 필드명에 맞춰서 수정
    else:
        return Response(
            {"error": "이미지 파일이 필요합니다."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = PhotoDetailSerializer(data=data)
    if serializer.is_valid():
        print(f"[photos] 시리얼라이저 유효함")
        serializer.save(user_id=CustomUser.objects.get(pk=user_id),  # ✅ 인스턴스 대입
                        route_id=Route.objects.get(pk=route_id),
                        spot_id=Spot.objects.get(pk=spot_id),
                        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    else:
        print(f"[photos] 시리얼라이저 에러: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# patch, api/v1/photos/{photo_id}
@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def photo_detail(request, photo_id):
    user_id = request.user.id
    photo = Photo.objects.get(id=photo_id)
    if request.method == 'PATCH':
        serializer = PhotoSerializer(photo, data=request.data)
        if serializer.is_valid():
            serializer.save(user_id=user_id)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    return Response(status=status.HTTP_400_BAD_REQUEST)
