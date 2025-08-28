import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY } from '../../styles/fonts';
import { authService } from '../../services/authService';
import LoginScreen from '../Auth/LoginScreen';
import { BACKEND_API } from '../../config/apiKeys';

export default function ProfileScreen({ navigation, route }: any) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        console.log('[ProfileScreen] 로그인되지 않음 - 토큰 없음');
        setIsLoggedIn(false);
        setUserProfile(null);
        return;
      }

      const user = await authService.getUser();
      if (!user) {
        console.log('[ProfileScreen] 사용자 정보 없음');
        setIsLoggedIn(false);
        setUserProfile(null);
        return;
      }

      if (user.id) {
        try {
          const response = await fetch(`${BACKEND_API.BASE_URL}/v1/users/profile/${user.id}/`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${tokens.access}`,
            },
          });

          if (response.ok) {
            const backendUser = await response.json();
            setUserProfile(backendUser);
            setIsLoggedIn(true);
            await authService.saveUser(backendUser);
          } else if (response.status === 401) {
            console.log('[ProfileScreen] 토큰 만료 또는 유효하지 않음');
            setIsLoggedIn(false);
            setUserProfile(null);
            await authService.logout(); // Local logout on 401
            return;
          } else if (response.status === 404) {
            console.log('[ProfileScreen] 사용자가 백엔드에 존재하지 않음');
            setIsLoggedIn(false);
            setUserProfile(null);
            await authService.logout(); // Local logout on 404
            return;
          } else {
            console.log('[ProfileScreen] 백엔드 호출 실패, 로그인 상태로 간주하지 않음');
            setIsLoggedIn(false);
            setUserProfile(null);
            return;
          }
        } catch (error) {
          console.error('백엔드 프로필 로드 실패:', error);
          setIsLoggedIn(false);
          setUserProfile(null);
          return;
        }
      } else {
        console.log('[ProfileScreen] 사용자 ID 없음');
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
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      console.log('[ProfileScreen] 로그아웃 완료');
      
      // 로그인 상태 즉시 false로 설정
      setIsLoggedIn(false);
      setUserProfile(null);
      
      // 로그인 화면 표시 (LoginScreen 컴포넌트가 자동으로 렌더링됨)
      console.log('[ProfileScreen] 로그인 화면 표시');
      
    } catch (error) {
      console.error('[ProfileScreen] 로그아웃 실패:', error);
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

  // navigation params에서 refresh 파라미터 감지
  useEffect(() => {
    if (route.params?.refresh) {
      console.log('[ProfileScreen] 새로고침 파라미터 감지됨');
      // 프로필 새로고침
      loadUserProfile();
      // 파라미터 초기화 (중복 실행 방지)
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params?.refresh]);

  // 화면이 포커스될 때마다 프로필 새로고침 (로그인된 경우에만)
  useFocusEffect(
    React.useCallback(() => {
      if (isLoggedIn) {
        console.log('[ProfileScreen] 화면 포커스됨 - 프로필 새로고침');
        loadUserProfile();
      }
    }, [isLoggedIn])
  );

  // 컴포넌트 마운트 시 프로필 로드 (초기 로드)
  useEffect(() => {
    loadUserProfile();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>프로필을 불러오는 중...</Text>
      </View>
    );
  }

  // 로그인되지 않은 경우 LoginScreen 표시
  if (!isLoggedIn || !userProfile) {
    return <LoginScreen navigation={navigation} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>내 프로필</Text>
        <Text style={styles.subtitle}>개인 정보를 확인하고 관리하세요</Text>

        {userProfile && (
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userProfile.nickname ? userProfile.nickname.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <Text style={styles.userName}>{userProfile.nickname || '사용자'}</Text>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color={INCHEON_BLUE} />
                <Text style={styles.infoLabel}>닉네임</Text>
                <Text style={styles.infoValue}>{userProfile.nickname || '미설정'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color={INCHEON_BLUE} />
                <Text style={styles.infoLabel}>이메일</Text>
                <Text style={styles.infoValue}>{userProfile.useremail || '미설정'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={INCHEON_BLUE} />
                <Text style={styles.infoLabel}>나이대</Text>
                <Text style={styles.infoValue}>{userProfile.age || '미설정'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="male-female-outline" size={20} color={INCHEON_BLUE} />
                <Text style={styles.infoLabel}>성별</Text>
                <Text style={styles.infoValue}>{userProfile.gender || '미설정'}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={24} color={INCHEON_BLUE} />
            <Text style={styles.actionButtonText}>프로필 편집</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('MainTabs')}>
            <Ionicons name="home-outline" size={24} color={INCHEON_BLUE} />
            <Text style={styles.actionButtonText}>홈으로 이동</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearDataButton} onPress={clearAllData}>
            <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
            <Text style={styles.clearDataButtonText}>모든 데이터 정리</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
            <Text style={styles.logoutButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_GRAY,
  },
  title: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 28,
    marginTop: 40,
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    marginBottom: 30,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: INCHEON_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
  },
  userName: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 24,
    fontWeight: 'bold',
    color: INCHEON_BLUE,
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  infoLabel: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    fontWeight: 'bold',
    color: INCHEON_GRAY,
    marginLeft: 12,
    width: 80,
  },
  infoValue: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  actionSection: {
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_BLUE,
    marginLeft: 12,
    fontWeight: 'bold',
  },
  clearDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  clearDataButtonText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: '#ff6b6b',
    marginLeft: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  logoutButtonText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: '#ff6b6b',
    marginLeft: 12,
    fontWeight: 'bold',
  },
}); 