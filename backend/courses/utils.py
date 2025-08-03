import pandas as pd
import numpy as np
import math
from django.db.models import Q
from spots.models import Spot


# --- 1. 기본 함수 및 설정 ---
def haversine_distance(lat1, lon1, lat2, lon2):
    """두 지점 간의 거리를 km 단위로 계산합니다."""
    R = 6371
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = np.sin(dlat/2.0)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon/2.0)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    return R * c


# 프론트엔드에서 받아올 데이터와 spots 모델의 필드를 매칭
ANSWER_TO_TAG_MAP = {
    "걷기 좋은 길을 따라 즐기는 산책": "walking_activity",
    "바다와 도시의 멋진 풍경/야경": "night_view",
    "복잡한 곳을 피해 즐기는 휴식": "quiet_rest",
    "역사와 문화가 담긴 특별한 체험": "experience_info",
    "지루할 틈 없는 다이나믹한 재미": "fun_sightseeing",
    "아이와 함께": "with_children",
    "반려동물과 함께": "with_pets",
    "대중교통으로": "public_transport",
    "자차나 택시로": "car_transport",
    "사람들이 많이 찾는 유명한 곳 위주로": "famous",
    "시설이 깔끔하고 편리했으면 좋겠어요": "clean_facility"
}


def propose_mission(spots_queryset, user_lat, user_lon):
    """미션 수행이 가능한 장소들을 찾아 사용자에게 제안합니다."""
    mission_spots = spots_queryset.filter(past_image_url__isnull=False).exclude(past_image_url='')
    
    if not mission_spots.exists():
        return "현재 수행 가능한 미션이 없습니다.", False, 0
    
    # 거리 계산
    min_dist = float('inf')
    for spot in mission_spots:
        dist = haversine_distance(user_lat, user_lon, spot.lat, spot.lng)
        if dist < min_dist:
            min_dist = dist
    
    proposal = f"과거 사진 촬영 미션에 도전해보시겠어요?\n가장 가까운 미션 장소는 약 {min_dist:.1f}km 거리에 있습니다."
    return proposal, True, mission_spots.count()


# --- 2. 지역 관련 함수 ---
def get_region_name(sigungu_code):
    """sigungu_code를 기반으로 지역 이름을 반환합니다."""
    if sigungu_code == "1":
        return "강화군"
    elif sigungu_code == "10":
        return "영종도(중구)"
    else:
        return "내륙"


def get_user_region(spots_queryset, user_lat, user_lon):
    """사용자의 현재 위치에서 가장 가까운 장소의 지역 코드를 추정합니다."""
    min_dist = float('inf')
    closest_sigungu_code = "0"
    
    for spot in spots_queryset:
        dist = haversine_distance(user_lat, user_lon, spot.lat, spot.lng)
        if dist < min_dist:
            min_dist = dist
            closest_sigungu_code = spot.sigungu_code
    
    return closest_sigungu_code


def spots_to_dataframe(spots_queryset):
    """Django QuerySet을 pandas DataFrame으로 변환합니다."""
    spots_data = []
    for spot in spots_queryset:
        spots_data.append({
            'id': spot.id,
            'title': spot.name,
            'mapy': spot.lat,
            'mapx': spot.lng,
            'sigungucode': spot.sigungu_code,
            'past_image_url': spot.past_image_url,
            'walking_activity': spot.walking_activity,
            'night_view': spot.night_view,
            'quiet_rest': spot.quiet_rest,
            'experience_info': spot.experience_info,
            'fun_sightseeing': spot.fun_sightseeing,
            'with_children': spot.with_children,
            'with_pets': spot.with_pets,
            'public_transport': spot.public_transport,
            'car_transport': spot.car_transport,
            'famous': spot.famous,
            'clean_facility': spot.clean_facility,
        })
    
    return pd.DataFrame(spots_data)


