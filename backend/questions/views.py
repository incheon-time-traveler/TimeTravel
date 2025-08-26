from django.shortcuts import render
from .models import Question, Answer
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .serializers import QuestionSerializer, AnswerSerializer

# Create your views here.
# 질문 목록 조회
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def questions(request):
    questions = Question.objects.all()
    serializer = QuestionSerializer(questions, many=True)
    return Response(serializer.data)


# 사용자 답변 저장
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def answer(request):
    user_id = request.user.id
    serializer = AnswerSerializer(data=request.data)
    if serializer.is_valid(raise_exception=True):
        serializer.save(user_id=user_id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
