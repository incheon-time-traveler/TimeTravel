# 필요한 라이브러리 로드
import os
import requests
from bs4 import BeautifulSoup
import re
from dotenv import load_dotenv

load_dotenv()

from langchain.agents import Tool
from langchain_core.tools import tool
from langchain.tools.retriever import create_retriever_tool
from langchain_chroma import Chroma
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
from langchain_community.document_loaders import CSVLoader
from langchain_community.document_loaders import WebBaseLoader
from langchain_community.vectorstores import FAISS
from langchain_tavily import TavilySearch
from langchain_community.utilities import OpenWeatherMapAPIWrapper


# 환경 변수 설정
os.environ["HF_TOKEN"] = os.getenv("HUGGINGFACE_API_KEY")
os.environ["TAVILY_API_KEY"] = os.getenv("TAVILY_API_KEY")
os.environ["OPENWEATHERMAP_API_KEY"] = os.getenv("OPENWEATHERMAP_API_KEY")
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
os.environ["USER_AGENT"] = os.getenv("USER_AGENT")
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")

# URL, DATA PATH 설정
KAKAO_URL = os.getenv("KAKAO_URL")
KAKAO_MAP_URL = os.getenv("KAKAO_MAP_URL")
DB_PATH = os.getenv("DB_PATH")
RESTROOM_CSV = os.getenv("RESTROOM_CSV")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")

# 임베딩 모델 설정
hf_embeddings = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL,
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)

# 저장된 벡터 db 불러오기
try:
    spots_store = Chroma(
        collection_name="spot_db",
        embedding_function=hf_embeddings,
        persist_directory=DB_PATH
    )
    
    # retriever 설정
    spot_retriever = spots_store.as_retriever(
        search_type="similarity_score_threshold",
        search_kwargs={"score_threshold": 0.8,    # 임계값 설정
                       "k": 1},
    )

    search_spot_tool_in_db = create_retriever_tool(
        spot_retriever,
        name="vectordb_search",
        description="Use this tool to search information about Incheon's tour spots from the vector database."
    )
except Exception as e:
    print(f"벡터DB 로딩 실패: {e}")
    search_spot_tool_in_db = None

# ===============[Tool]============================

