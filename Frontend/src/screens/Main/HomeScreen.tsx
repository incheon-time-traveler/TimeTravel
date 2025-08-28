import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY } from '../../styles/fonts';

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <Text style={styles.topTitle}>어디로 떠나볼까요?</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={handleLoginPress}>
            <Text style={styles.loginBtnText}>로그인으로 여행을 시작해보세요</Text>
          </TouchableOpacity>
        </View>

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
  safeArea: {
    flex: 1, // SafeAreaView가 화면 전체를 차지하도록 설정
    backgroundColor: '#f0f0f0', // SafeAreaView 자체의 배경색 (선택 사항)
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  loginSection: {
    flex:1,
    justifyContent: 'center',
    minHeight: 400,
    alignItems: 'center',
  },
  sectionTitle: {
    ...TEXT_STYLES.subtitle,
    marginBottom: 16,
    textAlign: 'center',
  },
  loginTitle: {
    ...TEXT_STYLES.subtitle,
  },
  loginBtn: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 16,
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
    ...TEXT_STYLES.button,
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_GRAY,
    marginBottom: 12,
    marginLeft: 8,
  },
  cardScroll: {
    marginTop: 8,
    paddingLeft: 16,
    paddingRight: 16,
  },
  courseCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fefefe',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    ...TEXT_STYLES.heading,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  startBtn: {
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderColor: '#e0e0e0',
    borderWidth: 0.3,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  startBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: '#fff',
  },
}); 