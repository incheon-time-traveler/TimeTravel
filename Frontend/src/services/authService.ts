import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_API } from '../config/apiKeys';

export interface User {
  id: number;
  username: string;
  nickname: string;
  useremail: string;
  age?: string;
  gender?: string;
  phone?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

class AuthService {
  private baseURL: string;

  constructor() {
    this.baseURL = BACKEND_API.BASE_URL;
  }

  // 토큰 저장
  async saveTokens(tokens: AuthTokens): Promise<void> {
    try {
      await AsyncStorage.setItem('access_token', tokens.access);
      await AsyncStorage.setItem('refresh_token', tokens.refresh);
      // 개발 모드에서 저장 검증 로그
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        const verifyAccess = await AsyncStorage.getItem('access_token');
        console.log('[authService.saveTokens][Verify] access prefix:', verifyAccess?.slice(0, 12) + '...');
      }
    } catch (error) {
      console.error('토큰 저장 오류:', error);
      throw error;
    }
  }

  // 토큰 가져오기
  async getTokens(): Promise<AuthTokens | null> {
    try {
      const access = await AsyncStorage.getItem('access_token');
      const refresh = await AsyncStorage.getItem('refresh_token');
      
      console.log('[authService.getTokens] access 존재:', !!access, 'refresh 존재:', !!refresh);
      // console.log(access)
      // access 토큰이 있으면 로그인 상태로 간주 (refresh 토큰은 선택사항)
      if (access) {
        return { 
          access, 
          refresh: refresh || '' // refresh 토큰이 없으면 빈 문자열
        };
      }
      return null;
    } catch (error) {
      console.error('토큰 가져오기 오류:', error);
      return null;
    }
  }

  // 액세스 토큰만 가져오기
  async getAccessToken(): Promise<string | null> {
    try {
      const access = await AsyncStorage.getItem('access_token');
      console.log('[authService.getAccessToken] access 존재:', !!access);
      return access;
    } catch (error) {
      console.error('액세스 토큰 가져오기 오류:', error);
      return null;
    }
  }

  // 사용자 정보 저장
  async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      console.log('[authService.saveUser] 사용자 정보 저장 완료:', user.nickname);
    } catch (error) {
      console.error('사용자 정보 저장 오류:', error);
      throw error;
    }
  }

  // 사용자 정보 가져오기
  async getUser(): Promise<User | null> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      console.log('[authService.getUser] user 문자열 존재:', !!userStr);
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log('[authService.getUser] 사용자 정보 파싱 완료:', user.nickname);
        return user;
      }
      return null;
    } catch (error) {
      console.error('사용자 정보 가져오기 오류:', error);
      return null;
    }
  }

  // 로그인 상태 확인
  async isLoggedIn(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const user = await this.getUser();
      
      console.log('[authService.isLoggedIn] accessToken 존재:', !!accessToken, 'user 존재:', !!user);
      
      // access 토큰과 사용자 정보가 모두 있어야 로그인 상태로 간주
      return !!(accessToken && user);
    } catch (error) {
      console.error('[authService.isLoggedIn] 오류:', error);
      return false;
    }
  }

  // 로그아웃
  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'access_token',
        'refresh_token',
        'user'
      ]);
    } catch (error) {
      console.error('로그아웃 오류:', error);
      throw error;
    }
  }

  // 토큰 갱신
  async refreshToken(): Promise<AuthTokens | null> {
    try {
      const refresh = await AsyncStorage.getItem('refresh_token');
      if (!refresh) {
        return null;
      }

      const response = await fetch(`${this.baseURL}/v1/users/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      });

      if (response.ok) {
        const data = await response.json();
        const tokens: AuthTokens = {
          access: data.access,
          refresh: data.refresh || refresh, // 새로운 refresh 토큰이 없으면 기존 것 사용
        };
        await this.saveTokens(tokens);
        return tokens;
      }
      return null;
    } catch (error) {
      console.error('토큰 갱신 오류:', error);
      return null;
    }
  }

  // 사용자 프로필 업데이트
  async updateProfile(userId: number, profileData: Partial<User>): Promise<User | null> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return null;
      }

      const response = await fetch(`${this.baseURL}/v1/users/profile/${userId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const user = await response.json();
        await this.saveUser(user);
        return user;
      }
      return null;
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      return null;
    }
  }

  // 사용자 프로필 조회
  async getProfile(userId: number): Promise<User | null> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return null;
      }

      const response = await fetch(`${this.baseURL}/v1/users/profile/${userId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        await this.saveUser(user);
        return user;
      }
      return null;
    } catch (error) {
      console.error('프로필 조회 오류:', error);
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService; 