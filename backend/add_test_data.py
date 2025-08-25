#!/usr/bin/env python
"""
테스트 데이터 추가 스크립트
"""
import os
import django

# Django 설정 로드
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'timetraveler.settings')
django.setup()

from spots.models import Spot

def add_test_data():
    """테스트용 spots 데이터를 추가합니다."""
    
    # 기존 데이터 삭제 (선택사항)
    Spot.objects.all().delete()
    
    # 테스트 데이터 추가
    spots_data = [
        {
            'name': '인천대교',
            'lat': 37.4562557,
            'lng': 126.7052062,
            'sigungu_code': '0',
            'walking_activity': True,
            'night_view': True,
            'car_transport': True,
            'famous': True
        },
        {
            'name': '월미도',
            'lat': 37.4662557,
            'lng': 126.7152062,
            'sigungu_code': '0',
            'experience_info': True,
            'past_image_url': 'https://example.com/past_image.jpg',
            'famous': True
        },
        {
            'name': '인천항',
            'lat': 37.4762557,
            'lng': 126.7252062,
            'sigungu_code': '0',
            'night_view': True,
            'quiet_rest': True,
            'car_transport': True
        },
        {
            'name': '송도 센트럴파크',
            'lat': 37.4862557,
            'lng': 126.7352062,
            'sigungu_code': '0',
            'walking_activity': True,
            'with_children': True,
            'with_pets': True,
            'clean_facility': True
        },
        {
            'name': '인천 타워',
            'lat': 37.4962557,
            'lng': 126.7452062,
            'sigungu_code': '0',
            'night_view': True,
            'famous': True,
            'experience_info': True,
            'past_image_url': 'https://example.com/tower_past.jpg'
        }
    ]
    
    for spot_data in spots_data:
        spot, created = Spot.objects.get_or_create(
            name=spot_data['name'],
            defaults=spot_data
        )
        if created:
            print(f"✅ {spot.name} 추가됨")
        else:
            print(f"⚠️ {spot.name} 이미 존재함")
    
    print(f"\n총 {Spot.objects.count()}개의 장소가 데이터베이스에 있습니다.")

if __name__ == '__main__':
    add_test_data() 