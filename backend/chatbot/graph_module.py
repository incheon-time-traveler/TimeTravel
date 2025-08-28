# 필요한 라이브러리 로드
import os
from dotenv import load_dotenv

load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_upstage import ChatUpstage
from langchain_core.messages import AIMessage, ToolMessage, HumanMessage

from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

from .tool_module import *

# 환경 변수 설정
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
os.environ["UPSTAGE_API_KEY"] = os.getenv("UPSTAGE_API_KEY")

# LLM 정의 - 인천 토박이 친구 페르소나 설정
def get_llm(company_name):
    if company_name == "openai":
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
        )
    
    elif company_name == "upstage":
        llm = ChatUpstage(
            model="solar-pro",
            temperature=0.3,
        )
    return llm

# 상태 정의
class State(TypedDict):
    # 메시지 정의하기
    messages: Annotated[list, add_messages]
    question_analysis: dict  # 질문 분석 결과
    current_step: str  # 현재 처리 단계


# 도구 목록
TOOLS_RAW = [
    search_spot_tool_in_db,
    search_tool_in_web,
    open_weather_map,
    restroom_tool,
    get_near_cafe_in_kakao,
    get_near_restaurant_in_kakao,
    search_blog,
    get_detail_info,
    ask_for_clarification,
    parse_gps_coordinates,
    search_restaurants_by_location,
    search_cafes_by_location,
    resolve_place,
    build_kakaomap_route,
]

TOOLS = [t for t in TOOLS_RAW if t is not None]

# 원하는 llm 선택
selected_llm = get_llm("openai")

# llm에 TOOLS 바인딩
llm_with_tools = selected_llm.bind_tools(TOOLS)

# 질문 분석 노드
def analyze_question_node(state: State):
    """사용자의 질문을 분석하여 어떤 종류의 질문인지 분류합니다."""
    last_message = state["messages"][-1]
    
    if isinstance(last_message, HumanMessage):
        # GPS 좌표 정보 추출 (프론트에서 전달받은 경우)
        user_lat = None
        user_lon = None
        
        # 메시지에 GPS 정보가 포함되어 있는지 확인
        if hasattr(last_message, 'additional_kwargs') and last_message.additional_kwargs:
            user_lat = last_message.additional_kwargs.get('user_lat')
            user_lon = last_message.additional_kwargs.get('user_lon')
        
        # 질문 분석 실행 (GPS 좌표 포함)
        analysis_result = analyze_user_question.invoke(
            last_message.content,
            user_lat=user_lat,
            user_lon=user_lon
        )
        
        return {
            "question_analysis": analysis_result,
            "current_step": "analysis_complete"
        }
    
    return {
        "question_analysis": {},
        "current_step": "no_analysis_needed"
    }

def _has_unresolved_tool_calls(messages: list) -> bool:
    """마지막 ToolMessage가 나오기 전에 tool_calls가 있으면 True"""
    # 뒤에서 앞으로 훑으며 ToolMessage를 만나면 해결된 상태로 간주
    for m in reversed(messages):
        if isinstance(m, ToolMessage):
            return False
        if isinstance(m, AIMessage) and getattr(m, "tool_calls", None):
            return True
    return False