# --- 3. 최종 코스 생성 함수 ---
def create_travel_course(spots_queryset, user_answers, num_places, user_lat, user_lon, mission_accepted=False):
    """모든 예외처리와 분산 배치 로직이 포함된 최종 코스 생성 함수"""
    
    # QuerySet을 DataFrame으로 변환
    df = spots_to_dataframe(spots_queryset)
    
    if df.empty:
        return None, "오류: 사용 가능한 장소가 없습니다.", None
    
    # --- 1. 필터링 로직 ---
    if not mission_accepted:
        # --- 일반 모드 코스 생성 ---
        all_tags = [ANSWER_TO_TAG_MAP.get(ans) for ans in user_answers]
        all_tags = list(filter(None, all_tags))
        
        if not all_tags:
            return None, "오류: 여행 조건을 선택해주세요.", None
        
        filtered_df = df.copy()
        for tag in all_tags:
            filtered_df = filtered_df[filtered_df[tag] == True]
        
        if len(filtered_df) < num_places:
            return None, f"오류: 선택하신 조건을 모두 만족하는 장소가 {num_places}개 미만입니다.", None
        
        # 1-1. 시작점 선정
        filtered_df['dist_from_user'] = filtered_df.apply(
            lambda r: haversine_distance(user_lat, user_lon, r['mapy'], r['mapx']), axis=1
        )
        start_point = filtered_df.sort_values('dist_from_user').iloc[[0]]
        
        # 1-2. 경로 최적화
        course_plan = [start_point]
        remaining_places = filtered_df.drop(start_point.index)
        current_point = start_point
        
        for _ in range(num_places - 1):
            if remaining_places.empty:
                break
            remaining_places['dist_from_current'] = remaining_places.apply(
                lambda r: haversine_distance(
                    current_point['mapy'].iloc[0], 
                    current_point['mapx'].iloc[0], 
                    r['mapy'], r['mapx']
                ),
                axis=1
            )
            next_point = remaining_places.sort_values('dist_from_current').iloc[[0]]
            course_plan.append(next_point)
            remaining_places.drop(next_point.index, inplace=True)
            current_point = next_point
        
        return pd.concat(course_plan).reset_index(), None, "일반 모드"
    
    else:
        # --- 미션 모드 코스 생성 ---
        history_tag = "experience_info"
        other_user_tags = [ANSWER_TO_TAG_MAP.get(ans) for ans in user_answers if ANSWER_TO_TAG_MAP.get(ans) != history_tag]
        other_user_tags = list(filter(None, other_user_tags))
        
        history_mask = df[history_tag] == True
        other_mask = pd.Series(True, index=df.index)
        if other_user_tags:
            for tag in other_user_tags:
                other_mask &= (df[tag] == True)
            filtered_df = df[history_mask | other_mask].copy()
        else:
            filtered_df = df[history_mask].copy()
        
        mission_pool = filtered_df[filtered_df['past_image_url'].notna() & (filtered_df['past_image_url'] != '')].copy()
        regular_pool = filtered_df[(filtered_df['past_image_url'].isna()) | (filtered_df['past_image_url'] == '')].copy()
        
        if mission_pool.empty:
            return None, "오류: 선택하신 조건에 맞는 미션 장소가 하나도 없습니다.", None
        
        num_mission_required = math.ceil(num_places * 0.4)
        course_plan = []
        
        # --- 3. 코스 생성 모드 결정 및 실행 ---
        
        # CASE 1: 엄격 모드 (장소 충분)
        if len(mission_pool) >= num_mission_required and len(regular_pool) >= num_places - num_mission_required:
            mode = "엄격 모드"
            mission_pool['dist_from_user'] = mission_pool.apply(
                lambda r: haversine_distance(user_lat, user_lon, r['mapy'], r['mapx']), axis=1
            )
            start_point = mission_pool.sort_values('dist_from_user').iloc[[0]]
            mission_pool.drop(start_point.index, inplace=True)
            
            end_point = None
            missions_to_place_in_middle = num_mission_required - 1
            
            if num_places > 3 and not mission_pool.empty:
                mission_pool['dist_from_start'] = mission_pool.apply(
                    lambda r: haversine_distance(start_point['mapy'].iloc[0], start_point['mapx'].iloc[0], r['mapy'], r['mapx']), axis=1
                )
                end_point = mission_pool.sort_values('dist_from_start', ascending=False).iloc[[0]]
                mission_pool.drop(end_point.index, inplace=True)
                missions_to_place_in_middle -= 1
            
            template = ['R'] * num_places
            template[0] = 'M'
            if end_point is not None:
                template[-1] = 'M'
            
            # --- 분산 배치 ---
            if missions_to_place_in_middle > 0:
                middle_part_len = num_places - (1 if end_point is None else 2)
                if middle_part_len > 0:
                    section_len = (middle_part_len + 1) / (missions_to_place_in_middle + 1)
                    for i in range(1, missions_to_place_in_middle + 1):
                        pos = round(i * section_len) - 1
                        template[pos + 1] = 'M'
            
            # --- 템플릿에 따라 코스 생성 ---
            course_plan.append(start_point)
            current_point = start_point
            
            num_middle_loops = num_places - (1 if end_point is None else 2)
            
            for i in range(num_middle_loops):
                slot_type = template[i + 1]
                pool_to_use = mission_pool if slot_type == 'M' else regular_pool
                
                pool_to_use['dist_from_current'] = pool_to_use.apply(
                    lambda r: haversine_distance(
                        current_point['mapy'].iloc[0], 
                        current_point['mapx'].iloc[0], 
                        r['mapy'], r['mapx']
                    ),
                    axis=1
                )
                next_point = pool_to_use.sort_values('dist_from_current').iloc[[0]]
                
                course_plan.append(next_point)
                if slot_type == 'M':
                    mission_pool.drop(next_point.index, inplace=True)
                else:
                    regular_pool.drop(next_point.index, inplace=True)
                current_point = next_point
            
            if end_point is not None:
                course_plan.append(end_point)
        
        # CASE 2: 준-유연 모드 (미션 장소 2개 이상)
        elif len(mission_pool) >= 1 and num_places >= 3:
            mode = "준-유연 모드"
            mission_pool['dist_from_user'] = mission_pool.apply(
                lambda r: haversine_distance(user_lat, user_lon, r['mapy'], r['mapx']), axis=1
            )
            start_point = mission_pool.sort_values('dist_from_user').iloc[[0]]
            mission_pool.drop(start_point.index, inplace=True)
            
            if len(regular_pool) < num_places - 2:
                return None, "오류: 코스를 구성할 일반 장소가 부족합니다.", None
            
            mission_pool['dist_from_start'] = mission_pool.apply(
                lambda r: haversine_distance(start_point['mapy'].iloc[0], start_point['mapx'].iloc[0], r['mapy'], r['mapx']), axis=1
            )
            end_point = mission_pool.sort_values('dist_from_start', ascending=False).iloc[[0]]
            
            course_plan.append(start_point)
            current_point = start_point
            middle_pool = regular_pool.copy()
            
            for _ in range(num_places - 2):
                middle_pool['dist_from_current'] = middle_pool.apply(
                    lambda r: haversine_distance(current_point['mapy'].iloc[0], current_point['mapx'].iloc[0], r['mapy'], r['mapx']), axis=1
                )
                next_point = middle_pool.sort_values('dist_from_current').iloc[[0]]
                course_plan.append(next_point)
                middle_pool.drop(next_point.index, inplace=True)
                current_point = next_point
            
            course_plan.append(end_point)
        
        # CASE 3: 완전-유연 모드 (미션 장소 1개만 가능할 때)
        else:
            mode = "완전-유연 모드"
            mission_pool['dist_from_user'] = mission_pool.apply(
                lambda r: haversine_distance(user_lat, user_lon, r['mapy'], r['mapx']), axis=1
            )
            start_point = mission_pool.sort_values('dist_from_user').iloc[[0]]
            
            if len(regular_pool) < num_places - 1:
                return None, "오류: 코스를 구성할 일반 장소가 부족합니다.", None
            
            course_plan.append(start_point)
            current_point = start_point
            middle_pool = regular_pool.copy()
            for _ in range(num_places - 1):
                middle_pool['dist_from_current'] = middle_pool.apply(
                    lambda r: haversine_distance(current_point['mapy'].iloc[0], current_point['mapx'].iloc[0], r['mapy'], r['mapx']), axis=1
                )
                next_point = middle_pool.sort_values('dist_from_current').iloc[[0]]
                course_plan.append(next_point)
                middle_pool.drop(next_point.index, inplace=True)
                current_point = next_point
        
        return pd.concat(course_plan).reset_index(), None, mode