# 1. 질문 분리 및 분석 tool
@tool
def analyze_user_question(user_question: str, user_lat: str = None, user_lon: str = None) -> dict:
    """사용자의 질문을 분석하여 어떤 종류의 질문인지 분류하고 필요한 정보를 추출합니다."""
    
    question_types = {
        "tourism": False,      # 인천 관광지 관련
        "restaurant": False,   # 맛집 관련
        "cafe": False,         # 카페 관련
        "location": False,     # 위치 관련
        "weather": False,      # 날씨 관련
        "restroom": False,     # 화장실 관련
        "blog_review": False,  # 블로그 후기 관련
        "route": False,        # 길찾기 관련
        "clarification_needed": False  # 질문 명확화 필요
    }
    
    extracted_info = {
        "location": None,      # 구체적인 위치
        "place_name": None,    # 장소명
        "query": None,         # 검색어
        "needs_clarification": False,
        "clarification_question": None,
        "transport_mode": "car",  # 기본값은 자동차
        "needs_current_location": False,  # 현재 위치 정보 필요 여부
        "latitude": None,      # 사용자 GPS 위도
        "longitude": None,     # 사용자 GPS 경도
        "has_coordinates": False,  # GPS 좌표 보유 여부
        "location_type": None  # 위치 타입: "specific_place", "current_location", "unknown"
    }
    
    # 프론트에서 전달받은 GPS 좌표가 있으면 설정
    if user_lat and user_lon:
        try:
            extracted_info["latitude"] = float(user_lat)
            extracted_info["longitude"] = float(user_lon)
            extracted_info["has_coordinates"] = True
        except ValueError:
            # GPS 좌표 변환 실패 시 무시
            pass
    
    # 질문을 소문자로 변환하여 분석
    question_lower = user_question.lower()
    
    # 관광지 관련 질문 확인
    if any(keyword in question_lower for keyword in ["관광", "여행", "명소", "볼거리", "인천", "스팟"]):
        question_types["tourism"] = True
        extracted_info["query"] = user_question
    
    # 맛집 관련 질문 확인
    if any(keyword in question_lower for keyword in ["맛집", "음식점", "식당", "밥", "먹을곳"]):
        question_types["restaurant"] = True
        extracted_info["query"] = user_question
        
        # 위치 정보 추출
        if any(keyword in question_lower for keyword in ["근처", "가까운", "주변"]):
            question_types["location"] = True
            
            # 1단계: 구체적인 위치명이 있는지 먼저 확인
            location_patterns = [
                r"([가-힣]+역)\s*근처",
                r"([가-힣]+동)\s*근처", 
                r"([가-힣]+구)\s*근처",
                r"([가-힣]+)\s*근처"
            ]
            
            location_found = False
            for pattern in location_patterns:
                match = re.search(pattern, user_question)
                if match:
                    extracted_info["location"] = match.group(1)
                    extracted_info["location_type"] = "specific_place"  # 특정 장소
                    location_found = True
                    break
            
            # 2단계: 구체적 위치가 없으면 현재 위치 관련 키워드 확인
            if not location_found:
                current_location_keywords = ["근처", "주변", "가까운", "여기", "현재"]
                has_current_location_keyword = any(keyword in question_lower for keyword in current_location_keywords)
                
                if has_current_location_keyword:
                    # 현재 위치 관련 질문
                    extracted_info["location"] = "current_location"
                    extracted_info["location_type"] = "current_location"  # 현재 위치
                    if extracted_info["has_coordinates"]:
                        # GPS 좌표가 있으면 현재 위치로 설정
                        extracted_info["needs_current_location"] = False
                    else:
                        # GPS 좌표가 없으면 요청
                        extracted_info["needs_current_location"] = True
                else:
                    # 위치 정보가 명확하지 않음
                    extracted_info["location"] = None
                    extracted_info["location_type"] = "unknown"  # 위치 불명
                    extracted_info["needs_current_location"] = True
    
    # 카페 관련 질문 확인
    if any(keyword in question_lower for keyword in ["카페", "커피", "디저트"]):
        question_types["cafe"] = True
        extracted_info["query"] = user_question
        
        # 위치 정보 추출
        if any(keyword in question_lower for keyword in ["근처", "가까운", "주변"]):
            question_types["location"] = True
            
            # 1단계: 구체적인 위치명이 있는지 먼저 확인
            location_patterns = [
                r"([가-힣]+역)\s*근처",
                r"([가-힣]+동)\s*근처", 
                r"([가-힣]+구)\s*근처",
                r"([가-힣]+)\s*근처"
            ]
            
            location_found = False
            for pattern in location_patterns:
                match = re.search(pattern, user_question)
                if match:
                    extracted_info["location"] = match.group(1)
                    extracted_info["location_type"] = "specific_place"  # 특정 장소
                    location_found = True
                    break
            
            # 2단계: 구체적 위치가 없으면 현재 위치 관련 키워드 확인
            if not location_found:
                current_location_keywords = ["근처", "주변", "가까운", "여기", "현재"]
                has_current_location_keyword = any(keyword in question_lower for keyword in current_location_keywords)
                
                if has_current_location_keyword:
                    # 현재 위치 관련 질문
                    extracted_info["location"] = "current_location"
                    extracted_info["location_type"] = "current_location"  # 현재 위치
                    if extracted_info["has_coordinates"]:
                        # GPS 좌표가 있으면 현재 위치로 설정
                        extracted_info["needs_current_location"] = False
                    else:
                        # GPS 좌표가 없으면 요청
                        extracted_info["needs_current_location"] = True
                else:
                    # 위치 정보가 명확하지 않음
                    extracted_info["location"] = None
                    extracted_info["location_type"] = "unknown"  # 위치 불명
                    extracted_info["needs_current_location"] = True
    
    # 날씨 관련 질문 확인
    if any(keyword in question_lower for keyword in ["날씨", "기온", "비", "맑음"]):
        question_types["weather"] = True
        # 위치 정보 추출
        location_match = re.search(r"([가-힣]+)\s*날씨", user_question)
        if location_match:
            extracted_info["location"] = location_match.group(1)
    
    # 화장실 관련 질문 확인
    if "화장실" in question_lower:
        question_types["restroom"] = True
        extracted_info["query"] = user_question
    
    # 블로그 후기 관련 질문 확인
    if any(keyword in question_lower for keyword in ["후기", "리뷰", "블로그", "평가", "어떤가"]):
        question_types["blog_review"] = True
        # 장소명 추출
        place_patterns = [
            r"([가-힣a-zA-Z0-9\s]+)\s*후기",
            r"([가-힣a-zA-Z0-9\s]+)\s*리뷰",
            r"([가-힣a-zA-Z0-9\s]+)\s*어떤가",
            r"([가-힣a-zA-Z0-9\s]+)\s*평가"
        ]
        for pattern in place_patterns:
            match = re.search(pattern, user_question)
            if match:
                extracted_info["place_name"] = match.group(1).strip()
                break
    
    # 길찾기/경로 안내 관련 질문 확인
    if any(keyword in question_lower for keyword in ["길찾기", "가는 법", "가는 길", "가는길", "어떻게 가", "경로", "루트"]):
        question_types["route"] = True
        extracted_info["query"] = user_question
        
        # 이동수단 분석
        if any(keyword in question_lower for keyword in ["버스", "지하철", "전철", "대중교통", "대중 교통"]):
            extracted_info["transport_mode"] = "publictransit"
        elif any(keyword in question_lower for keyword in ["도보", "걸어서", "걸어가", "걸어서 가"]):
            extracted_info["transport_mode"] = "foot"
        elif any(keyword in question_lower for keyword in ["자전거", "자전거로", "자전거 타고"]):
            extracted_info["transport_mode"] = "bicycle"
        elif any(keyword in question_lower for keyword in ["차", "자동차", "운전", "드라이브"]):
            extracted_info["transport_mode"] = "car"

    # 질문이 명확하지 않은 경우 확인
    if not any(question_types.values()):
        question_types["clarification_needed"] = True
        extracted_info["needs_clarification"] = True
        extracted_info["clarification_question"] = (
            "어떤 정보를 찾고 계신지 좀 더 구체적으로 말씀해주세요! 관광지, 맛집, 카페, 날씨 등 어떤 것이 궁금하신가요?"
        )
    
    return {
        "question_types": question_types,
        "extracted_info": extracted_info,
        "original_question": user_question
    }

# 2. tavily search tool
search_tool_in_web = TavilySearch(
    max_results=5,
    search_depth="advanced",
    include_answer=True,
    include_images=True,
)

# 3. 날씨 tool
weather = OpenWeatherMapAPIWrapper()
open_weather_map = Tool(
    name="weather",
    func=weather.run,
    description="Use this tool to search weather information for a given location."
)

# 4. 공공화장실
loader = CSVLoader(
    file_path=RESTROOM_CSV,
    source_column="summary",
    metadata_columns=["name", "address", "mapx", "mapy"],
    encoding="utf-8",
)

restroom_data = loader.load()

vector = FAISS.from_documents(restroom_data, hf_embeddings)

restroom_retriever = vector.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"score_threshold": 0.7,    # 임계값 설정
                   "k": 3},
)

restroom_tool = create_retriever_tool(
    restroom_retriever,
    name="restroom_search",    # 도구 이름 입력
    description="Use this tool to search the restroom information from CSV loader.",
)

# 5. 카페 추천 tool
@tool
def get_near_cafe_in_kakao(query: str, location: str = None, latitude: str = None, longitude: str = None) -> list:
    """사용자에게 카페를 추천합니다. 위치 정보가 있으면 해당 지역 근처의 카페를 검색합니다."""
    # KAKAO local 사용
    url = KAKAO_URL + "/local/search/keyword.json"
    headers = {
        "Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"
    }
    
    # 검색어 설정
    search_query = query
    if location:
        search_query = f"{location} {query}"
    
    params = {
        "query": search_query,
        "category_group_code": "CE7",
        "size": "5",
        "radius": "1000",
    }
    
    # GPS 좌표가 있으면 추가
    if latitude and longitude:
        params["x"] = str(longitude)  # 카카오 API는 경도가 x, 위도가 y
        params["y"] = str(latitude)
        params["radius"] = "2000"  # GPS 좌표 기반이면 검색 반경을 늘림

    response = requests.get(url=url, headers=headers, params=params)

    spots = []

    # 요청 성공 확인
    if response.status_code == 200:
        response = response.json()
        spots_info = response["documents"]
        for spot_info in spots_info:
            name = spot_info["place_name"]
            spot_url = spot_info["place_url"]
            address = spot_info["road_address_name"]
            phone = spot_info["phone"]
            latitude = spot_info["y"]
            longitude = spot_info["x"]
            info = {
                "name": name,
                "address": address,
                "latitude": latitude,
                "longitude": longitude,
                "place_url": spot_url,
                "phone_number": phone
            }
            spots.append(info)
    else:
        print(f"HTTP 요청 실패. 응답 코드: {response.status_code}")

    return spots

