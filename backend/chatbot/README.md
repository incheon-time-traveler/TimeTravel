# Chatbot API

TimeTravel 프로젝트의 챗봇 API입니다. LangGraph를 사용하여 구현된 인천 관광지 정보 제공 챗봇입니다.

## 기능

- 인천 관광지 정보 검색 (벡터DB 기반)
- 웹 검색을 통한 실시간 정보 제공
- 날씨 정보 제공
- 화장실 정보 제공
- 맛집, 카페 정보 제공
- 사용자 질문 분석 및 컨텍스트 이해
- 친근한 인천 토박이 페르소나

## API 엔드포인트

### 1. 챗봇 대화
- **URL**: `POST /api/v1/chatbot/`
- **설명**: 사용자 메시지에 대한 챗봇 응답을 생성합니다.

**요청 예시:**
```json
{
    "user_question": "인천에서 볼만한 곳 추천해줘",
    "user_id": "사용자 고유 정보",
    "user_lat": "",
    "user_lon": ""
}
```

**응답 예시:**
```json
{
    "ai_answer": "챗봇 응답"
}
```

## 환경 변수 설정

다음 환경 변수들을 설정해야 합니다:

```bash
# OpenAI API 키
OPENAI_API_KEY=your_openai_api_key

# Upstage API 키
UPSTAGE_API_KEY=your_upstage_api_key

# HuggingFace API 키
HUGGINGFACE_API_KEY=your_huggingface_api_key

# Tavily 검색 API 키
TAVILY_API_KEY=your_tavily_api_key

# OpenWeatherMap API 키
OPENWEATHERMAP_API_KEY=your_openweathermap_api_key

# 카카오 REST API 키
KAKAO_REST_API_KEY=your_kakao_api_key

# 벡터 DB 경로
DB_PATH=your_vectordb_path

# URL 경로
KAKAO_URL=kakao_developers_url
KAKAO_MAP_URL=kakao_map_scheme_url

# 임베딩 모델명
EMBEDDING_MODEL=model_name

# 화장실 정보가 있는 csv
RESTROOM_CSV=csv_path

# 크롤링을 위한 user agent 설정
USER_AGENT=user-agent
```

## 필요한 데이터 다운로드

- 구글 드라이브 안에 `AI_chatbot/최종 사용 데이터` 안에 있는 데이터 다운로드 후 chatbot 앱 안에 data 폴더 만들어서 넣어주기.
- 이때, spot_db_in_local에는 이상한 글씨 써진 폴더 하나, .sqlite 하나로 되어 있어야 함!

## 설치 및 실행

1. 필요한 패키지 설치:
```bash
pip install -r requirements.txt

# 또는

pip install requests beautifulsoup4 langchain langchain-core langchain-community langchain-chroma langchain-huggingface langchain-tavily langchain-openai langchain-upstage langgraph sentence-transformers pyowm faiss-cpu
```

2. 환경 변수 설정 (`.env` 파일 또는 시스템 환경 변수)

3. Django 서버 실행:
```bash
python manage.py runserver
```

## 주의사항

1. **API 키 보안**: 모든 API 키는 환경 변수로 관리하고, 코드에 직접 입력하지 마세요.
2. **벡터 DB**: 벡터 DB가 설정되지 않은 경우 일부 기능이 제한될 수 있습니다.


## 문제 해결

### 일반적인 오류

1. **ImportError**: 필요한 패키지가 설치되지 않은 경우
   ```bash
   pip install -r requirements.txt
   ```

2. **API 키 오류**: 환경 변수가 설정되지 않은 경우
   ```bash
   export OPENAI_API_KEY=your_key_here
   ```

3. **벡터 DB 오류**: DB 경로가 올바르지 않은 경우
   ```bash
   export DB_PATH=/path/to/your/data
   ```

## 개발자 정보

이 챗봇은 LangGraph와 LangChain을 사용하여 구현되었으며, 인천 관광지 정보를 제공하는 특화된 AI 어시스턴트입니다.
