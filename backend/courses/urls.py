from django.urls import path
from . import views


urlpatterns = [
    path('', views.routes, name='routes'),
    path('<int:route_id>/', views.route_detail, name='route-detail'),
    path('generate_course/', views.generate_travel_course, name='generate-travel-course'),
    path('mission_proposal/', views.get_mission_proposal, name='mission-proposal'),
    # path('generate_user_course/', views.generate_user_course, name='generate-user-course'),
]