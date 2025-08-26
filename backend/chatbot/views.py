from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .utils import get_or_create_graph

@api_view(["POST"])
def chat_with_bot(request):
    """
    사용자 질문에 대한 답변 반환
    """
    graph = get_or_create_graph()

    try:
        # 사용자 질문 받기 (JSON 또는 POST 데이터 모두 지원)
        user_input = request.data.get("user_question") or request.POST.get("user_question")
        
        # # 사용자 위치 받기
        # user_lat = request.data.get("user_lat") or request.POST.get("user_lat")
        # user_lon = request.data.get("user_lon") or request.POST.get("user_lon")

        # 사용자 고유 정보 받기
        user_id = request.data.get("user_id") or request.POST.get("user_id")

        config = {"configurable": {"thread_id": user_id}}

        if not user_input or not user_id:
            return Response(
                {"error": "user_question, user_id 파라미터가 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # if not user_lat or not user_lon:
        #     return Response(
        #         {"error": "user_lat와 user_lon 파라미터가 필요합니다."},
        #         status=status.HTTP_400_BAD_REQUEST
        #     )

        # 챗봇에게 질문하기
        result = graph.invoke(
            {"messages": [{"role": "user", "content": user_input}]},
            config=config
        )

        return Response(
            {"ai_answer": result["messages"][-1].content},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        return Response(
            {"error": f"챗봇 오류가 발생했습니다: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )