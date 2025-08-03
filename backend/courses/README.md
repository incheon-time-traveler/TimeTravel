# Courses App - 여행 코스 생성 기능

이 앱은 사용자의 선호도와 위치를 기반으로 인천 지역의 맞춤형 여행 코스를 생성하는 기능을 제공합니다.

## 주요 기능

1. **미션 제안**: 사용자 위치 기반 미션 장소 제안
2. **코스 생성**: 사용자 답변과 위치를 기반으로 최적화된 여행 코스 생성
3. **지역 필터링**: 강화군, 영종도, 내륙 지역별 필터링
4. **미션 모드**: 과거 사진 촬영 미션이 포함된 특별한 코스 생성

## API 엔드포인트

### 1. 미션 제안 API
```
GET /api/courses/mission-proposal/
```

**파라미터:**
- `user_lat` (float): 사용자 위도
- `user_lon` (float): 사용자 경도
- `move_to_other_region` (boolean): 다른 지역 이동 허용 여부 (기본값: true)

**응답 예시:**
```json
{
    "proposal": "📸 과거 사진 촬영 미션에 도전해보시겠어요?\n가장 가까운 미션 장소는 약 2.3km 거리에 있습니다.",
    "is_mission_available": true,
    "mission_spot_count": 15,
    "user_region_name": "내륙"
}
```

### 2. 코스 생성 API
```
POST /api/courses/generate-course/
```

**요청 본문:**
```json
{
    "user_answers": [
        "👟 걷기 좋은 길을 따라 즐기는 산책",
        "🌉 바다와 도시의 멋진 풍경/야경",
        "자차나 택시로 편하게 다닐래요"
    ],
    "num_places": 5,
    "user_lat": 37.4562557,
    "user_lon": 126.7052062,
    "mission_accepted": false,
    "move_to_other_region": true
}
```

**응답 예시:**
```json
{
    "success": true,
    "course_spots": [
        {
            "id": 1,
            "title": "인천대교",
            "lat": 37.4562557,
            "lng": 126.7052062,
            "order": 1,
            "is_mission": false,
            "past_image_url": null,
            "distance_from_previous": 0
        },
        {
            "id": 15,
            "title": "월미도",
            "lat": 37.4662557,
            "lng": 126.7152062,
            "order": 2,
            "is_mission": true,
            "past_image_url": "https://example.com/past_image.jpg",
            "distance_from_previous": 1.2
        }
    ],
    "mode": "일반 모드",
    "proposal": "📸 과거 사진 촬영 미션에 도전해보시겠어요?...",
    "is_mission_available": true,
    "mission_spot_count": 15,
    "user_region_name": "내륙",
    "total_spots": 5
}
```

## 사용자 답변 매핑

프론트엔드에서 받는 답변과 데이터베이스 필드 매핑:

| 프론트엔드 답변 | 데이터베이스 필드 |
|----------------|------------------|
| 👟 걷기 좋은 길을 따라 즐기는 산책 | walking_activity |
| 🌉 바다와 도시의 멋진 풍경/야경 | night_view |
| 🤫 복잡한 곳을 피해 즐기는 휴식 | quiet_rest |
| 🎓 역사와 문화가 담긴 특별한 체험 | experience_info |
| 🎉 지루할 틈 없는 다이나믹한 재미 | fun_sightseeing |
| 아이와 함께 | with_children |
| 우리 집 댕댕이와 함께 | with_pets |
| 대중교통으로 충분해요 | public_transport |
| 자차나 택시로 편하게 다닐래요 | car_transport |
| 사람들이 많이 찾는 유명한 곳 위주로! | famous |
| 시설이 깔끔하고 편리했으면 좋겠어요 | clean_facility |

## 코스 생성 모드

### 1. 일반 모드
- 사용자가 선택한 모든 조건을 만족하는 장소들로만 코스 구성
- 가장 가까운 장소부터 시작하여 순차적으로 방문

### 2. 미션 모드
- **엄격 모드**: 미션 장소가 충분할 때, 미션과 일반 장소를 분산 배치
- **준-유연 모드**: 미션 장소가 2개 이상일 때, 시작과 끝에 미션 장소 배치
- **완전-유연 모드**: 미션 장소가 1개만 있을 때, 시작점에만 미션 장소 배치

## 지역 구분

- **강화군** (sigungu_code: "1")
- **영종도(중구)** (sigungu_code: "10")
- **내륙** (기타 sigungu_code)

## 설치 및 실행

1. 필요한 패키지 설치:
```bash
pip install -r requirements.txt
```

2. 데이터베이스 마이그레이션:
```bash
python manage.py makemigrations
python manage.py migrate
```

3. 서버 실행:
```bash
python manage.py runserver
```

## 주의사항

1. **ANSWER_TO_TAG_MAP**: 프론트엔드에서 받아올 데이터와 spots 모델의 필드를 매칭
2. **데이터베이스 연동**: pandas DataFrame 대신 Django QuerySet을 사용하여 데이터베이스에서 직접 데이터 조회
3. **하드코딩 제거**: 모든 설정값을 프론트엔드에서 받아올 수 있도록 구현
4. **에러 처리**: 각 단계별로 적절한 에러 처리 및 검증 로직 포함 