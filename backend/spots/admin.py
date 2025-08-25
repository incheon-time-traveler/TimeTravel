from django.contrib import admin
from .models import Spot, SpotPhoto


@admin.register(Spot)
class SpotAdmin(admin.ModelAdmin):
    list_display = ['name', 'address', 'lat', 'lng', 'category1', 'famous']
    list_filter = ['category1', 'category2', 'famous', 'public_transport', 'with_children']
    search_fields = ['name', 'description', 'address']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('name', 'description', 'address', 'lat', 'lng', 'era')
        }),
        ('카테고리', {
            'fields': ('content_id', 'content_type_id', 'category1', 'category2', 'category3', 'sigungu_code')
        }),
        ('이미지', {
            'fields': ('first_image', 'first_image2', 'past_image_url')
        }),
        ('운영 정보', {
            'fields': ('use_time',)
        }),
        ('특성 태그', {
            'fields': (
                'public_transport', 'car_transport', 'walking_activity',
                'with_children', 'with_pets', 'clean_facility',
                'night_view', 'quiet_rest', 'famous',
                'experience_info', 'fun_sightseeing'
            )
        }),
        ('시스템 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SpotPhoto)
class SpotPhotoAdmin(admin.ModelAdmin):
    list_display = ['name', 'spot', 'image']
    list_filter = ['spot']
    search_fields = ['name', 'spot__name']
