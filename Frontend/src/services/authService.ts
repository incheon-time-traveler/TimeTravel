import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API } from '../config/apiKeys';

const API_BASE = BACKEND_API.BASE_URL;

// axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// 요청 인터셉터 - 토큰 자동 추가
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 토큰 만료 처리
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그아웃 처리
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
    }
    return Promise.reject(error);
  }
);

// 소셜 로그인 URL 가져오기
export const getSocialLoginUrl = (provider: 'google' | 'kakao') => {
  return `${API_BASE}/accounts/${provider}/login/`;
};

// 토큰 저장
export const saveTokens = async (accessToken: string, refreshToken?: string) => {
  await AsyncStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    await AsyncStorage.setItem('refreshToken', refreshToken);
  }
};

// 토큰 가져오기
export const getTokens = async () => {
  const accessToken = await AsyncStorage.getItem('accessToken');
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  return { accessToken, refreshToken };
};

// 토큰 삭제 (로그아웃)
export const removeTokens = async () => {
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
};

// 토큰 갱신
export const refreshAccessToken = async () => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('Refresh token not found');
  }

  try {
    const response = await apiClient.post('/accounts/api/token/refresh/', {
      refresh: refreshToken
    });
    
    const newAccessToken = response.data.access;
    await AsyncStorage.setItem('accessToken', newAccessToken);
    return newAccessToken;
  } catch (error) {
    await removeTokens();
    throw error;
  }
};

// 로그아웃
export const logout = async () => {
  try {
    const { accessToken } = await getTokens();
    if (accessToken) {
      await apiClient.post('/accounts/logout/', {
        refresh_token: await AsyncStorage.getItem('refreshToken')
      });
    }
  } catch (error) {
    console.log('Logout error:', error);
  } finally {
    await removeTokens();
  }
};

// 사용자 프로필 가져오기
export const getUserProfile = async (userId: number) => {
  const response = await apiClient.get(`/accounts/profile/${userId}/`);
  return response.data;
};

// 사용자 프로필 업데이트
export const updateUserProfile = async (userId: number, profileData: any) => {
  const response = await apiClient.put(`/accounts/profile/${userId}/`, profileData);
  return response.data;
};

// 인증 상태 확인
export const isAuthenticated = async () => {
  const accessToken = await AsyncStorage.getItem('accessToken');
  return !!accessToken;
}; 