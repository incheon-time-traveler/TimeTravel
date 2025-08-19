from django.shortcuts import render, get_object_or_404
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from .models import Route, RouteSpot, UserRouteSpot
from .serializers import RouteSerializer, RouteDetailSerializer, UserRouteSpotSerializer
from .utils import generate_course, save_course
from rest_framework.permissions import IsAuthenticated


# Create your views here.
"""
코스 관련
코스 조회, 코스 상세 조회, 유저 코스 생성, 유저 코스 조회, 잠금 해제제
"""    
# 코스 조회
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def routes(request):
    # 전체 코스 조회
    if request.method == 'GET':
        routes = Route.objects.all()
        serializer = RouteSerializer(routes, many=True)
        return Response(serializer.data, status=200)

# 코스 상세 조회
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def route_detail(request, route_id):
    route_spots = get_object_or_404(RouteSpot, route_id=route_id)
    serializer = RouteDetailSerializer(route_spots, many=True)
    return Response(serializer.data, status=200)

# 유저 코스 생성
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_user_course(request):
    if request.method == "POST":
        user = request.user
        route_id = request.data.get('route_id')
        route_spots = RouteSpot.objects.filter(route_id=route_id)
        serializer = UserRouteSpotSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            for route_spot in route_spots:
                serializer.save(user_id=user.id, route_spot_id=route_spot.id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 유저 코스 조회
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_routes(request):
    user = request.user
    routes = UserRouteSpot.objects.all().filter(user_id=user.id)
    serializer = UserRouteSpotSerializer(routes, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

# 잠금 해제
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def unlock_route_spot(request):
    if request.method == "PATCH":
        user = request.user
        serializer = UserRouteSpotUpdateSerializer(data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save(user_id=user.id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def generate_travel_course(request):
    """
    여행 코스 생성 API
    프론트엔드에서 사용자의 답변과 위치 정보를 받아 코스를 생성합니다.
    """
    try:
        # 요청 데이터 검증
        required_fields = ['user_answers', 'num_places', 'user_lat', 'user_lon']
        for field in required_fields:
            if field not in request.data:
                return Response(
                    {'error': f'필수 필드가 누락되었습니다: {field}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # 데이터 추출
        user_answers = request.data.get('user_answers', [])
        num_places = request.data.get('num_places', 5)
        user_lat = request.data.get('user_lat')
        user_lon = request.data.get('user_lon')
        mission_accepted = request.data.get('mission_accepted', False)
        move_to_other_region = request.data.get('move_to_other_region', True)
        
        # 데이터 타입 검증
        if not isinstance(user_answers, list):
            return Response(
                {'error': 'user_answers는 리스트 형태여야 합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(num_places, int) or num_places <= 0:
            return Response(
                {'error': 'num_places는 양의 정수여야 합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(user_lat, (int, float)) or not isinstance(user_lon, (int, float)):
            return Response(
                {'error': 'user_lat와 user_lon은 숫자여야 합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 코스 생성
        result = generate_course(
            user_answers=user_answers,
            num_places=num_places,
            user_lat=user_lat,
            user_lon=user_lon,
            mission_accepted=mission_accepted,
            move_to_other_region=move_to_other_region
        )
        # 코스 저장 <- 추가함
        save_course(result)

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': f'서버 오류가 발생했습니다: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_mission_proposal(request):
    """
    미션 제안 API
    사용자의 위치를 기반으로 미션 제안을 반환합니다.
    """
    try:
        user_lat = request.GET.get('user_lat')
        user_lon = request.GET.get('user_lon')
        move_to_other_region = request.GET.get('move_to_other_region', 'true').lower() == 'true'
        
        if not user_lat or not user_lon:
            return Response(
                {'error': 'user_lat와 user_lon 파라미터가 필요합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_lat = float(user_lat)
            user_lon = float(user_lon)
        except ValueError:
            return Response(
                {'error': 'user_lat와 user_lon은 숫자여야 합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 간단한 미션 제안 생성
        from .utils import propose_mission, get_user_region, get_region_name
        from spots.models import Spot
        
        all_spots = Spot.objects.all()
        user_sigungu_code = get_user_region(all_spots, user_lat, user_lon)
        user_region_name = get_region_name(user_sigungu_code)
        
        # 지역 필터링
        if not move_to_other_region:
            if user_sigungu_code in ["1", "10"]:
                spots_for_course = all_spots.filter(sigungu_code=user_sigungu_code)
            else:
                spots_for_course = all_spots.exclude(sigungu_code__in=["1", "10"])
        else:
            spots_for_course = all_spots
        
        proposal, is_mission_available, mission_spot_count = propose_mission(spots_for_course, user_lat, user_lon)
        
        return Response({
            'proposal': proposal,
            'is_mission_available': is_mission_available,
            'mission_spot_count': mission_spot_count,
            'user_region_name': user_region_name
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'서버 오류가 발생했습니다: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

