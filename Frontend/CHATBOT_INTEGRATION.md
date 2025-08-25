# 챗봇 연동 가이드

## 개요
프론트엔드 ChatScreen과 백엔드 챗봇 API를 연동했습니다.

## 주요 변경사항

### 1. 새로운 서비스 파일
- `src/services/chatbotService.ts`: 챗봇 API 연동 서비스

### 2. ChatScreen 수정
- 하드코딩된 응답 제거
- 백엔드 API 연동 구현
- 로딩 상태 및 오류 처리 추가

### 3. 설정 파일 수정
- `src/config/apiKeys.ts`: API URL 설정
- Android: `network_security_config.xml` 추가
- iOS: `Info.plist` 수정

## API 연동 방법

### 백엔드 요구사항
- Django 서버가 `localhost:8000`에서 실행 중이어야 함
- 챗봇 앱이 활성화되어 있어야 함
- `/v1/chatbot/` 엔드포인트가 작동해야 함

### 프론트엔드 설정
1. 백엔드 서버 실행
2. React Native 앱 실행
3. 챗봇 버튼 클릭하여 테스트

## 개발 환경 설정

### Android 에뮬레이터
- `10.0.2.2:8000`으로 백엔드 접근
- 네트워크 보안 설정으로 HTTP 트래픽 허용

### iOS 시뮬레이터
- `localhost:8000`으로 백엔드 접근
- App Transport Security 예외 설정

## 프로덕션 배포 시 주의사항
1. `apiKeys.ts`의 `BASE_URL`을 실제 서버 URL로 변경
2. HTTPS 사용 권장
3. 네트워크 보안 설정 검토

## 테스트 방법
1. 백엔드 서버 실행: `python manage.py runserver`
2. 프론트엔드 앱 실행
3. 챗봇에서 "안녕" 또는 "인천 추천" 등 질문
4. 백엔드 API 응답 확인

## 문제 해결
- 네트워크 오류 시 Android/iOS 네트워크 설정 확인
- 백엔드 서버 상태 확인
- 콘솔 로그에서 오류 메시지 확인
