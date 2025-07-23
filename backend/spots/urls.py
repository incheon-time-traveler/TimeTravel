from django.urls import path
from . import views


urlpatterns = [
    path('', views.spots, name='spots'),
    path('<int:spot_id>/', views.spot_detail, name='spot-detail'),
]