# 챗봇 함수 정의 - 인천 토박이 친구 페르소나 적용
def chatbot(state: State):
    # 시스템 메시지에 페르소나 설정
    system_message = """너는 인천 토박이인 친한 친구야! 반말과 친근감 있는 말투로 대화해줘.
    
    사용자의 질문을 분석해서 적절한 도구를 사용해서 답변해줘:
    1. 인천 관광지 관련 질문이면 벡터DB를 먼저 검색해
    2. 벡터DB에서 답이 안 나오면 웹 검색을 해
    3. 맛집/카페 질문이면 카카오 API로 검색해
    4. 블로그 후기가 필요하면 카카오 블로그 검색 후 크롤링해
    5. 화장실에 대한 질문(restroom=True)이면 restroom_tool을 사용해서 CSV에서 위치 정보를 찾아 제공해
    6. 길찾기(route=True)면 resolve_place와 build_kakaomap_route를 순서대로 호출해서 웹 링크를 제공해
       - 이동수단은 사용자 질문에서 추출한 transport_mode를 사용해 (car, foot, bicycle, publictransit)
    7. 위치 기반 검색(맛집/카페)에서 "근처", "주변"만 있으면 현재 위치 정보를 요청하고, 구체적 위치명이 있으면 해당 위치 기반으로 검색
    8. 질문이 명확하지 않으면 구체적으로 물어봐
    
    길찾기(route=True)는 최대 2번만 tool을 호출(먼저 resolve_place, 다음 build_kakaomap_route)하고 결과를 안내한 뒤 끝내.
    화장실(restroom=True)은 1번만 tool 호출하고 결과 안내 후 끝내. 추가 tool_call 금지.

    맛집/카페 질문이면 반드시 적절한 도구를 호출해서 구체적인 정보를 제공해줘!
    "잠깐만 기다려줘" 같은 모호한 답변은 하지 말고, 바로 도구를 사용해서 답변해줘!

    항상 친근하고 반말로 대화해줘!"""

    if _has_unresolved_tool_calls(state["messages"]):
        return {}    # 상태 변경 없이 다음 노드로
    
    # 시스템 메시지 추가
    messages_with_system = [{"role": "system", "content": system_message}] + state["messages"]
    
    response = llm_with_tools.invoke(messages_with_system)

    # 디버깅
    print(f"[DEBUG] LLM 응답: {response}")
    if hasattr(response, 'tool_calls') and response.tool_calls:
        print(f"[DEBUG] 도구 호출 감지: {response.tool_calls}")

    # 메시지 호출 및 반환
    return {"messages": [response]}


def _called_tool(state: State, name: str) -> bool:
    for m in reversed(state["messages"]):
        if isinstance(m, ToolMessage):
            # 버전에 따라 name/tool_name 속성 다를 수 있기 때문에 둘다 확인
            if getattr(m, "name", None) == name or getattr(m, "tool_name", None) == name:
                return True
    return False


def _dump_tool_names(messages, last_n: int = 10):
    names = []
    for message in messages:
        if isinstance(message, ToolMessage):
            names.append(getattr(message, "name", None) or getattr(message, "tool_name", None))
    print(f"[DEBUG] ToolMessage names: {names[-last_n:]}")


# 조건부 논리 정의 함수
def select_next_node(state: State):

    # 최근 어떤 ToolMessage가 붙었는지
    _dump_tool_names(state.get("messages", []))
    
    # 질문 분석이 되지 않았다면
    if "question_analysis" not in state or not state["question_analysis"]:
        return "analyze"

    qa_types = state["question_analysis"].get("question_types", {})

    # 디버깅
    print(f"[DEBUG] select_next_node - qa_types: {qa_types}")

    # 길찾기 인텐트(route=True)면 바로 tools 실행
    if qa_types.get("route"):
        if _called_tool(state, "build_kakaomap_route"):
            return END
        return "tools"
    
    # 화장실 우선 처리
    if qa_types.get("restroom"):
        if _called_tool(state, "restroom_search"):
            return END
        return "tools"

    # 나머지 일반 도구 선택하기
    return tools_condition(state)


def _after_tools_router(state):
    return "tools" if _has_unresolved_tool_calls(state.get("messages", [])) else "chatbot"


# 그래프 생성 함수
def make_graph():

    graph_builder = StateGraph(State)
    
    # 도구 노드
    tool_node = ToolNode(tools=TOOLS)

    # 노드 추가하기
    graph_builder.add_node("analyze", analyze_question_node)  # 질문 분석 노드
    graph_builder.add_node("chatbot", chatbot)
    graph_builder.add_node("tools", tool_node)

    # 조건부 엣지 추가
    graph_builder.add_conditional_edges(
        "analyze",
        lambda x: "chatbot",  # 분석 후 항상 챗봇으로
        {"chatbot": "chatbot"}
    )
    
    graph_builder.add_conditional_edges(
        "chatbot",
        select_next_node,
        {"tools": "tools", "analyze": "analyze", END: END}
    )

    # 엣지 추가하기
    graph_builder.add_edge(START, "analyze")  # 시작 시 질문 분석부터
    # graph_builder.add_edge("tools", _after_tools_router)
    graph_builder.add_conditional_edges(
        "tools",
        _after_tools_router,
        {"tools": "tools", "chatbot": "chatbot"}
    )

    # 대화 내용 기억 tool
    memory = MemorySaver()
    
    # 컴파일
    graph = \
    graph_builder.compile(
        checkpointer=memory,
    )

    return graph