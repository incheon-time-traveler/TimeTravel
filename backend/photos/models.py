from django.db import models
from django.conf import settings
from courses.models import Route
from spots.models import Spot
# 구조
# | 필드명 | 키유형 | 데이터 타입 | 설명 |
# | --- | --- | --- | --- |
# | Image_id | PK | integer | 이미지 고유 ID |
# | user_id | FK, NOT NULL | integer | 연결된 유저 ID |
# | route_id | FK, NOT NULL | intger | 연결된 코스 ID |
# | spot_id | FK, NOT NULL | integer | 연관된 장소 ID |
# | image_url | NOT NULL | TEXT | 사진 저장 URL |
# | is_used |  | boolean | 스탬프 사용 여부 |
# | used_at |  | datetime | 스탬프 사용 일시 |

class Photo(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(settings.AUTH_USER_MODEL, null=False, on_delete=models.CASCADE, related_name='user_photos')
    route_id = models.ForeignKey(Route, null=True, blank=True, on_delete=models.CASCADE, related_name='user_photos')
    spot_id = models.ForeignKey(Spot, on_delete=models.CASCADE, related_name='user_photos')
    image_url = models.ImageField(upload_to='photos/') # 사진 저장 URL(uploads/photos/에 저장됨)
    is_used = models.BooleanField(default=False) # 스탬프 사용 여부
    created_at = models.DateTimeField(auto_now_add=True) # 생성 일시    
    used_at = models.DateTimeField(auto_now=True) # 스탬프 사용 일시