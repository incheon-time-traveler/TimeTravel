from django.urls import path
from . import views


urlpatterns = [
    path('', views.photos, name='photos'),
    path('<int:route_id>/<int:spot_id>', views.photo, name='photo'),
    path('<int:photo_id>', views.photo_detail, name='photo-detail'),
]