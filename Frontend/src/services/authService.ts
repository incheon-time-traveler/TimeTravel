import axios from 'axios';
import { Linking } from 'react-native';

const API_BASE = 'http://localhost:8000/api/v1';

export const signInWithGoogle = () => {
  const url = `${API_BASE}/users/google/login/`;
  Linking.openURL(url);
};

export const signInWithKakao = () => {
  const url = `${API_BASE}/users/kakao/login/`;
  Linking.openURL(url);
};

export const updateUserProfile = async (userId: number, profileData: any, token: string) => {
  return axios.put(`${API_BASE}/users/profile/${userId}/update/`, profileData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}; 