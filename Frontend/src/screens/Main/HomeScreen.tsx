import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY } from '../../styles/fonts';
import authService from '../../services/authService';

const { width } = Dimensions.get('window');

const sampleCourses = [
  {
    id: 1,
    title: '가볍게 인천 한바퀴',
    image: '', // 실제 이미지 경로 또는 URL
    locked: false,
  },
  {
    id: 2,
    title: '먹으면서 즐기는 인천',
    image: '',
    locked: false,
  },
];

// 진행중인 코스 데이터 (임시)
const ongoingCourses: any[] = []; // 빈 배열로 설정하여 진행중인 코스 없음 상태

export default function HomeScreen({ navigation }: any) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [hasOngoingCourse, setHasOngoingCourse] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    checkOngoingCourses();
  }, []);

  // 화면이 포커스될 때마다 로그인 상태 확인
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkLoginStatus();
      checkOngoingCourses();
    });

    return unsubscribe;
  }, [navigation]);

  const checkLoginStatus = async () => {
    try {
      const isUserLoggedIn = await authService.isLoggedIn();
      setIsLoggedIn(isUserLoggedIn);
      
      if (isUserLoggedIn) {
        const user = await authService.getUser();
        setUserProfile(user);
      }
    } catch (error) {
      console.error('로그인 상태 확인 실패:', error);
    }
  };

  const checkOngoingCourses = async () => {
    // TODO: 백엔드에서 진행중인 코스 데이터 가져오기
    // 현재는 임시 데이터 사용
    setHasOngoingCourse(ongoingCourses.length > 0);
  };

  const handleLoginPress = () => {
    navigation.navigate('Profile'); // Profile 탭으로 이동(로그인 유도)
  };

  const handleCourseRecommendation = () => {
    navigation.navigate('CourseRecommendation');
  };

  const handleContinueCourse = () => {
    // TODO: 진행중인 코스로 이동
    Alert.alert('코스 진행', '진행중인 코스로 이동합니다.');
  };

  // 로그인된 상태일 때 상단 섹션
  const renderLoggedInHeader = () => (
    <View style={styles.loggedInHeader}>
      <View style={styles.userInfoSection}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {userProfile?.nickname?.charAt(0) || userProfile?.username?.charAt(0) || 'U'}
          </Text>
        </View>
        <View style={styles.userGreeting}>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color={INCHEON_GRAY} />
            <Text style={styles.userName}>{userProfile?.nickname || userProfile?.username || '사용자'}님 안녕하세요</Text>
          </View>
          <Text style={styles.greetingText}>어디로 떠나볼까요?</Text>
        </View>
      </View>

      {hasOngoingCourse ? (
        <TouchableOpacity style={styles.continueCourseBtn} onPress={handleContinueCourse}>
          <Text style={styles.continueCourseBtnText}>아래 코스를 계속해서 진행해보세요</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.recommendCourseBtn} onPress={handleCourseRecommendation}>
          <Text style={styles.recommendCourseBtnText}>지금 코스를 추천받아 보세요!</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // 로그인되지 않은 상태일 때 상단 섹션
  const renderLoggedOutHeader = () => (
    <View style={styles.topSection}>
      <Text style={styles.topTitle}>어디로 떠나볼까요?</Text>
      <TouchableOpacity style={styles.loginBtn} onPress={handleLoginPress}>
        <Text style={styles.loginBtnText}>로그인으로 여행을 시작해보세요</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {isLoggedIn ? renderLoggedInHeader() : renderLoggedOutHeader()}

        <Text style={styles.sectionTitle}>다른 사람들이 선택한 코스</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll}>
          {sampleCourses.map((course) => (
            <View key={course.id} style={styles.courseCard}>
              <View style={styles.imageBox}>
                <Ionicons name="image-outline" size={36} color="#bbb" />
              </View>
              <Text style={styles.courseTitle} numberOfLines={1}>{course.title}</Text>
              <TouchableOpacity style={styles.startBtn} disabled>
                <Text style={styles.startBtnText}>Start</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const CARD_WIDTH = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 8,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  topTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 20,
    color: INCHEON_GRAY,
    marginBottom: 16,
    textAlign: 'center',
  },
  loginBtn: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginBottom: 8,
    shadowColor: INCHEON_BLUE,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_GRAY,
    marginBottom: 12,
    marginLeft: 8,
    fontWeight: '600',
  },
  cardScroll: {
    paddingLeft: 8,
  },
  courseCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: INCHEON_GRAY,
    marginRight: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  imageBox: {
    width: '100%',
    height: 120,
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  courseTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 15,
    color: INCHEON_GRAY,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  startBtn: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  startBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  // 로그인된 상태 스타일
  loggedInHeader: {
    marginTop: 32,
    marginBottom: 24,
    alignItems: 'center',
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: INCHEON_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: INCHEON_BLUE,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  userAvatarText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  userGreeting: {
    flex: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 18,
    color: INCHEON_GRAY,
    marginLeft: 6,
    fontWeight: '600',
  },
  greetingText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_GRAY,
  },
  continueCourseBtn: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 8,
    shadowColor: INCHEON_BLUE,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueCourseBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  recommendCourseBtn: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 8,
    shadowColor: INCHEON_BLUE,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recommendCourseBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
}); 