from django.shortcuts import render
from .models import Photo
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

# post, api/v1/photos
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def photo(request, route_id, spot_id):
    user_id = request.user.id
    route_id = route_id
    spot_id = spot_id
    serializer = PhotoDetailSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user_id=user_id, route_id=route_id, spot_id=spot_id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
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
