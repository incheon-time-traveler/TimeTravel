import React, { useEffect, useState } from 'react';
import { Text, View, Button, Alert, StyleSheet, TouchableOpacity, Modal, Linking } from 'react-native';
import { OAUTH_URLS } from '../../config/apiKeys';
import authService from '../../services/authService';
import SocialLoginWebView from './SocialLoginWebView';
import { INCHEON_BLUE_LIGHT, INCHEON_GRAY } from '../../styles/fonts';

const LoginScreen = ({ navigation }: any) => {
  const [showWebView, setShowWebView] = useState(false);
  const [loginProvider, setLoginProvider] = useState<'google' | 'kakao'>('google');
  const [loginUrl, setLoginUrl] = useState('');

  // TODO: 앱 딥링크 스킴은 .env로 이동하세요. 네이티브 설정(Android intent-filter, iOS URL Types) 필요.
  const APP_LOGIN_SUCCESS_SCHEME = 'timetravelapp://login-success';

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      console.log('[LoginScreen] Deep link received:', url);
      if (url.startsWith(APP_LOGIN_SUCCESS_SCHEME)) {
        try {
          const parsed = new URL(url);
          const accessToken = parsed.searchParams.get('access');
          console.log('[LoginScreen] Parsed access token from deep link:', accessToken?.slice(0, 12) + '...' );
          if (accessToken) {
            // Google 외부 브라우저 플로우에서의 성공 처리
            handleLoginSuccess({ accessToken, provider: 'google' });
          } else {
            console.warn('[LoginScreen] Deep link missing access token');
            handleLoginError('토큰이 포함되어 있지 않습니다.');
          }
        } catch (e) {
          console.error('[LoginScreen] Deep link parse error:', e);
          handleLoginError('딥링크 파싱 중 오류가 발생했습니다.');
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    // 앱이 이미 링크로 열렸을 수 있으므로 초기 URL 체크
    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('[LoginScreen] Initial URL on app start:', initialUrl);
        handleDeepLink({ url: initialUrl });
      }
    })();

    return () => subscription.remove();
  }, []);

  const handleSocialLogin = (provider: 'google' | 'kakao') => {
    try {
      let url: string;
      if (provider === 'google') {
        // Google은 WebView 금지 → 외부 브라우저로 열기
        // TODO: client=app 같은 플래그는 .env/상수로 이동하세요.
        url = `${OAUTH_URLS.GOOGLE_LOGIN}?client=app`;
        setCurrentProvider('google');
        console.log('[LoginScreen] Opening Google OAuth URL externally:', url);
        Linking.openURL(url);
        // 외부 브라우저 → 콜백 → 백엔드에서 timetravelapp://login-success?access=... 로 리다이렉트
        // 위 딥링크 리스너에서 토큰 처리
      } else {
        url = OAUTH_URLS.KAKAO_LOGIN;
        setCurrentProvider(provider);
        setLoginUrl(url);
        setShowWebView(true);
      }
    } catch (error) {
      console.error('[LoginScreen] handleSocialLogin error:', error);
      Alert.alert('오류', '로그인 URL을 가져오는 중 오류가 발생했습니다.');
    }
  };

  const handleGoogleLogin = async () => {
    handleSocialLogin('google');
  };

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

  const handleLoginSuccess = async (userData: any) => {
    try {
      console.log('[LoginScreen] Login success payload:', userData);
    } catch {}
    // provider 우선순위: 전달된 userData.provider -> state.currentProvider
    const provider = userData?.provider ?? currentProvider ?? 'unknown';
    if (provider && provider !== currentProvider) setCurrentProvider(provider);
    // 토큰 저장 (구글 딥링크 플로우 포함)
    const access = userData?.accessToken;
    if (access) {
      try {
        console.log('[LoginScreen] Saving access token (prefix):', access.slice(0, 12) + '...');
        await authService.saveTokens({ access, refresh: '' });
        console.log('[LoginScreen] saveTokens() success');
        const storedAccess = await authService.getAccessToken();
        console.log('[LoginScreen][Verify] retrieved access prefix:', storedAccess?.slice(0, 12) + '...');
      } catch (e) {
        console.error('[LoginScreen] saveTokens() failed:', e);
      }
    } else {
      console.warn('[LoginScreen] No access token provided in success payload');
    }
    setShowWebView(false);
    Alert.alert(
      '로그인 성공',
      `${provider === 'google' ? '구글' : provider === 'kakao' ? '카카오' : '소셜'} 로그인이 완료되었습니다!`,
      [
        {
          text: '확인',
          onPress: () => {
            // 메인 화면으로 이동
            console.log('[LoginScreen] Navigating to Home after login');
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  const handleLoginError = (error: string) => {
    console.warn('[LoginScreen] Login error:', error);
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