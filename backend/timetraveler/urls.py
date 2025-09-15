"""
URL configuration for timetraveler project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.urls import include
from accounts import views
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# API docs 설정
schema_view = get_schema_view(
    openapi.Info(
        title="TimeTraveler API",
        default_version='v1',
        description="TimeTraveler API 문서",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="contact@snippets.local"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
    authentication_classes=[],
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('v1/users/', include('accounts.urls')),
    path('v1/routes/', include('courses.urls')),
    path('v1/spots/', include('spots.urls')),
    path('v1/photos/', include('photos.urls')),
    # 추가: courses 앱을 v1/courses/로도 접근 가능하도록
    path('v1/courses/', include('courses.urls')),
    path('v1/chatbot/', include('chatbot.urls')),
    path('v1/swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('v1/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
