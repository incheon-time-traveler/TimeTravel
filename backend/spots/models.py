from django.db import models

# Create your models here.
class Spot(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200)  # title
    description = models.TextField(blank=True)  # overview
    address = models.CharField(max_length=500, blank=True)  # addr1
    lat = models.FloatField()  # mapy
    lng = models.FloatField()  # mapx
    era = models.CharField(max_length=50, blank=True)
    
    # CSV 데이터 추가 필드
    content_id = models.CharField(max_length=20, unique=True, blank=True)  # contentid
    content_type_id = models.CharField(max_length=10, blank=True)  # contenttypeid
    category1 = models.CharField(max_length=10, blank=True)  # cat1
    category2 = models.CharField(max_length=10, blank=True)  # cat2
    category3 = models.CharField(max_length=10, blank=True)  # cat3
    sigungu_code = models.CharField(max_length=10, blank=True)  # sigungucode
    use_time = models.TextField(blank=True)  # usetime
    first_image = models.URLField(blank=True)  # firstimage
    first_image2 = models.URLField(blank=True)  # firstimage2
    past_image_url = models.URLField(blank=True)  # past_image_url
    
    # 특성 태그들
    public_transport = models.BooleanField(default=False)  # 이동_대중교통
    car_transport = models.BooleanField(default=False)  # 이동_자차
    walking_activity = models.BooleanField(default=False)  # 활동_산책
    with_children = models.BooleanField(default=False)  # 동반_아이
    with_pets = models.BooleanField(default=False)  # 동반_반려동물
    clean_facility = models.BooleanField(default=False)  # 청결_시설
    night_view = models.BooleanField(default=False)  # 뷰_야경_경관
    quiet_rest = models.BooleanField(default=False)  # 휴식_조용함
    famous = models.BooleanField(default=False)  # 유명
    experience_info = models.BooleanField(default=False)  # 정보_구성_체험
    fun_sightseeing = models.BooleanField(default=False)  # 볼거리_재미
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'spots'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class SpotPhoto(models.Model):
    id = models.AutoField(primary_key=True)
    spot = models.ForeignKey(Spot, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='spot_photos/')
    name = models.CharField(max_length=100)