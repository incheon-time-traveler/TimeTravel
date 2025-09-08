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
    try:
        user_id = request.user.id
        
        print(f"[photos] POST 요청 받음: route_id={route_id}, spot_id={spot_id}")
        print(f"[photos] 요청 데이터: {request.data}")
        print(f"[photos] 사용자 ID: {user_id}")
        
        # route_id와 spot_id 유효성 검사
        try:
            route = Route.objects.get(pk=route_id)
            spot = Spot.objects.get(pk=spot_id)
            user = CustomUser.objects.get(pk=user_id)
            print(f"[photos] 데이터 검증 성공: route={route.id}, spot={spot.id}, user={user.id}")
        except Route.DoesNotExist:
            print(f"[photos] Route {route_id} 존재하지 않음")
            return Response(
                {"error": f"Route ID {route_id}가 존재하지 않습니다."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Spot.DoesNotExist:
            print(f"[photos] Spot {spot_id} 존재하지 않음")
            return Response(
                {"error": f"Spot ID {spot_id}가 존재하지 않습니다."},
                status=status.HTTP_404_NOT_FOUND
            )
        except CustomUser.DoesNotExist:
            print(f"[photos] User {user_id} 존재하지 않음")
            return Response(
                {"error": f"User ID {user_id}가 존재하지 않습니다."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 이미지 URL 검증
        image_url = request.data.get('image_url')
        if not image_url:
            print(f"[photos] 이미지 URL이 없음")
            return Response(
                {"error": "이미지 URL이 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"[photos] 받은 이미지 URL: {image_url}")
        print(f"[photos] 이미지 URL 길이: {len(image_url)}")
        
        # Photo 객체 직접 생성
        try:
            photo_instance = Photo.objects.create(
                user_id=user,
                route_id=route,
                spot_id=spot,
                image_url=image_url,
                is_used=False
            )
            print(f"[photos] 사진 저장 완료: ID={photo_instance.id}")
            
            # 응답 데이터 구성
            response_data = {
                "id": photo_instance.id,
                "image_url": photo_instance.image_url,
                "is_used": photo_instance.is_used,
                "created_at": photo_instance.created_at,
                "used_at": photo_instance.used_at,
                "route_id": photo_instance.route_id.id,
                "spot_id": photo_instance.spot_id.id,
                "user_id": photo_instance.user_id.id
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as save_error:
            print(f"[photos] 사진 저장 실패: {str(save_error)}")
            return Response(
                {"error": f"사진 저장 중 오류가 발생했습니다: {str(save_error)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        print(f"[photos] 예상치 못한 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {"error": f"서버 내부 오류가 발생했습니다: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

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