# 6. 맛집 추천 tool
@tool
def get_near_restaurant_in_kakao(query: str, location: str = None, latitude: str = None, longitude: str = None) -> list:
    """사용자에게 음식점이나 식당을 추천합니다. 위치 정보가 있으면 해당 지역 근처의 맛집을 검색합니다."""
    # KAKAO local 사용
    url = KAKAO_URL + "/local/search/keyword.json"
    headers = {
        "Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"
    }
    
    # 검색어 설정
    search_query = query
    if location:
        search_query = f"{location} {query}"
    
    params = {
        "query": search_query,
        "category_group_code": "FD6",
        "size": "5",
        "radius": "1000",
    }
    
    # GPS 좌표가 있으면 추가
    if latitude and longitude:
        params["x"] = str(longitude)  # 카카오 API는 경도가 x, 위도가 y
        params["y"] = str(latitude)
        params["radius"] = "2000"  # GPS 좌표 기반이면 검색 반경을 늘림

    response = requests.get(url=url, headers=headers, params=params)

    spots = []

    # 요청 성공 확인
    if response.status_code == 200:
        response = response.json()
        spots_info = response["documents"]
        for spot_info in spots_info:
            name = spot_info["place_name"]
            spot_url = spot_info["place_url"]
            address = spot_info["road_address_name"]
            phone = spot_info["phone"]
            latitude = spot_info["y"]
            longitude = spot_info["x"]
            info = {
                "name": name,
                "address": address,
                "latitude": latitude,
                "longitude": longitude,
                "place_url": spot_url,
                "phone_number": phone
            }
            spots.append(info)
    else:
        print(f"HTTP 요청 실패. 응답 코드: {response.status_code}")

    return spots

