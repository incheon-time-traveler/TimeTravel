/**
 * 환경변수 설정 가이드:
 * 
 * 1. 프로젝트 루트에 .env 파일 생성
 * 2. 아래 형식으로 실제 API 키 입력:
 * 
 * KAKAO_MAP_API_KEY=실제_카카오맵_JavaScript_키
 * KAKAO_REST_API_KEY=실제_카카오_REST_API_키
 * 
 * 3. 앱 재시작
 */

import {
  KAKAO_MAP_API_KEY,
  KAKAO_REST_API_KEY,
} from '@env';

// 간단한 API 키 설정
export const API_KEYS = {
  KAKAO_MAP_API_KEY: KAKAO_MAP_API_KEY || '',
  KAKAO_REST_API_KEY: KAKAO_REST_API_KEY || '',
};

// 백엔드 API URL
export const BACKEND_API = {
  BASE_URL: __DEV__ ? 'http://10.0.2.2:8000' : 'https://your-production-url.com',
};

// OAuth URL 설정
export const OAUTH_URLS = {
  GOOGLE_LOGIN: `${BACKEND_API.BASE_URL}/v1/users/google/login/`,
  KAKAO_LOGIN: `${BACKEND_API.BASE_URL}/v1/users/kakao/login/`,
  GOOGLE_REDIRECT: 'http://localhost:8000/accounts/google/callback/',
  KAKAO_REDIRECT: 'http://localhost:8000/accounts/kakao/callback/',
};

// 간단한 API 키 확인
export const validateApiKeys = () => {
  console.log('🔍 API 키 확인:', {
    KAKAO_MAP_API_KEY: KAKAO_MAP_API_KEY ? '✅ 로드됨' : '❌ 로드 안됨',
    KAKAO_REST_API_KEY: KAKAO_REST_API_KEY ? '✅ 로드됨' : '❌ 로드 안됨',
  });
  
  return !!(KAKAO_MAP_API_KEY && KAKAO_REST_API_KEY);
}; 