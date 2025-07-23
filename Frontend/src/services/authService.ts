import axios from 'axios';

const API_BASE = 'http://<YOUR_BACKEND_URL>/api/v1';

export const socialSignup = (provider: 'google' | 'kakao', token: string) =>
  axios.post(`${API_BASE}/users/signup`, { provider, token });

export const socialLogin = (provider: 'google' | 'kakao', token: string) =>
  axios.post(`${API_BASE}/users/login`, { provider, token });

export const socialLogout = (accessToken: string) =>
  axios.post(`${API_BASE}/users/logout`, {}, {
    headers: { Authorization: `Bearer ${accessToken}` }
  }); 