import React, { useEffect, useState } from 'react';
import { Text, Image, View, Dimensions, Alert, StyleSheet, TouchableOpacity, Modal, Linking, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { OAUTH_URLS } from '../../config/apiKeys';
import authService from '../../services/authService';
import SocialLoginWebView from './SocialLoginWebView';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, WARNING, TEXT_STYLES } from '../../styles/fonts';
import { BACKEND_API } from '../../config/apiKeys';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation, route }: any) => {
  const [showWebView, setShowWebView] = useState<boolean>(false);
  const [licenseModalVisible, setLicenseModalVisible] = useState<boolean>(false);
  const [loginProvider, setLoginProvider] = useState<'google' | 'kakao'>('google');
  const [loginUrl, setLoginUrl] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentProvider, setCurrentProvider] = useState<'google' | 'kakao' | 'unknown'>('unknown');
  const [loginHandled, setLoginHandled] = useState(false); // 중복 Alert 방지 플래그
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const APP_LOGIN_SUCCESS_SCHEME = 'timetravelapp://login-success';

  const loadUserProfile = async () => {
    console.log('[LoginScreen] loadUserProfile 함수 시작');
    try {
      setIsLoading(true);
      console.log('[LoginScreen] isLoading을 true로 설정');
      
      const tokens = await authService.getTokens();
      console.log('[LoginScreen] 토큰 가져오기 완료:', !!tokens?.access);
      if (!tokens?.access) {
        console.log('[LoginScreen] 로그인되지 않음 - 토큰 없음');
        setIsLoggedIn(false);
        setUserProfile(null);
        return;
      }

      const user = await authService.getUser();
      console.log('[LoginScreen] 사용자 정보 가져오기 완료:', !!user, user?.id);
      if (!user) {
        console.log('[LoginScreen] 사용자 정보 없음');
        setIsLoggedIn(false);
        setUserProfile(null);
        return;
      }

      if (user.id) {
        try {
          const apiUrl = `${BACKEND_API.BASE_URL}/v1/users/profile/${user.id}/`;
          console.log('[LoginScreen] API 요청 URL:', apiUrl);
          console.log('[LoginScreen] BACKEND_API.BASE_URL:', BACKEND_API.BASE_URL);
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${tokens.access}`,
            },
          });

          console.log('[LoginScreen] API 응답 상태:', response.status, response.statusText);
          console.log('[LoginScreen] API 응답 헤더:', Object.fromEntries(response.headers.entries()));

          if (response.ok) {
            const backendUser = await response.json();
            console.log('[LoginScreen] 백엔드 사용자 정보 받기 완료:', backendUser.nickname);
            setUserProfile(backendUser);
            setIsLoggedIn(true);
            await authService.saveUser(backendUser);
            console.log('[LoginScreen] 사용자 정보 저장 완료');
          } else if (response.status === 401) {
            console.log('[LoginScreen] 토큰 만료 또는 유효하지 않음');
            setIsLoggedIn(false);
            setUserProfile(null);
            await authService.logout(); // Local logout on 401
            return;
          } else if (response.status === 404) {
            console.log('[LoginScreen] 사용자가 백엔드에 존재하지 않음');
            setIsLoggedIn(false);
            setUserProfile(null);
            await authService.logout(); // Local logout on 404
            return;
          } else {
            console.log('[LoginScreen] 백엔드 호출 실패, 로그인 상태로 간주하지 않음');
            setIsLoggedIn(false);
            setUserProfile(null);
            return;
          }
        } catch (error) {
          console.error('백엔드 프로필 로드 실패:', error);
          console.error('에러 상세:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack
          });
          setIsLoggedIn(false);
          setUserProfile(null);
          return;
        }
      } else {
        console.log('[LoginScreen] 사용자 ID 없음');
        setIsLoggedIn(false);
        setUserProfile(null);
        return;
      }
    } catch (error) {
      console.error('프로필 로드 실패:', error);
      setIsLoggedIn(false);
      setUserProfile(null);
      return;
    } finally {
      console.log('[LoginScreen] loadUserProfile 함수 완료, isLoading을 false로 설정');
      setIsLoading(false);
    }
  };

  const checkLoginStatus = async () => {
    try {
      const tokens = await authService.getTokens();
      const user = await authService.getUser();

      if (tokens?.access && user?.id) {
        // 백엔드에서 최신 프로필 정보 가져오기
        const latestUser = await fetchUserFromBackend(user.id, tokens.access);
        if (latestUser) {
          // 최신 정보로 로컬 저장소 업데이트
          await authService.saveUser(latestUser);
          setUserProfile(latestUser);
        } else {
          // 백엔드에서 가져오기 실패 시 로컬 정보 사용
          setUserProfile(user);
        }
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('[LoginScreen] 로그인 상태 확인 실패:', error);
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
    checkLoginStatus();
  }, []);

  // 화면이 포커스될 때마다 프로필 정보 새로고침
  useFocusEffect(
    React.useCallback(() => {
      checkLoginStatus();
    }, [])
  );

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
        
        // 프로필 완성도 확인
        const isProfileComplete = await checkProfileCompletion(userId);
        if (!isProfileComplete) {
          setShowWebView(false);
          navigation.navigate('ProfileSetup');
          return;
        }
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
        
        // 프로필 완성도 확인
        const isProfileComplete = await checkProfileCompletion(userId);
        if (!isProfileComplete) {
          setShowWebView(false);
          navigation.navigate('ProfileSetup');
          return;
        }
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      console.log('[LoginScreen] 로그아웃 완료');
      
      // 로그인 상태 즉시 false로 설정
      setIsLoggedIn(false);
      setUserProfile(null);
      setLoginHandled(false); // 로그인 핸들러 상태 초기화
      
      // 로그인 화면 표시
      console.log('[LoginScreen] 로그인 화면 표시');
      
    } catch (error) {
      console.error('[LoginScreen] 로그아웃 실패:', error);
      Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
    }
  };

  // AsyncStorage 완전 정리 함수
  const clearAllData = async () => {
    try {
      await authService.logout();
      setIsLoggedIn(false);
      setUserProfile(null);
      Alert.alert('데이터 정리 완료', '모든 로그인 정보가 삭제되었습니다.');
    } catch (error) {
      console.error('데이터 정리 실패:', error);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('ProfileSetup');
  };

  const handleDeleteAccount = async () => {
    if (!userProfile?.id) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }

    Alert.alert(
      '회원 탈퇴',
      '정말로 회원 탈퇴를 하시겠습니까?\n\n탈퇴 시 갤러리를 포함한 모든 데이터가 삭제되며 복구할 수 없습니다.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            try {
              const tokens = await authService.getTokens();
              if (!tokens?.access) {
                Alert.alert('오류', '로그인이 필요합니다.');
                return;
              }

              console.log('[LoginScreen] 회원 탈퇴 시작:', userProfile.id);
              
              const response = await fetch(`${BACKEND_API.BASE_URL}/v1/users/profile/${userProfile.id}/delete/`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${tokens.access}`,
                },
              });

              if (response.ok) {
                console.log('[LoginScreen] 회원 탈퇴 성공');
                
                // 로컬 데이터 완전 정리
                await authService.logout();
                setIsLoggedIn(false);
                setUserProfile(null);
                setLoginHandled(false); // 로그인 핸들러 상태 초기화
                
                Alert.alert(
                  '회원 탈퇴 완료',
                  '회원 탈퇴가 완료되었습니다.\n이용해 주셔서 감사합니다.',
                  [{ text: '확인' }]
                );
              } else {
                const errorText = await response.text();
                console.error('[LoginScreen] 회원 탈퇴 실패:', response.status, errorText);
                Alert.alert('오류', '회원 탈퇴 중 문제가 발생했습니다.');
              }
            } catch (error) {
              console.error('[LoginScreen] 회원 탈퇴 오류:', error);
              Alert.alert('오류', '회원 탈퇴 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  if (isLoggedIn && userProfile) {
    return (
	  <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
		  <ScrollView contentContainerStyle={styles.scrollContainer}>
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
	              style={[styles.profileButton, styles.licenseButton]}
	              onPress={() => setLicenseModalVisible(true)}
	            >
	              <View style={styles.buttonContent}>
	                <Text style={[styles.profileButtonText, styles.editButtonText]}>라이센스 확인</Text>
	              </View>
	            </TouchableOpacity>

	            <TouchableOpacity
	              style={[styles.profileButton, styles.logoutButton]}
	              onPress={ () => {
	                  Alert.alert(
	                    "알림",
	                    "로그아웃 하시겠습니까?",
	                    [
	                      {
	                        text: "돌아가기", // 취소 버튼
	                        style: "cancel",
	                      },
	                      {
	                        text: "로그아웃", // 실행 버튼
	                        style: "destructive", // iOS에서 빨간색 표시
	                        onPress: () => handleLogout(),
	                      },
	                    ]
	                  )
	                }
	              }
	            >
	              <View style={styles.buttonContent}>
	                <Text style={[styles.profileButtonText, styles.logoutButtonText]}>로그아웃</Text>
	              </View>
	            </TouchableOpacity>

	            <TouchableOpacity
	              style={[styles.profileButton, styles.signOutButton]}
	              onPress={handleDeleteAccount}
	            >
	              <View style={styles.buttonContent}>
	                <Text style={[styles.profileButtonText, styles.signOutButtonText]}>회원 탈퇴</Text>
	              </View>
	            </TouchableOpacity>
	          </View>
	          <Modal
	            visible={licenseModalVisible}
	            transparent={true}
	            animationType="fade"
	            onRequestClose={() => setLicenseModalVisible(false)}
	          >
	            <View style={styles.modalOverlay}>
	              <View style={styles.modalContainer}>
	                <View style={styles.modalHeader}>
	                  <Text style={styles.modalTitle}>라이센스</Text>
	                  <TouchableOpacity
	                    onPress={() => setLicenseModalVisible(false)}
	                    style={styles.modalCloseButton}
	                  >
	                    <Text style={styles.modalCloseButtonText}>✕</Text>
	                  </TouchableOpacity>
	                </View>

	                <ScrollView style={styles.modalTextContainer}>
	                  <Text style={styles.modalSubTitle}>자료 출처</Text>
	                  <Text style={styles.modalText}>
	                    • 한국관광공사 TourAPI 국문 관광 정보 서비스
	                  </Text>
	                  <Text style={styles.modalText}>
	                    • 인천문화유산 디지털아카이브
	                  </Text>
	                  <Text style={styles.modalText}>
	                    • 카카오맵 API
	                  </Text>
	                  <Text style={styles.modalSubTitle}> </Text>
	                  <Text style={styles.modalSubTitle}>글꼴 라이센스</Text>

	                  <Text style={styles.modalText}>
	                    Copyright © 2017-2024, Eunbin Jeong (Dalgona.) (project-neodgm@dalgona.dev)
	                    with reserved font name "Neo둥근모 Pro" and "NeoDunggeunmo Pro".
	                  </Text>
	                  <Text style={styles.modalDescription}>
	                  Copyright (c) 2022, Eunbin Jeong (Dalgona.) (project-neodgm@dalgona.dev),
	                  with Reserved Font Name NeoDunggeunmo Pro.

	                  This Font Software is licensed under the SIL Open Font License, Version 1.1.
	                  This license is copied below, and is also available with a FAQ at:
	                  http://scripts.sil.org/OFL


	                  -----------------------------------------------------------
	                  SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
	                  -----------------------------------------------------------

	                  PREAMBLE
	                  The goals of the Open Font License (OFL) are to stimulate worldwide
	                  development of collaborative font projects, to support the font creation
	                  efforts of academic and linguistic communities, and to provide a free and
	                  open framework in which fonts may be shared and improved in partnership
	                  with others.

	                  The OFL allows the licensed fonts to be used, studied, modified and
	                  redistributed freely as long as they are not sold by themselves. The
	                  fonts, including any derivative works, can be bundled, embedded,
	                  redistributed and/or sold with any software provided that any reserved
	                  names are not used by derivative works. The fonts and derivatives,
	                  however, cannot be released under any other type of license. The
	                  requirement for fonts to remain under this license does not apply
	                  to any document created using the fonts or their derivatives.

	                  DEFINITIONS
	                  "Font Software" refers to the set of files released by the Copyright
	                  Holder(s) under this license and clearly marked as such. This may
	                  include source files, build scripts and documentation.

	                  "Reserved Font Name" refers to any names specified as such after the
	                  copyright statement(s).

	                  "Original Version" refers to the collection of Font Software components as
	                  distributed by the Copyright Holder(s).

	                  "Modified Version" refers to any derivative made by adding to, deleting,
	                  or substituting -- in part or in whole -- any of the components of the
	                  Original Version, by changing formats or by porting the Font Software to a
	                  new environment.

	                  "Author" refers to any designer, engineer, programmer, technical
	                  writer or other person who contributed to the Font Software.

	                  PERMISSION & CONDITIONS
	                  Permission is hereby granted, free of charge, to any person obtaining
	                  a copy of the Font Software, to use, study, copy, merge, embed, modify,
	                  redistribute, and sell modified and unmodified copies of the Font
	                  Software, subject to the following conditions:

	                  1) Neither the Font Software nor any of its individual components,
	                  in Original or Modified Versions, may be sold by itself.

	                  2) Original or Modified Versions of the Font Software may be bundled,
	                  redistributed and/or sold with any software, provided that each copy
	                  contains the above copyright notice and this license. These can be
	                  included either as stand-alone text files, human-readable headers or
	                  in the appropriate machine-readable metadata fields within text or
	                  binary files as long as those fields can be easily viewed by the user.

	                  3) No Modified Version of the Font Software may use the Reserved Font
	                  Name(s) unless explicit written permission is granted by the corresponding
	                  Copyright Holder. This restriction only applies to the primary font name as
	                  presented to the users.

	                  4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
	                  Software shall not be used to promote, endorse or advertise any
	                  Modified Version, except to acknowledge the contribution(s) of the
	                  Copyright Holder(s) and the Author(s) or with their explicit written
	                  permission.

	                  5) The Font Software, modified or unmodified, in part or in whole,
	                  must be distributed entirely under this license, and must not be
	                  distributed under any other license. The requirement for fonts to
	                  remain under this license does not apply to any document created
	                  using the Font Software.

	                  TERMINATION
	                  This license becomes null and void if any of the above conditions are
	                  not met.

	                  DISCLAIMER
	                  THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
	                  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
	                  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
	                  OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
	                  COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
	                  INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
	                  DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
	                  FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
	                  OTHER DEALINGS IN THE FONT SOFTWARE.
	                  {'\n'}
	                  {'\n'}
	                  {'\n'}
	                  {'\n'}

	                  </Text>
	                </ScrollView>
	              </View>
	            </View>
	          </Modal>
	        </View>
	      </View>
      </ScrollView>
    </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>인천 타임머신</Text>
        <Text style={styles.subtitle}>소셜 로그인으로 시작하세요</Text>
      </View>

      <View style={styles.loginContainer}>
        <TouchableOpacity onPress={() => handleSocialLogin('kakao')} style={styles.socialLoginButton}>
          <Image source={require('../../assets/images/kakao_login_medium_wide.png')} style={styles.kakaoButton} />
        </TouchableOpacity>
      </View>
      <View style={styles.loginContainer}>
        <TouchableOpacity onPress={() => handleSocialLogin('google')} style={styles.socialLoginButton}>
          <Image source={require('../../assets/images/android_light_sq_ctn.png')} style={styles.googleButton} />
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
  safeArea: {
    flex: 1, // SafeAreaView가 화면 전체를 차지하도록 설정
  },
  container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		backgroundColor: '#fff',
		overflow: 'scroll'
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
		marginBottom: 30
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
		resizeMode: 'contain'
	},
  kakaoButton: {
		width: 240,
		height: 50,
		resizeMode: 'stretch'
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
    padding: 8,
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
   buttonContent: {
     alignItems: 'center',
   },
   editButton: {
    backgroundColor: INCHEON_BLUE_LIGHT,
   },
  licenseButton: {
    backgroundColor: INCHEON_BLUE_LIGHT,
   },
   logoutButton: {
     backgroundColor: '#FFE3E3',
   },
   signOutButton: {
     backgroundColor: '#FFE3E3',
   },
   profileButtonText: {
		...TEXT_STYLES.button,
   },
   editButtonText: {
     color: INCHEON_BLUE,
   },
   logoutButtonText: {
     color: WARNING,
   },
	signOutButtonText: {
     color: WARNING,
	},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width - 20,
    height: height - 100,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginVertical: 30,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  modalTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE
  },
  modalCloseButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    ...TEXT_STYLES.body,
  },
  modalTextContainer: {
    padding: 16,
    flex: 1,
    gap: 8,

  },
  modalSubTitle: {
    ...TEXT_STYLES.heading,
   },
  modalText: {
    ...TEXT_STYLES.body
  },
  modalDescription: {
    ...TEXT_STYLES.small,
  }

});

export default LoginScreen;