# 7. 블로그 서치 tool
@tool
def search_blog(query: str) -> list:
    """특정 장소(place_name)에 대한 추가적인 정보인 블로그 후기를 위한 블로그 리스트를 반환합니다."""
    # 블로그 찾기
    url = KAKAO_URL + "/search/blog"
    headers = {
        "Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"
    }
    params = {
        "query": query,
        "size": "10"
    }
    response = requests.get(url=url, headers=headers, params=params)

    blog_list = []

    if response.status_code == 200:
        response = response.json()
        for document in response["documents"]:
            title = document.get("title")
            contents = document.get("contents")
            blog_name = document.get("blogname")
            blog_url = document.get("url")
            info = {
                "title": title,
                "contents": contents,
                "blog_name": blog_name,
                "blog_url": blog_url,
            }
            blog_list.append(info)

    else:
        print(f"HTTP 요청 실패. 응답 코드: {response.status_code}")

    return blog_list

# 8. 블로그 내용 크롤링 및 요약 tool
@tool
def get_detail_info(url: str) -> str:
    """주어진 블로그 URL(blog_url)에서 주요 본문을 추출하고, 3문장으로 요약합니다."""
    try:
        loader = WebBaseLoader(url)
        data = loader.load()
        
        if not data:
            return "블로그 내용을 가져올 수 없습니다."
        
        content = data[0].page_content
        
        # HTML 태그 제거
        soup = BeautifulSoup(content, 'html.parser')
        text_content = soup.get_text()
        
        # 불필요한 공백 제거
        text_content = re.sub(r'\s+', ' ', text_content).strip()
        
        # 내용이 너무 길면 앞부분만 반환
        if len(text_content) > 1000:
            text_content = text_content[:1000] + "..."
        
        return text_content
        
    except Exception as e:
        return f"블로그 내용을 가져오는 중 오류가 발생했습니다: {str(e)}"

# 9. 질문 명확화 요청 tool
@tool
def ask_for_clarification(question: str) -> str:
    """사용자의 질문이 명확하지 않을 때 구체적으로 물어봅니다."""
    clarification_questions = [
        "어떤 정보를 찾고 계신지 좀 더 구체적으로 말씀해주세요!",
        "관광지, 맛집, 카페, 날씨 등 어떤 것이 궁금하신가요?",
        "어느 지역에 대해 궁금하신가요?",
        "구체적으로 어떤 장소나 정보를 원하시나요?"
    ]
    
    return f"아직 정확히 이해하지 못했어요. {question}에 대해 좀 더 자세히 설명해주세요!"

# 10. GPS 좌표 파싱 tool
@tool
def parse_gps_coordinates(user_input: str) -> dict:
    """사용자 입력에서 GPS 좌표를 파싱합니다."""
    import re
    
    result = {
        "latitude": None,
        "longitude": None,
        "has_coordinates": False,
        "parsed_input": user_input
    }
    
    # 패턴 1: "위도: X, 경도: Y" 형식
    pattern1 = r"위도:\s*([0-9.-]+).*?경도:\s*([0-9.-]+)"
    match1 = re.search(pattern1, user_input)
    
    if match1:
        result["latitude"] = float(match1.group(1))
        result["longitude"] = float(match1.group(2))
        result["has_coordinates"] = True
        return result
    
    # 패턴 2: "X, Y" 형식 (위도, 경도 순서)
    pattern2 = r"([0-9.-]+),\s*([0-9.-]+)"
    match2 = re.search(pattern2, user_input)
    
    if match2:
        # 위도는 -90~90, 경도는 -180~180 범위로 판단
        lat = float(match2.group(1))
        lon = float(match2.group(2))
        
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            result["latitude"] = lat
            result["longitude"] = lon
            result["has_coordinates"] = True
            return result
    
    # 패턴 3: "현재 위치" 키워드
    if "현재 위치" in user_input or "여기" in user_input:
        result["needs_current_location"] = True
        result["message"] = "현재 위치 정보가 필요합니다. GPS 좌표를 입력해주세요."
    
    return result

