from rest_framework import serializers
from .models import CustomUser
from django.contrib.auth import get_user_model

# articles/models 안의 모델

class UserSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = CustomUser
        fields = ['id', 'nickname', 'username', 'useremail', 'phone', 'age', 'gender']
        read_only_fields = ['id', 'useremail']

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['nickname', 'phone', 'age', 'gender']