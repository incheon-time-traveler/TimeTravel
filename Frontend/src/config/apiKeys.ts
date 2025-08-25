import {
  KAKAO_MAP_API_KEY,
  KAKAO_REST_API_KEY,
  GOOGLE_MAPS_API_KEY,
} from '@env';

// API 키 설정
export const API_KEYS = {
  // 카카오맵 API 키
  KAKAO_MAP_API_KEY,
  KAKAO_REST_API_KEY,
  
  // 기타 API 키들
  GOOGLE_MAPS_API_KEY,
};

// 백엔드 API URL
export const BACKEND_API = {
  // 개발 환경에서는 localhost, 프로덕션에서는 실제 서버 URL
  BASE_URL: __DEV__ ? 'http://10.0.2.2:8000' : 'https://your-production-url.com',
};

// 챗봇 API URL
export const CHATBOT_API = {
  CHAT_URL: `${BACKEND_API.BASE_URL}/v1/chatbot/`,
};

// API 키 유효성 검사
export const validateApiKeys = () => {
  const missingKeys = [];
  
  if (!API_KEYS.KAKAO_MAP_API_KEY || API_KEYS.KAKAO_MAP_API_KEY === 'your_kakao_map_api_key_here') {
    missingKeys.push('KAKAO_MAP_API_KEY');
  }
  
  if (!API_KEYS.KAKAO_REST_API_KEY || API_KEYS.KAKAO_REST_API_KEY === 'your_kakao_rest_api_key_here') {
    missingKeys.push('KAKAO_REST_API_KEY');
  }
  
  if (missingKeys.length > 0) {
    console.warn('다음 API 키가 설정되지 않았습니다:', missingKeys.join(', '));
    return false;
  }
  
  return true;
}; 