from django.urls import path
from . import views

# v1/routes/
urlpatterns = [
    path('', views.routes, name='routes'),
    path('best/', views.best_routes, name='best-routes'),
    path('<int:route_id>/', views.route_detail, name='route-detail'),
    path('<int:route_id>/users/', views.user_routes, name='user-routes'),
    path('generate_course/', views.generate_travel_course, name='generate-travel-course'),
    path('mission_proposal/', views.get_mission_proposal, name='mission-proposal'),
    path('generate_user_course/', views.generate_user_course, name='generate-user-course'),
    path('unlock_route_spot/<int:route_spot_id>/', views.unlock_route_spot, name='unlock-route-spot'),
    path('user_routes/', views.user_routes, name='user-routes-list'),  # 사용자 코스 목록 조회
    path('unlock_spots/', views.unlock_spots, name='unlock-spots'), # 사용자 해금 장소 조회
    path('use_stamp/', views.use_stamp, name='use-stamp'),
]