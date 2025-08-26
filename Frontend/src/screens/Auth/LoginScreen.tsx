import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { OAUTH_URLS } from '../../config/apiKeys';
// Lazy-load SocialLoginWebView to avoid early native module initialization
let SocialLoginWebView: any;

const LoginScreen = ({ navigation }: any) => {
  const [showWebView, setShowWebView] = useState(false);
  const [loginProvider, setLoginProvider] = useState<'google' | 'kakao'>('google');
  const [loginUrl, setLoginUrl] = useState('');

  // 백엔드 연결 테스트 함수
  const testBackendConnection = async () => {
    try {
      // 실제 존재하는 엔드포인트로 테스트
      const response = await fetch('http://10.0.2.2:8000/v1/users/google/login/');
      if (response.ok) {
        Alert.alert('연결 성공!', '백엔드 서버에 정상적으로 연결되었습니다.');
      } else {
        Alert.alert('연결 실패', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      Alert.alert('연결 오류', `백엔드 서버에 연결할 수 없습니다.\n\n오류: ${error}`);
    }
  };

  // const handleSocialLogin = (provider: 'google' | 'kakao') => {
  //   setLoginProvider(provider);
  //   setLoginUrl(provider === 'google' ? OAUTH_URLS.GOOGLE_LOGIN : OAUTH_URLS.KAKAO_LOGIN);
  //   setShowWebView(true);
  // };

  const handleSocialLogin = (provider: 'google' | 'kakao') => {
    console.log('Social login clicked:', provider);
    setLoginProvider(provider);
    // Use backend login endpoints in in-app WebView
    const url = provider === 'google' ? OAUTH_URLS.GOOGLE_LOGIN : OAUTH_URLS.KAKAO_LOGIN;
    setLoginUrl(url);
    if (!SocialLoginWebView) {
      try {
        SocialLoginWebView = require('./SocialLoginWebView').default;
      } catch (e) {
        console.warn('Failed to load SocialLoginWebView:', e);
      }
    }
    setShowWebView(true);
  };

  const handleLoginSuccess = (userData: any) => {
    console.log('Login success:', userData);
    setShowWebView(false);
    // 로그인 성공 후 메인 화면으로 이동
    navigation.navigate('Main');
  };

  const handleLoginError = (error: string) => {
    console.log('Login error:', error);
    setShowWebView(false);
    Alert.alert('로그인 실패', error);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TimeTravel</Text>
      
      {/* 백엔드 연결 테스트 버튼 */}
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={testBackendConnection}
      >
        <Text style={styles.testButtonText}>백엔드 연결 테스트</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.socialButton, styles.googleButton]}
        onPress={() => handleSocialLogin('google')}
      >
        <Text style={styles.buttonText}>Google로 로그인</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.socialButton, styles.kakaoButton]}
        onPress={() => handleSocialLogin('kakao')}
      >
        <Text style={styles.buttonText}>Kakao로 로그인</Text>
      </TouchableOpacity>

      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {SocialLoginWebView ? (
          <SocialLoginWebView
            provider={loginProvider}
            loginUrl={loginUrl}
            onLoginSuccess={handleLoginSuccess}
            onLoginError={handleLoginError}
            onClose={() => setShowWebView(false)}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>로그인 화면을 불러오는 중...</Text>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 50,
    color: '#333',
  },
  testButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 30,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  socialButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  buttonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;