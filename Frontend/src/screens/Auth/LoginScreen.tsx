import React, { useEffect, useState } from 'react';
import { Text, View, Button, Alert, StyleSheet, TouchableOpacity, Modal, Linking } from 'react-native';
import { OAUTH_URLS } from '../../config/apiKeys';
import authService from '../../services/authService';
import SocialLoginWebView from './SocialLoginWebView';
import { INCHEON_BLUE_LIGHT, INCHEON_GRAY } from '../../styles/fonts';
import { BACKEND_API } from '../../config/apiKeys';

const LoginScreen = ({ navigation, showOnlyLogin = false }: any) => {
  const [showWebView, setShowWebView] = useState(false);
  const [loginProvider, setLoginProvider] = useState<'google' | 'kakao'>('google');
  const [loginUrl, setLoginUrl] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentProvider, setCurrentProvider] = useState<'google' | 'kakao' | 'unknown'>('unknown');

  // TODO: 앱 딥링크 스킴은 .env로 이동하세요. 네이티브 설정(Android intent-filter, iOS URL Types) 필요.
  const APP_LOGIN_SUCCESS_SCHEME = 'timetravelapp://login-success';

  // 로그인 상태 확인 함수
  const checkLoginStatus = async () => {
    try {
      // authService의 isLoggedIn 메서드로 정확한 로그인 상태 확인
      const isUserLoggedIn = await authService.isLoggedIn();
      console.log('[LoginScreen] checkLoginStatus - isLoggedIn:', isUserLoggedIn);
      
      if (isUserLoggedIn) {
        const user = await authService.getUser();
        console.log('[LoginScreen] 로그인된 사용자:', user?.id);
        
        if (user?.id) {
          // showOnlyLogin이 true면 자동 네비게이션 하지 않음
          if (showOnlyLogin) {
            console.log('[LoginScreen] showOnlyLogin=true - 자동 네비게이션 스킵');
            setIsLoggedIn(true);
            setUserProfile(user);
            return;
          }
          
          // 로그인된 상태에서 프로필 완성 여부 확인
          const isProfileComplete = await checkProfileCompletion(user.id);
          
          if (isProfileComplete) {
            console.log('[LoginScreen] 프로필이 이미 완성됨 - MainTabs로 이동');
            navigation.navigate('MainTabs');
          } else {
            console.log('[LoginScreen] 프로필 미완성 - ProfileSetup으로 이동');
            navigation.navigate('ProfileSetup');
          }
        } else {
          console.log('[LoginScreen] 사용자 정보 없음 - 로그아웃 처리');
          await authService.logout();
          setIsLoggedIn(false);
          setUserProfile(null);
        }
      } else {
        console.log('[LoginScreen] User is not logged in');
        setIsLoggedIn(false);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('[LoginScreen] checkLoginStatus failed:', error);
      setIsLoggedIn(false);
      setUserProfile(null);
    }
  };

  // 백엔드에서 실제 사용자 정보 가져오기
  const fetchUserFromBackend = async (userId: number, accessToken: string) => {
    try {
      console.log('[LoginScreen] 백엔드에서 사용자 정보 가져오기 시작 - userId:', userId);
      
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/users/profile/${userId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('[LoginScreen] 백엔드 응답 성공:', userData);
        return userData;
      } else {
        console.log('[LoginScreen] 백엔드 응답 실패:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('[LoginScreen] 백엔드에서 사용자 정보 가져오기 실패:', error);
      return null;
    }
  };

  // 프로필 완성 여부 확인 함수
  const checkProfileCompletion = async (userId: number): Promise<boolean> => {
    try {
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        console.log('[LoginScreen] checkProfileCompletion - 토큰 없음');
        return false;
      }

      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/users/profile/${userId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        // nickname, age, gender가 모두 있는지 확인
        const isComplete = userData.nickname && userData.age && userData.gender;
        console.log('[LoginScreen] 프로필 완성 여부:', isComplete, userData);
        return isComplete;
      } else if (response.status === 401) {
        console.log('[LoginScreen] checkProfileCompletion - 토큰 만료 (401)');
        // 토큰이 만료된 경우 로그아웃 처리
        await authService.logout();
        return false;
      } else {
        console.log('[LoginScreen] checkProfileCompletion - API 호출 실패:', response.status);
        return false;
      }
    } catch (error) {
      console.error('[LoginScreen] 프로필 완성 여부 확인 실패:', error);
      return false;
    }
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 로그인 상태 확인 (showOnlyLogin이 false일 때만)
    if (!showOnlyLogin) {
      checkLoginStatus();
    }
    
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

  // 화면이 포커스될 때마다 로그인 상태 확인
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[LoginScreen] Screen focused, checking login status...');
      // 약간의 지연을 두어 AsyncStorage 작업이 완료된 후 확인
      setTimeout(() => {
        checkLoginStatus();
      }, 100);
    });

    return unsubscribe;
  }, [navigation]);

  // 로그인 상태가 변경될 때마다 로그 출력
  useEffect(() => {
    console.log('[LoginScreen] Login state changed - isLoggedIn:', isLoggedIn, 'userProfile:', !!userProfile);
  }, [isLoggedIn, userProfile]);

  const handleSocialLogin = (provider: 'google' | 'kakao') => {
    try {
      console.log('[LoginScreen] handleSocialLogin 시작 - provider:', provider);
      
      // provider 상태를 먼저 설정
      setCurrentProvider(provider);
      setLoginProvider(provider);
      
      let url: string;
      if (provider === 'google') {
        // Google은 WebView 금지 → 외부 브라우저로 열기
        // TODO: client=app 같은 플래그는 .env/상수로 이동하세요.
        url = `${OAUTH_URLS.GOOGLE_LOGIN}?client=app`;
        console.log('[LoginScreen] Opening Google OAuth URL externally:', url);
        Linking.openURL(url);
        // 외부 브라우저 → 콜백 → 백엔드에서 timetravelapp://login-success?access=... 로 리다이렉트
        // 위 딥링크 리스너에서 토큰 처리
      } else {
        // 카카오 로그인
        url = OAUTH_URLS.KAKAO_LOGIN;
        setLoginUrl(url);
        setShowWebView(true);
        console.log('[LoginScreen] Opening Kakao OAuth in WebView:', url);
      }
    } catch (error) {
      console.error('[LoginScreen] handleSocialLogin error:', error);
      Alert.alert('오류', '로그인 URL을 가져오는 중 오류가 발생했습니다.');
    }
  };

  const handleLoginSuccess = async (userData: any) => {
    try {
      console.log('[LoginScreen] Login success payload:', userData);
      console.log('[LoginScreen] Current provider state:', currentProvider);
      console.log('[LoginScreen] Login provider from userData:', userData?.provider);
    } catch {}
    
    // provider 우선순위: 전달된 userData.provider -> state.currentProvider -> 'unknown'
    let finalProvider = userData?.provider || currentProvider || 'unknown';
    console.log('[LoginScreen] Final provider 결정:', finalProvider);
    
    // provider 상태 업데이트
    if (finalProvider !== currentProvider) {
      setCurrentProvider(finalProvider);
      console.log('[LoginScreen] Provider state updated to:', finalProvider);
    }
    
    // 토큰 저장 (구글 딥링크 플로우 포함)
    const access = userData?.accessToken;
    if (access) {
      try {
        console.log('[LoginScreen] Saving access token (prefix):', access.slice(0, 12) + '...');
        await authService.saveTokens({ access, refresh: '' });
        console.log('[LoginScreen] saveTokens() success');
        
        // 저장된 토큰 검증
        const storedAccess = await authService.getAccessToken();
        console.log('[LoginScreen][Verify] retrieved access prefix:', storedAccess?.slice(0, 12) + '...');
        
        // 사용자 정보 생성 및 저장
        console.log('[LoginScreen] Creating user profile for provider:', finalProvider);
        
        // JWT 토큰에서 사용자 ID 추출
        let userId = 0;
        try {
          const tokenParts = access.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            userId = payload.user_id || 0;
            console.log('[LoginScreen] JWT에서 추출된 user_id:', userId);
          }
        } catch (error) {
          console.error('[LoginScreen] JWT 파싱 실패:', error);
        }
        
        // 백엔드에서 실제 사용자 정보 가져오기
        const user = await fetchUserFromBackend(userId, access);
        if (user) {
          // 사용자 정보 저장
          await authService.saveUser(user);
          console.log('[LoginScreen] 실제 사용자 데이터 저장:', user.nickname);
          // 상태 즉시 업데이트
          setUserProfile(user);
          setIsLoggedIn(true);
          console.log('[LoginScreen] Login state updated - isLoggedIn:', true, 'userProfile:', user.nickname);
          
          // 로그인 상태 재확인
          const isLoggedIn = await authService.isLoggedIn();
          console.log('[LoginScreen] Final authService.isLoggedIn() 확인:', isLoggedIn);
        } else {
          console.warn('[LoginScreen] 실제 사용자 정보를 가져오지 못했습니다.');
          // 모의 사용자 정보 사용
          const mockUser = {
            id: userId, // JWT 토큰에서 추출된 실제 user_id
            username: finalProvider === 'google' ? 'Google User' : finalProvider === 'kakao' ? 'Kakao User' : 'Social User',
            nickname: finalProvider === 'google' ? 'Google User' : finalProvider === 'kakao' ? 'Kakao User' : 'Social User',
            useremail: 'user@example.com', // 실제로는 백엔드에서 받아야 함
            age: '',
            gender: '',
          };
          await authService.saveUser(mockUser);
          console.log('[LoginScreen] 모의 사용자 데이터 저장:', mockUser.nickname);
          setUserProfile(mockUser);
          setIsLoggedIn(true);
          console.log('[LoginScreen] Login state updated - isLoggedIn:', true, 'userProfile:', mockUser.nickname);
        }
      } catch (e) {
        console.error('[LoginScreen] saveTokens() failed:', e);
      }
    } else {
      console.warn('[LoginScreen] No access token provided in success payload');
    }
    setShowWebView(false);
    Alert.alert(
      '로그인 성공',
      `${finalProvider === 'google' ? '구글' : finalProvider === 'kakao' ? '카카오' : '소셜'} 로그인이 완료되었습니다!`,
      [
        {
          text: '확인',
          onPress: () => {
            // 프로필 화면으로 이동하지 않고 현재 화면에서 프로필 표시
            console.log('[LoginScreen] Showing profile after login');
            // 로그인 상태를 다시 한 번 확인하여 UI 업데이트
            checkLoginStatus();
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

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsLoggedIn(false);
      setUserProfile(null);
      Alert.alert('로그아웃', '로그아웃되었습니다.');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
    }
  };

  // 로그인된 상태일 때 프로필 화면 표시
  if (isLoggedIn && userProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>TimeTravel</Text>
          <Text style={styles.subtitle}>내 프로필</Text>
        </View>
        
        <View style={styles.profileContainer}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {userProfile.nickname?.charAt(0) || userProfile.username?.charAt(0) || 'U'}
              </Text>
            </View>
            <Text style={styles.profileTitle}>{userProfile.nickname || userProfile.username || '사용자'}</Text>
            <Text style={styles.profileSubtitle}>{userProfile.useremail || '이메일 미설정'}</Text>
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
                <Text style={styles.profileButtonText}>프로필 수정</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.profileButton, styles.homeButton]}
              onPress={() => navigation.navigate('MainTabs')}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.profileButtonText}>홈으로 이동</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.profileButton, styles.logoutButton]}
              onPress={handleLogout}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.profileButtonText}>로그아웃</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 로그인되지 않은 상태일 때 로그인 화면 표시
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>TimeTravel</Text>
        <Text style={styles.subtitle}>소셜 로그인으로 시작하세요</Text>
      </View>
      
      <View style={styles.loginContainer}>
        <TouchableOpacity
          style={[styles.socialButton, styles.googleButton]}
          onPress={() => handleSocialLogin('google')}
        >
          <View style={styles.buttonContent}>
            <View style={styles.buttonIcon}>
              <Text style={styles.iconText}>G</Text>
            </View>
            <Text style={styles.buttonText}>Google로 로그인</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.socialButton, styles.kakaoButton]}
          onPress={() => handleSocialLogin('kakao')}
        >
          <View style={styles.buttonContent}>
            <View style={styles.buttonIcon}>
              <Text style={styles.iconText}>K</Text>
            </View>
            <Text style={styles.buttonText}>Kakao로 로그인</Text>
          </View>
        </TouchableOpacity>
      </View>


      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="pageSheet"
      >
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
    backgroundColor: '#fff',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  loginContainer: {
    width: '100%',
    marginBottom: 30,
  },
  // 기존 스타일 제거
  footerContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  socialButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
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
  googleButton: {
    backgroundColor: '#4285F4',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  iconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  buttonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  // 로딩 관련 스타일
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  // 프로필 관련 스타일
  profileContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
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
    elevation: 6,
  },
  profileAvatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  profileSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    fontFamily: 'NeoDunggeunmoPro-Regular',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  profileValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  profileActions: {
    gap: 15,
  },
  profileButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  homeButton: {
    backgroundColor: '#34C759',
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
});

export default LoginScreen;