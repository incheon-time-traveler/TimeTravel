from django.db import models
from django.settings import AUTH_USER_MODEL

# Create your models here.
class Question(models.Model):
    id = models.AutoField(primary_key=True)
    content = models.TextField()
    type = models.CharField(max_length=100)

class Answer(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='answers')
    question_id = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)