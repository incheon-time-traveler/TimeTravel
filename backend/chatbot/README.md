# FastAPI AI 서버 연동 가이드

## 개요
Django chatbot 앱이 이제 EC2에 배포된 FastAPI AI 서버와 통신하도록 되었습니다.

## 주요 변경사항

### 1. Django 설정 (settings.py)
```python
# FastAPI AI 서버 설정
FASTAPI_AI_SERVER_URL = os.getenv('FASTAPI_AI_SERVER_URL', 'http://localhost:8000')
```

### 2. 환경 변수 설정
`.env` 파일에 다음 설정을 추가하세요:
```env
# FastAPI AI 서버 설정
FASTAPI_AI_SERVER_URL=http://your-ec2-ip:8000
```

### 3. API 엔드포인트

#### 채팅 API
- **URL**: `POST /chatbot/`
- **요청 데이터**:
  ```json
  {
    "user_question": "질문 내용",
    "user_id": "사용자 ID",
    "lat": 37.4563,  // 선택사항
    "lng": 126.7052  // 선택사항
  }
  ```
- **응답 데이터**:
  ```json
  {
    "ai_answer": "인천에서 맛있는 음식점을 추천해드릴게요..."
  }
  ```

#### 헬스체크 API
- **URL**: `GET /chatbot/health/`
- **응답 데이터**:
  ```json
  {
    "status": "healthy",
    "ai_server": "connected"
  }
  ```

### 4. 에러 처리
- **503 Service Unavailable**: AI 서버 연결 실패
- **504 Gateway Timeout**: AI 서버 응답 시간 초과
- **502 Bad Gateway**: AI 서버 HTTP 오류

### 5. 기존 LangChain 코드
- `utils.py`: 주석 처리됨 (더 이상 사용되지 않음)
- `graph_module.py`: 더 이상 사용되지 않음
- `tool_module.py`: 더 이상 사용되지 않음

## FastAPI 서버 요구사항
FastAPI AI 서버는 다음 엔드포인트를 제공해야 합니다:

### 1. 채팅 엔드포인트
- **URL**: `POST /v1/chatbot`
- **요청 데이터**:
  ```json
  {
    "user_question": "인천에서 맛있는 음식점 추천해줘",
    "user_id": "user123",
    "user_location": {
        "lat": 37.4563,  // 선택사항
        "lng": 126.7052  // 선택사항
    }    
  }
  ```
- **응답 데이터**:
  ```json
  {
    "ai_answer": "AI 응답 내용"
  }
  ```

### 2. 헬스체크 엔드포인트
- **URL**: `GET /health`
- **응답 데이터**:
  ```json
  {
    "status": "healthy"
  }
  ```

## 테스트 방법
1. FastAPI AI 서버가 실행 중인지 확인
2. Django 서버 실행
3. 헬스체크 API 호출: `GET /chatbot/health/`
4. 채팅 API 테스트: `POST /chatbot/`
