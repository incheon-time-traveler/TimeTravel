from django.db import models
from django.settings import AUTH_USER_MODEL

# Create your models here.
"""1. 어떤 여행을 원하시나요?
    1. 걷기 좋은 길을 따라 즐기는 산책
    2. 바다와 도시의 멋진 풍경/야경
    3. 복잡한 곳을 피해 즐기는 휴식
    4. 역사와 문화가 담긴 특별한 체험
    5. 지루할 틈 없는 다이나믹한 재미
2. 누구와 함께 하나요?
    1. 아이와 함께
    2. 연인과 함께
    3. 친구와 함께
    4. 가족과 함께
    5. 반려동물과 함께
3. 어떻게 이동하나요?
    1. 대중교통으로
    2. 자차나 택시로
4. 그밖에 고려 사항이 있나요?
    1. 사람들이 많이 찾는 유명한 곳 위주로
    2. 시설이 깔끔하고 편리했으면 좋겠어요
"""
class Question(models.Model):
    id = models.AutoField(primary_key=True)
    content = models.TextField()
    type = models.CharField(max_length=100)

class Answer(models.Model):
    RESPONSE_TYPE = (
        ('walk', '걷기 좋은 길을 따라 즐기는 산책'),
        ('beach', '바다와 도시의 멋진 풍경/야경'),
        ('rest', '복잡한 곳을 피해 즐기는 휴식'),
        ('history', '역사와 문화가 담긴 특별한 체험'),
        ('fun', '지루할 틈 없는 다이나믹한 재미'),
        ('child', '아이와 함께'),
        ('couple', '연인과 함께'),
        ('friend', '친구와 함께'),
        ('family', '가족과 함께'),
        ('pet', '반려동물과 함께'),
        ('public', '대중교통으로'),
        ('car', '자차나 택시로'),
        ('popular', '사람들이 많이 찾는 유명한 곳 위주로'),
        ('facility', '시설이 깔끔하고 편리했으면 좋겠어요'),
    )

    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='answers')
    question_id = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    response = models.CharField(max_length=100, choices=RESPONSE_TYPE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.response