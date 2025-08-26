import { KAKAO_REST_API_KEY, KAKAO_REDIRECT_URI } from '@env';

/**
 * 환경변수 설정 가이드:
 * 
 * 1. 프로젝트 루트에 .env 파일 생성
 * 2. 필요한 API 키들을 설정
 * 3. 앱 재시작
 * 
 * 백엔드 환경변수 설정 (.env):
 * - FRONTEND_URL=http://localhost:5173 (프론트엔드 URL)
 * - GOOGLE_CLIENT_ID=your_google_client_id
 * - GOOGLE_CLIENT_SECRET=your_google_client_secret
 * - KAKAO_REST_API_KEY=your_kakao_rest_api_key
 * - KAKAO_REDIRECT_URI=http://localhost:8000/v1/users/kakao/callback/
 */

// 백엔드 API URL
export const BACKEND_API = {
  BASE_URL: __DEV__ ? 'http://10.0.2.2:8000' : 'https://your-production-url.com',
};

// 챗봇 API 설정
export const CHATBOT_API = {
  CHAT_URL: `${BACKEND_API.BASE_URL}/v1/chatbot/`,
};

// OAuth URL 설정
export const OAUTH_URLS = {
  GOOGLE_LOGIN: `${BACKEND_API.BASE_URL}/v1/users/google/login/`,
  KAKAO_LOGIN: `${BACKEND_API.BASE_URL}/v1/users/kakao/login/`,
  KAKAO_REST_API_KEY: KAKAO_REST_API_KEY,
  KAKAO_REDIRECT_URI: KAKAO_REDIRECT_URI,
  GOOGLE_REDIRECT: `${BACKEND_API.BASE_URL}/v1/users/google/callback/?`,
  KAKAO_REDIRECT: (code: string) => `${BACKEND_API.BASE_URL}/v1/users/kakao/callback/?code=${code}`,
}; 