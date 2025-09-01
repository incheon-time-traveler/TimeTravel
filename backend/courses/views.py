from django.shortcuts import render, get_object_or_404
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from .models import Route, RouteSpot, UserRouteSpot
from .serializers import RouteSerializer, RouteDetailSerializer, UserRouteSpotSerializer
from .utils import generate_course, save_course
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count
from spots.models import Spot

# Create your views here.
"""
코스 관련
코스 조회, 코스 상세 조회, 유저 코스 생성, 유저 코스 조회, 잠금 해제제
"""    
# 코스 조회
@api_view(['GET'])
@permission_classes([AllowAny])
def routes(request):
    """
    여행 코스 조회 API
    프론트엔드에서 전체 코스를 조회합니다.
    """
    # 전체 코스 조회
    if request.method == 'GET':
        routes = Route.objects.all()
        serializer = RouteSerializer(routes, many=True)
        return Response(serializer.data, status=200)

@api_view(['GET'])
@permission_classes([AllowAny])
def best_routes(request):
    if request.method == 'GET':
        # route_id 언급 순으로 상위 5개 추출
        top_route_ids = (UserRouteSpot.objects
                        .values('route_id')
                        .annotate(count=Count('route_id'))
                        .order_by('-count')[:5])
        # 실제 route 객체 반환환
        route_ids = [item['route_id'] for item in top_route_ids]
        routes = Route.objects.filter(id__in=route_ids)

        serializer = RouteSerializer(routes, many=True)
        return Response(serializer.data, status=200)

# 코스 상세 조회
@api_view(['GET'])
@permission_classes([AllowAny])
def route_detail(request, route_id):
    """
    여행 코스 상세 조회 API
    프론트엔드에서 특정 코스의 상세 정보를 조회합니다.
    """
    try:
        # Route 모델을 먼저 찾기
        route = get_object_or_404(Route, id=route_id)
        
        # 해당 루트의 모든 RouteSpot들을 찾기
        route_spots = RouteSpot.objects.filter(route_id=route_id).order_by('order')
        
        # Route와 RouteSpot 정보를 함께 반환
        route_data = {
            'route': {
                'id': route.id,
                'title': route.user_region_name,  # title 대신 user_region_name 사용
                'user_region_name': route.user_region_name,
                'total_spots': route.total_spots,
                'mission_available': route.is_mission_available,
            },
            'spots': []
        }
        
        for route_spot in route_spots:
            spot_data = {
                'id': route_spot.spot_id.id,
                'title': route_spot.spot_id.name,  # title 대신 name 사용
                'description': route_spot.spot_id.description,
                'lat': route_spot.spot_id.lat,
                'lng': route_spot.spot_id.lng,
                'order': route_spot.order,
                'address': route_spot.spot_id.address,
            }
            route_data['spots'].append(spot_data)
        
        return Response(route_data, status=200)
        
    except Route.DoesNotExist:
        return Response({'error': '루트를 찾을 수 없습니다.'}, status=404)
    except Exception as e:
        print(f"route_detail 에러: {e}")
        return Response({'error': '서버 오류가 발생했습니다.'}, status=500)

