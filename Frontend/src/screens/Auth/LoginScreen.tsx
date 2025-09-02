import React, { useEffect, useState } from 'react';
import { Text, Image, View, Alert, StyleSheet, TouchableOpacity, Modal, Linking } from 'react-native';
import { OAUTH_URLS } from '../../config/apiKeys';
import authService from '../../services/authService';
import SocialLoginWebView from './SocialLoginWebView';
import { INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import { BACKEND_API } from '../../config/apiKeys';

const LoginScreen = ({ navigation }: any) => {
  const [showWebView, setShowWebView] = useState(false);
  const [loginProvider, setLoginProvider] = useState<'google' | 'kakao'>('google');
  const [loginUrl, setLoginUrl] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentProvider, setCurrentProvider] = useState<'google' | 'kakao' | 'unknown'>('unknown');
  const [loginHandled, setLoginHandled] = useState(false); // 중복 Alert 방지 플래그

  const APP_LOGIN_SUCCESS_SCHEME = 'timetravelapp://login-success';

  const checkLoginStatus = async () => {
    try {
      const tokens = await authService.getTokens();
      const user = await authService.getUser();

      if (tokens?.access && user?.id) {
        const isProfileComplete = await checkProfileCompletion(user.id);
        if (isProfileComplete) {
          navigation.navigate('MainTabs');
        } else {
          navigation.navigate('ProfileSetup');
        }
      } else {
        setIsLoggedIn(false);
        setUserProfile(null);
      }
    } catch (error) {
      setIsLoggedIn(false);
      setUserProfile(null);
    }
  };

  const fetchUserFromBackend = async (userId: number, accessToken: string) => {
    try {
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/users/profile/${userId}/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.ok) return await response.json();
      return null;
    } catch (error) {
      return null;
    }
  };

  const checkProfileCompletion = async (userId: number): Promise<boolean> => {
    try {
      const tokens = await authService.getTokens();
      if (!tokens?.access) return false;

      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/users/profile/${userId}/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tokens.access}` },
      });
      if (response.ok) {
        const userData = await response.json();
        return userData.nickname && userData.age && userData.gender;
      }
      return false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    checkLoginStatus();

    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (!url.startsWith(APP_LOGIN_SUCCESS_SCHEME)) return;
      if (loginHandled) return; // 중복 처리 방지
      setLoginHandled(true);

      try {
        const parsed = new URL(url);
        const accessToken = parsed.searchParams.get('access');
        if (accessToken) {
          handleLoginSuccess({ accessToken, provider: 'google' });
        } else {
          handleLoginError('토큰이 포함되어 있지 않습니다.');
        }
      } catch {
        handleLoginError('딥링크 파싱 중 오류가 발생했습니다.');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && !loginHandled) {
        setLoginHandled(true);
        handleDeepLink({ url: initialUrl });
      }
    })();

    return () => subscription.remove();
  }, [loginHandled]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setTimeout(() => {
        checkLoginStatus();
      }, 100);
    });
    return unsubscribe;
  }, [navigation]);

  const handleSocialLogin = (provider: 'google' | 'kakao') => {
    setCurrentProvider(provider);
    setLoginProvider(provider);

    if (provider === 'google') {
      const url = `${OAUTH_URLS.GOOGLE_LOGIN}?client=app`;
      Linking.openURL(url);
    } else {
      setLoginUrl(OAUTH_URLS.KAKAO_LOGIN);
      setShowWebView(true);
    }
  };

  const handleLoginSuccess = async (userData: any) => {
    if (loginHandled === false) setLoginHandled(true); // 안전장치

    let finalProvider = userData?.provider || currentProvider || 'unknown';
    if (finalProvider !== currentProvider) setCurrentProvider(finalProvider);

    const access = userData?.accessToken;
    if (access) {
      await authService.saveTokens({ access, refresh: '' });
      let userId = 0;
      try {
        const tokenParts = access.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          userId = payload.user_id || 0;
        }
      } catch {}

      const user = await fetchUserFromBackend(userId, access);
      if (user) {
        await authService.saveUser(user);
        setUserProfile(user);
        setIsLoggedIn(true);
      } else {
        const mockUser = {
          id: userId,
          username: finalProvider === 'google' ? 'Google User' : 'Kakao User',
          nickname: finalProvider === 'google' ? 'Google User' : 'Kakao User',
          useremail: 'user@example.com',
          age: '',
          gender: '',
        };
        await authService.saveUser(mockUser);
        setUserProfile(mockUser);
        setIsLoggedIn(true);
      }
    }

    setShowWebView(false);
    Alert.alert(
      '로그인 성공',
      `${finalProvider === 'google' ? '구글' : finalProvider === 'kakao' ? '카카오' : '소셜'} 로그인이 완료되었습니다!`,
      [{ text: '확인', onPress: () => checkLoginStatus() }]
    );
  };

  const handleLoginError = (error: string) => {
    setShowWebView(false);
    Alert.alert('로그인 실패', error);
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsLoggedIn(false);
    setUserProfile(null);
    Alert.alert('로그아웃', '로그아웃되었습니다.');
  };

  if (isLoggedIn && userProfile) {
    return (
			<View style={styles.container}>
        <View style={styles.profileContainer}>

          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {userProfile.nickname?.charAt(0) || userProfile.username?.charAt(0) || 'U'}
              </Text>
            </View>
            <Text style={styles.profileTitle}>
              {userProfile.nickname || userProfile.username || '사용자'}
            </Text>
            <Text style={styles.profileSubtitle}>
              {userProfile.useremail || '이메일 미설정'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.profileRow}>
              <View style={styles.profileLabelContainer}>
                <Text style={styles.profileLabel}>이름</Text>
              </View>
              <Text style={styles.profileValue}>{userProfile.username || '미설정'}</Text>
            </View>

            <View style={styles.profileRow}>
              <View style={styles.profileLabelContainer}>
                <Text style={styles.profileLabel}>닉네임</Text>
              </View>
              <Text style={styles.profileValue}>{userProfile.nickname || '미설정'}</Text>
            </View>

            <View style={styles.profileRow}>
              <View style={styles.profileLabelContainer}>
                <Text style={styles.profileLabel}>나이</Text>
              </View>
              <Text style={styles.profileValue}>{userProfile.age || '미설정'}</Text>
            </View>

            <View style={styles.profileRow}>
              <View style={styles.profileLabelContainer}>
                <Text style={styles.profileLabel}>성별</Text>
              </View>
              <Text style={styles.profileValue}>{userProfile.gender || '미설정'}</Text>
            </View>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity
              style={[styles.profileButton, styles.editButton]}
              onPress={() => navigation.navigate('ProfileSetup')}
            >
              <View style={styles.buttonContent}>
                <Text style={[styles.profileButtonText, styles.editButtonText]}>프로필 수정</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.profileButton, styles.logoutButton]}
              onPress={handleLogout}
            >
              <View style={styles.buttonContent}>
                <Text style={[styles.profileButtonText, styles.logoutButtonText]}>로그아웃</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.profileButton, styles.signOutButton]}
              onPress={() => navigation.navigate('MainTabs')}
            >
              <View style={styles.buttonContent}>
                <Text style={[styles.profileButtonText, styles.signOutButtonText]}>회원 탈퇴</Text>
              </View>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>인천 타임머신</Text>
        <Text style={styles.subtitle}>소셜 로그인으로 시작하세요</Text>
      </View>

      <View style={styles.loginContainer}>
        <TouchableOpacity onPress={() => handleSocialLogin('google')} style={styles.socialLoginButton}>
          <Image source={require('../../assets/images/android_light_sq_ctn.png')} style={styles.googleButton} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleSocialLogin('kakao')} style={styles.socialLoginButton}>
          <Image source={require('../../assets/images/kakao_login_medium_wide.png')} style={styles.kakaoButton} />
        </TouchableOpacity>
      </View>

      <Modal visible={showWebView} animationType="slide" presentationStyle="pageSheet">
        <SocialLoginWebView
          provider={loginProvider}
          loginUrl={loginUrl}
          onLoginSuccess={handleLoginSuccess}
          onLoginError={handleLoginError}
          onClose={() => setShowWebView(false)}
        />
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
		backgroundColor: '#fff'
	},
  headerContainer: {
		alignItems: 'center',
		marginBottom: 30
	},
  title: {
		...TEXT_STYLES.title,
		marginBottom: 8
	},
  subtitle: {
		...TEXT_STYLES.subtitle
	},
  loginContainer: {
		alignItems: 'center',
		width: '100%',
		arginBottom: 30
	},
  socialLoginButton: {
    shadowColor: '#000',
    marginBottom: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  googleButton: {
		width: 300,
		height: 50,
		resizeMode: 'stretch'
	},
  kakaoButton: {
		width: 300,
		height: 50,
		resizeMode: 'contain'
	},
  // 프로필 관련 스타일
  profileContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  profileAvatarText: {
		...TEXT_STYLES.title,
    color: '#fff',
  },
  profileTitle: {
		...TEXT_STYLES.subtitle,
    marginBottom: 5,
  },
  profileSubtitle: {
		...TEXT_STYLES.heading,
    marginTop: 5,
  },
  profileInfo: {
    marginBottom: 30,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  profileLabelContainer: {
    width: 80,
    alignItems: 'flex-start',
  },
  profileLabel: {
		...TEXT_STYLES.button,
		color: '#000'
  },
  profileValue: {
		...TEXT_STYLES.button,
    flex: 1,
    textAlign: 'right',
  },
  profileActions: {
    gap: 15,
  },
  profileButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e0e0e0',
  },
  editButton: {
		borderWidth: 2,
    borderColor: '#007AFF',
  },
  logoutButton: {
		borderWidth: 2,
    borderColor: '#34C759',
  },
  signOutButton: {
		borderWidth: 2,
    borderColor: '#FF3B30',
  },
  profileButtonText: {
		...TEXT_STYLES.button,
  },
	signOutButtonText: {
    color: '#FF3B30',
	}
});

export default LoginScreen;
