from django.contrib import admin
from .models import Photo

@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'route_id', 'spot_id', 'is_used', 'created_at', 'used_at')
    list_filter = ('is_used', 'created_at', 'used_at')
    search_fields = ('user_id__username', 'route_id__name', 'spot_id__name')
    date_hierarchy = 'created_at'