# 유저 코스 생성
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_user_course(request):
    """
    유저 코스 생성 API
    프론트엔드에서 사용자와 코스 정보를 통해 사용자용 코스를 생성합니다.
    """
    if request.method == "POST":
        try:
            user = request.user
            route_id = request.data.get('route_id')
            course_data = request.data.get('course_data', {})
            
            print(f"[generate_user_course] 요청 데이터: route_id={route_id}, course_data={course_data}")
            print(f"[generate_user_course] 사용자 정보: id={user.id}, username={user.username}")
            
            # route_id 검증
            if not route_id:
                return Response(
                    {'error': 'route_id가 필요합니다.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Route 존재 여부 확인
            try:
                route = Route.objects.get(id=route_id)
                print(f"[generate_user_course] Route 찾음: {route.id}")
            except Route.DoesNotExist:
                return Response(
                    {'error': f'ID {route_id}인 Route를 찾을 수 없습니다.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # RouteSpot 존재 여부 확인
            route_spots = RouteSpot.objects.filter(route_id=route_id)
            if not route_spots.exists():
                return Response(
                    {'error': f'Route {route_id}에 대한 RouteSpot이 없습니다.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            print(f"[generate_user_course] RouteSpot 개수: {route_spots.count()}")
            
            # UserRouteSpot 생성
            created_user_routes = []
            for route_spot in route_spots:
                try:
                    user_route_data = {
                        'user_id': user,  # CustomUser 인스턴스 전달
                        'route_id': route,  # Route 인스턴스 전달
                        'route_spot_id': route_spot,  # RouteSpot 인스턴스 전달
                        'order': route_spot.order,  # order 필드 추가
                    }
                    
                    # 이미 존재하는지 확인
                    existing_user_route = UserRouteSpot.objects.filter(
                        user_id=user,
                        route_spot_id=route_spot,
                        route_id=route
                    ).first()
                    
                    if not existing_user_route:
                        user_route = UserRouteSpot.objects.create(**user_route_data)
                        created_user_routes.append(user_route)
                        print(f"[generate_user_course] UserRouteSpot 생성: {user_route.id}")
                    else:
                        print(f"[generate_user_course] UserRouteSpot 이미 존재: {existing_user_route.id}")
                        created_user_routes.append(existing_user_route)
                        
                except Exception as e:
                    print(f"[generate_user_course] UserRouteSpot 생성 실패: {e}")
                    continue
            
            if not created_user_routes:
                return Response(
                    {'error': '사용자 코스를 생성할 수 없습니다.'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # 성공 응답
            return Response({
                'success': True,
                'message': f'{len(created_user_routes)}개의 사용자 코스가 생성되었습니다.',
                'user_routes_count': len(created_user_routes),
                'route_id': route_id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"[generate_user_course] 전체 오류: {e}")
            return Response(
                {'error': f'사용자 코스 생성 중 오류가 발생했습니다: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response(
        {'error': 'POST 메서드만 지원됩니다.'}, 
        status=status.HTTP_405_METHOD_NOT_ALLOWED
    )

# 유저 코스 조회
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_routes(request, route_id=None):
    """
    유저 코스 조회 API
    프론트엔드에서 사용자의 코스를 조회합니다.
    """
    try:
        user = request.user
        print(f"[user_routes] 사용자 {user.id}의 코스 조회 시작, route_id: {route_id}")
        
        if route_id:
            # 특정 코스의 사용자 정보 조회 (기존 기능)
            routes = UserRouteSpot.objects.all().filter(user_id=user.id, route_spot_id__route_id=route_id)
            serializer = UserRouteSpotSerializer(routes, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # 사용자의 모든 코스 조회 (새로운 기능)
            # 사용자의 UserRouteSpot 조회
            user_route_spots = UserRouteSpot.objects.filter(user_id=user.id).select_related(
                'route_spot_id__route_id',  # Route 정보
                'route_spot_id__spot_id'    # Spot 정보
            ).order_by('route_spot_id__route_id', 'order')
            
            if not user_route_spots.exists():
                print(f"[user_routes] 사용자 {user.id}의 코스 없음")
                return Response([], status=status.HTTP_200_OK)
            
            # 코스별로 그룹화
            courses = {}
            for user_route_spot in user_route_spots:
                route = user_route_spot.route_spot_id.route_id
                spot = user_route_spot.route_spot_id.spot_id
                
                if route.id not in courses:
                    courses[route.id] = {
                        'route_id': route.id,
                        'total_spots': route.total_spots,
                        'user_region_name': route.user_region_name,
                        'created_at': route.created_at,
                        'spots': []
                    }
                
                courses[route.id]['spots'].append({
                    'id': spot.id,
                    'title': spot.name,
                    'lat': spot.lat,
                    'lng': spot.lng,
                    'order': user_route_spot.order,
                    'is_unlocked': user_route_spot.is_unlocked if hasattr(user_route_spot, 'is_unlocked') else True,
                    'completed_at': user_route_spot.completed_at if hasattr(user_route_spot, 'completed_at') else None
                })
            
            # 코스 목록을 생성일 기준으로 정렬
            course_list = list(courses.values())
            course_list.sort(key=lambda x: x['created_at'], reverse=True)
            
            print(f"[user_routes] 사용자 {user.id}의 코스 {len(course_list)}개 반환")
            return Response(course_list, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"[user_routes] 오류: {e}")
        return Response(
            {'error': f'사용자 코스 조회 중 오류가 발생했습니다: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# 잠금 해제
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def unlock_route_spot(request):
    """
    유저 코스 잠금 해제 API
    프론트엔드에서 사용자가 이동하는 코스의 특정 스팟의 잠금을 해제합니다.
    """
    if request.method == "PATCH":
        user = request.user
        serializer = UserRouteSpotUpdateSerializer(data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save(user_id=user.id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 해금 장소 조회
@api_view(['GET'])
@permission_classes([AllowAny])
def unlock_spots(request):
    """
    유저 해금 장소 조회 API
    유저의 UserRouteSpot 테이블에서 해금 장소를 조회합니다.
    해금 기준 : unlock_at이 null이 아닌 장소
    """
    if request.method == "GET":
        user = request.user
        user_route_spots = UserRouteSpot.objects.filter(user_id=user.id, unlock_at__isnull=False)
        serializer = UserRouteSpotSerializer(user_route_spots, many=True)
        for spot in serializer.data:
            spot_id = RouteSpot.objects.get(id=spot['route_spot_id'])
            past_photo_url = Spot.objects.get(id=spot_id.spot_id.id).past_image_url
            spot['past_photo_url'] = past_photo_url
            spot['spot_name'] = spot_id.spot_id.name
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_travel_course(request):
    """
    유저 코스 생성 API
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
        
        # 코스 생성이 성공한 경우에만 저장
        if result['success']:
            try:
                route_id = save_course(result)
                if route_id:
                    result['route_id'] = route_id
                    print(f"코스 저장 완료, route_id: {route_id}")
                else:
                    print("코스 저장 실패")
            except Exception as save_error:
                print(f"코스 저장 중 오류: {save_error}")
                # 저장 실패해도 코스 생성 결과는 반환
                pass
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': f'서버 오류가 발생했습니다: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
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