def generate_course(user_answers, num_places, user_lat, user_lon, mission_accepted=False, move_to_other_region=True):
    """
    메인 코스 생성 함수
    프론트엔드에서 호출할 메인 함수입니다.
    
    Args:
        user_answers (list): 사용자가 선택한 답변 리스트
        num_places (int): 방문할 장소 수
        user_lat (float): 사용자 위도
        user_lon (float): 사용자 경도
        mission_accepted (bool): 미션 수락 여부
        move_to_other_region (bool): 다른 지역 이동 허용 여부
    
    Returns:
        dict: 코스 생성 결과
    """
    try:
        # 1. 사용자의 현재 지역 추정
        all_spots = Spot.objects.all()
        user_sigungu_code = get_user_region(all_spots, user_lat, user_lon)
        user_region_name = get_region_name(user_sigungu_code)
        
        # 2. 지역 필터링
        if not move_to_other_region:
            if user_sigungu_code in ["1", "10"]:
                # 강화 또는 영종이면 해당 지역만 선택
                spots_for_course = all_spots.filter(sigungu_code=user_sigungu_code)
            else:
                # 그 외 (내륙)이면, 강화와 영종을 제외한 모든 지역을 선택
                spots_for_course = all_spots.exclude(sigungu_code__in=["1", "10"])
        else:
            # 인천 전 지역 대상
            spots_for_course = all_spots
        
        # 3. 미션 제안
        proposal, is_mission_available, mission_spot_count = propose_mission(spots_for_course, user_lat, user_lon)
        
        # 4. 코스 생성
        final_course, error_message, mode = create_travel_course(
            spots_for_course,
            user_answers,
            num_places,
            user_lat, user_lon,
            mission_accepted=mission_accepted
        )
        
        # 5. 결과 반환
        if error_message:
            return {
                'success': False,
                'error': error_message,
                'proposal': proposal,
                'is_mission_available': is_mission_available,
                'mission_spot_count': mission_spot_count,
                'user_region_name': user_region_name
            }
        
        # 6. 코스 데이터 변환
        course_spots = []
        for i, row in final_course.iterrows():
            spot_data = {
                'id': int(row['id']),
                'title': row['title'],
                'lat': row['mapy'],
                'lng': row['mapx'],
                'order': i + 1,
                'is_mission': pd.notna(row['past_image_url']) and row['past_image_url'] != '',
                'past_image_url': row['past_image_url'] if pd.notna(row['past_image_url']) else None
            }
            
            # 이전 장소와의 거리 계산
            if i > 0:
                prev_row = final_course.iloc[i-1]
                dist = haversine_distance(prev_row['mapy'], prev_row['mapx'], row['mapy'], row['mapx'])
                spot_data['distance_from_previous'] = round(dist, 1)
            else:
                spot_data['distance_from_previous'] = 0
            
            course_spots.append(spot_data)
        
        return {
            'success': True,
            'course_spots': course_spots,
            'mode': mode,
            'proposal': proposal,
            'is_mission_available': is_mission_available,
            'mission_spot_count': mission_spot_count,
            'user_region_name': user_region_name,
            'total_spots': len(course_spots)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f"코스 생성 중 오류가 발생했습니다: {str(e)}",
            'proposal': None,
            'is_mission_available': False,
            'mission_spot_count': 0,
            'user_region_name': None
        } 