# 11. 위치 기반 맛집 검색 통합 tool
@tool
def search_restaurants_by_location(user_input: str) -> dict:
    """사용자 입력을 분석하여 위치 기반으로 맛집을 검색합니다."""
    # GPS 좌표 파싱
    gps_info = parse_gps_coordinates(user_input)
    
    # 검색어 추출
    search_keywords = ["맛집", "음식점", "식당", "밥", "먹을곳"]
    query = "맛집"
    for keyword in search_keywords:
        if keyword in user_input:
            query = keyword
            break
    
    result = {
        "gps_info": gps_info,
        "search_query": query,
        "restaurants": [],
        "message": ""
    }
    
    if gps_info["has_coordinates"]:
        # GPS 좌표 기반 검색
        restaurants = get_near_restaurant_in_kakao(
            query=query,
            latitude=str(gps_info["latitude"]),
            longitude=str(gps_info["longitude"])
        )
        result["restaurants"] = restaurants
        result["message"] = f"위도 {gps_info['latitude']}, 경도 {gps_info['longitude']} 주변 맛집을 찾았습니다."
        
    elif "근처" in user_input or "주변" in user_input:
        # 위치명 기반 검색
        location_patterns = [
            r"([가-힣]+역)\s*근처",
            r"([가-힣]+동)\s*근처", 
            r"([가-힣]+구)\s*근처",
            r"([가-힣]+)\s*근처",
            r"([가-힣]+)\s*주변"
        ]
        
        location = None
        for pattern in location_patterns:
            match = re.search(pattern, user_input)
            if match:
                location = match.group(1)
                break
        
        if location:
            restaurants = get_near_restaurant_in_kakao(
                query=query,
                location=location
            )
            result["restaurants"] = restaurants
            result["message"] = f"{location} 근처 맛집을 찾았습니다."
        else:
            result["message"] = "현재 위치 정보가 필요합니다. GPS 좌표를 입력해주세요. (예: 위도: 37.456, 경도: 126.705 주변 맛집)"
            
    elif gps_info.get("needs_current_location"):
        result["message"] = "현재 위치 정보가 필요합니다. GPS 좌표를 입력해주세요. (예: 위도: 37.456, 경도: 126.705 주변 맛집)"
    elif "current_location" in user_input and not gps_info["has_coordinates"]:
        result["message"] = "현재 위치 정보가 필요합니다. GPS 좌표를 입력해주세요. (예: 위도: 37.456, 경도: 126.705 주변 맛집)"
        
    else:
        result["message"] = "위치 정보가 필요합니다. '근처', '주변' 또는 GPS 좌표를 포함해서 질문해주세요."
    
    return result

# 12. 위치 기반 카페 검색 통합 tool
@tool
def search_cafes_by_location(user_input: str) -> dict:
    """사용자 입력을 분석하여 위치 기반으로 카페를 검색합니다."""
    # GPS 좌표 파싱
    gps_info = parse_gps_coordinates(user_input)
    
    # 검색어 추출
    search_keywords = ["카페", "커피", "디저트", "음료"]
    query = "카페"
    for keyword in search_keywords:
        if keyword in user_input:
            query = keyword
            break
    
    result = {
        "gps_info": gps_info,
        "search_query": query,
        "cafes": [],
        "message": ""
    }
    
    if gps_info["has_coordinates"]:
        # GPS 좌표 기반 검색
        cafes = get_near_cafe_in_kakao(
            query=query,
            latitude=str(gps_info["latitude"]),
            longitude=str(gps_info["longitude"])
        )
        result["cafes"] = cafes
        result["message"] = f"위도 {gps_info['latitude']}, 경도 {gps_info['longitude']} 주변 카페를 찾았습니다."
        
    elif "근처" in user_input or "주변" in user_input:
        # 위치명 기반 검색
        location_patterns = [
            r"([가-힣]+역)\s*근처",
            r"([가-힣]+동)\s*근처", 
            r"([가-힣]+구)\s*근처",
            r"([가-힣]+)\s*근처",
            r"([가-힣]+)\s*주변"
        ]
        
        location = None
        for pattern in location_patterns:
            match = re.search(pattern, user_input)
            if match:
                location = match.group(1)
                break
        
        if location:
            cafes = get_near_cafe_in_kakao(
                query=query,
                location=location
            )
            result["cafes"] = cafes
            result["message"] = f"{location} 근처 카페를 찾았습니다."
        else:
            result["message"] = "현재 위치 정보가 필요합니다. GPS 좌표를 입력해주세요. (예: 위도: 37.456, 경도: 126.705 주변 카페)"
            
    elif gps_info.get("needs_current_location"):
        result["message"] = "현재 위치 정보가 필요합니다. GPS 좌표를 입력해주세요. (예: 위도: 37.456, 경도: 126.705 주변 카페)"
    elif "current_location" in user_input and not gps_info["has_coordinates"]:
        result["message"] = "현재 위치 정보가 필요합니다. GPS 좌표를 입력해주세요. (예: 위도: 37.456, 경도: 126.705 주변 카페)"
        
    else:
        result["message"] = "위치 정보가 필요합니다. '근처', '주변' 또는 GPS 좌표를 포함해서 질문해주세요."
    
    return result


