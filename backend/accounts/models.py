from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):
    username = models.CharField(max_length=150, unique=False, blank=True, null=True)
    useremail = models.EmailField(unique=True)
    nickname = models.CharField(max_length=30)
    phone = models.CharField(max_length=15)
    age = models.CharField(max_length=10)
    gender = models.CharField(max_length=10)

    USERNAME_FIELD = 'useremail'
    REQUIRED_FIELDS = ['username']  # 슈퍼유저 생성 시 필요한 필드