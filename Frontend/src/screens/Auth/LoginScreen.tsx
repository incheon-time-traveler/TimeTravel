import React, { useEffect, useState } from 'react';
import { Text, View, Button, Alert, StyleSheet, TouchableOpacity, Modal, Linking } from 'react-native';
import { OAUTH_URLS } from '../../config/apiKeys';
import SocialLoginWebView from './SocialLoginWebView';
import { INCHEON_BLUE_LIGHT, INCHEON_GRAY } from '../../styles/fonts';

const LoginScreen = ({ navigation }: any) => {
  const [showWebView, setShowWebView] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<'google' | 'kakao' | null>(null);
  const [loginUrl, setLoginUrl] = useState('');

  // TODO: 앱 딥링크 스킴은 .env로 이동하세요. 네이티브 설정(Android intent-filter, iOS URL Types) 필요.
  const APP_LOGIN_SUCCESS_SCHEME = 'timetravelapp://login-success';

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (url.startsWith(APP_LOGIN_SUCCESS_SCHEME)) {
        try {
          const parsed = new URL(url);
          const accessToken = parsed.searchParams.get('access');
          if (accessToken) {
            // Google 외부 브라우저 플로우에서의 성공 처리
            handleLoginSuccess({ accessToken, provider: 'google' });
          } else {
            handleLoginError('토큰이 포함되어 있지 않습니다.');
          }
        } catch (e) {
          handleLoginError('딥링크 파싱 중 오류가 발생했습니다.');
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    // 앱이 이미 링크로 열렸을 수 있으므로 초기 URL 체크
    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) handleDeepLink({ url: initialUrl });
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
      Alert.alert('오류', '로그인 URL을 가져오는 중 오류가 발생했습니다.');
    }
  };

  const handleGoogleLogin = async () => {
    handleSocialLogin('google');
  };

  const handleKakaoLogin = () => {
    handleSocialLogin('kakao');
  };

  const handleLoginSuccess = (userData: any) => {
    setShowWebView(false);
    Alert.alert(
      '로그인 성공',
      `${currentProvider === 'google' ? '구글' : '카카오'} 로그인이 완료되었습니다!`,
      [
        {
          text: '확인',
          onPress: () => {
            // 메인 화면으로 이동
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  const handleLoginError = (error: string) => {
    setShowWebView(false);
    Alert.alert('로그인 실패', error);
  };

  const handleCloseWebView = () => {
    setShowWebView(false);
    setCurrentProvider(null);
    setLoginUrl('');
  };

  const handleSignupPress = () => {
    // 회원가입 화면으로 이동
    navigation.navigate('Signup');
  };

  return (
    <View style={[styles.container, { backgroundColor: INCHEON_BLUE_LIGHT }]}>
      <View style={styles.header}>
        <Text style={styles.title}>TimeTravel</Text>
        <Text style={styles.subtitle}>소셜 로그인으로 시작하세요</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
          <Text style={styles.googleButtonText}>구글로 로그인</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.kakaoButton} onPress={handleKakaoLogin}>
          <Text style={styles.kakaoButtonText}>카카오로 로그인</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>또는</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.signupPrompt}>
        <Text style={styles.signupPromptText}>아직 회원이 아니신가요?</Text>
        <TouchableOpacity onPress={handleSignupPress}>
          <Text style={styles.signupLink}>회원가입하기</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>
        * 소셜 로그인으로 간편하게 시작하세요
      </Text>

      {/* 소셜 로그인 WebView 모달 */}
      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {currentProvider && loginUrl && (
          <SocialLoginWebView
            provider={currentProvider}
            loginUrl={loginUrl}
            onLoginSuccess={handleLoginSuccess}
            onLoginError={handleLoginError}
            onClose={handleCloseWebView}
          />
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
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 32,
    marginBottom: 10,
    color: INCHEON_GRAY,
  },
  subtitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_GRAY,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 15,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  googleButtonText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    color: '#333',
    fontSize: 16,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  kakaoButtonText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    color: '#000000',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    marginVertical: 30,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
    marginHorizontal: 8,
  },
  signupPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  signupPromptText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
  },
  signupLink: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 5,
  },
  note: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 12,
    color: INCHEON_GRAY,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default LoginScreen; 