# 13. Kakao 맵 장소 검색 tool
@tool
def resolve_place(query: str) -> dict:
    """장소명을 kakao local API로 검색해 좌표를 반환한다."""
    url = KAKAO_URL + "/local/search/keyword.json"
    headers = {
        "Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"
    }
    params = {
        "query": query,
        "size": "3"
    }

    try:
        response = requests.get(url=url, headers=headers, params=params)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        return {"error": f"Kakao API 요청 실패: {e}"}

    docs = response.json().get("documents", [])
    if not docs:
        return {"error": "검색 결과 없음"}

    first = docs[0]
    return {
        "name": first["place_name"],
        "lat": first["y"],
        "lon": first["x"],
        "address": first["road_address_name"] or first["address_name"],
        "place_id": first["id"],  # 카카오맵 place_id 추가
        "candidates": [
            {"name": doc["place_name"], "lat": doc["y"], "lon": doc["x"], "place_id": doc["id"]}
            for doc in docs
        ]
    }

# 14. Kakao 맵 길찾기 링크 생성 tool
@tool
def build_kakaomap_route(start_lat: str, start_lon: str, end_lat: str, end_lon: str, by: str = "car", end_place_id: str = None, end_place_name: str = None) -> dict:
    """출발지, 도착지, 이동수단으로 카카오맵 길찾기 앱/웹 링크를 생성합니다."""
    # 이동수단별 카카오맵 파라미터 매핑
    transport_mapping = {
        "car": "car",           # 자동차
        "walk": "foot",         # 도보
        "bicycle": "bicycle",   # 자전거
        "public_transit": "publictransit",  # 대중교통
        "bus": "publictransit", # 버스
        "subway": "publictransit", # 지하철
        "train": "publictransit"   # 기차
    }
    
    # 기본값은 자동차
    transport_type = transport_mapping.get(by.lower(), "car")
    
    web_url = f"{KAKAO_MAP_URL}?sp={start_lat},{start_lon}&ep={end_lat},{end_lon}&by={transport_type}"
    
    # 이동수단별 설명 추가
    transport_descriptions = {
        "car": "자동차",
        "foot": "도보",
        "bicycle": "자전거", 
        "publictransit": "대중교통"
    }
    
    result = {
        "url": web_url,
        "transport_type": transport_descriptions.get(transport_type, "자동차"),
        "message": f"카카오맵 {transport_descriptions.get(transport_type, '자동차')} 길찾기 링크를 생성했습니다."
    }
    
    # 장소 상세 정보 URL도 함께 제공 (place_id가 있는 경우)
    if end_place_id:
        place_detail_url = f"https://place.map.kakao.com/{end_place_id}"
        result["place_detail_url"] = place_detail_url
        result["place_name"] = end_place_name or "장소"
    
    return result
