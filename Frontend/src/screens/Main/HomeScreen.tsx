import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import authService from '../../services/authService';
import { BACKEND_API } from '../../config/apiKeys';


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

export default function HomeScreen({ navigation }: any) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [hasOngoingCourse, setHasOngoingCourse] = useState(false);
  const [ongoingCourses, setOngoingCourses] = useState<any[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);

  useEffect(() => {
    checkLoginStatus();
    checkOngoingCourses();
    fetchRecommendedCourses();
  }, []);

  // 화면이 포커스될 때마다 로그인 상태 확인
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkLoginStatus();
      checkOngoingCourses();
      fetchRecommendedCourses();
    });

    return unsubscribe;
  }, [navigation]);

  // 상태 변화 추적
  useEffect(() => {
    console.log('[HomeScreen] 상태 변화:', {
      isLoggedIn,
      hasOngoingCourse,
      ongoingCoursesLength: ongoingCourses.length,
      userProfile: userProfile?.nickname || userProfile?.username
    });
  }, [isLoggedIn, hasOngoingCourse, ongoingCourses, userProfile]);

  const checkLoginStatus = async () => {
    try {
      // 토큰과 사용자 정보 모두 확인
      const tokens = await authService.getTokens();
      const user = await authService.getUser();
      
      if (tokens?.access && user) {
        // 토큰이 있고 사용자 정보가 있으면 로그인된 상태
        setIsLoggedIn(true);
        setUserProfile(user);
        console.log('[HomeScreen] 로그인된 상태:', user.nickname);
      } else {
        // 토큰이나 사용자 정보가 없으면 로그아웃된 상태
        setIsLoggedIn(false);
        setUserProfile(null);
        console.log('[HomeScreen] 로그아웃된 상태');
      }
    } catch (error) {
      console.error('로그인 상태 확인 실패:', error);
      setIsLoggedIn(false);
      setUserProfile(null);
    }
  };

  const checkOngoingCourses = async () => {
    try {
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        setHasOngoingCourse(false);
        setOngoingCourses([]);
        return;
      }

      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/user_routes/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[HomeScreen] 진행중인 코스 데이터:', data);
        
        // 사용자에게 저장된 코스가 하나라도 있으면 진행중으로 간주
        const hasCourses = Array.isArray(data) && data.length > 0;
        setHasOngoingCourse(hasCourses);
        setOngoingCourses(hasCourses ? data : []);
        
        console.log('[HomeScreen] 진행중 코스 개수:', hasCourses ? data.length : 0);
        console.log('[HomeScreen] 진행중인 코스 상세:', data);
      } else if (response.status === 401) {
        // 토큰 만료 등
        setHasOngoingCourse(false);
        setOngoingCourses([]);
      } else {
        console.log('[HomeScreen] 진행 코스 조회 실패:', response.status, response.statusText);
        setHasOngoingCourse(false);
        setOngoingCourses([]);
      }
    } catch (error) {
      console.error('[HomeScreen] 진행 코스 조회 에러:', error);
      setHasOngoingCourse(false);
      setOngoingCourses([]);
    }
  };

  const fetchRecommendedCourses = async () => {
    try {
      console.log('[HomeScreen] 추천 루트 데이터 가져오기 시작');
      console.log('[HomeScreen] API URL:', `${BACKEND_API.BASE_URL}/v1/routes/`);
      
      // 로그인 상태와 관계없이 기존 DB에 있는 루트를 GET으로 가져오기
      // 백엔드 urls.py의 path('', views.routes, name='routes') 사용
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[HomeScreen] API 응답 상태:', response.status, response.statusText);
      console.log('[HomeScreen] API 응답 헤더:', response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log('[HomeScreen] 기존 루트 데이터:', data);
        console.log('[HomeScreen] 데이터 타입:', typeof data);
        console.log('[HomeScreen] 데이터 길이:', Array.isArray(data) ? data.length : '배열 아님');
        
        if (Array.isArray(data) && data.length > 0) {
          // 최대 5개까지만 표시
          const limitedRoutes = data.slice(0, 5);
          
          // 루트 데이터를 이미지 목업 스타일에 맞게 변환
          const formattedCourses = limitedRoutes.map((route: any, index: number) => ({
            id: route.id || index,
            title: route.title || route.name || '알 수 없는 루트',
            image: '', // 이미지 URL이 있으면 사용, 없으면 빈 문자열
            location: route.user_region_name || '인천',
            price: '$~~~', // 가격 정보 (현재는 고정값)
            locked: false,
          }));
          
          setRecommendedCourses(formattedCourses);
          console.log('[HomeScreen] 포맷된 추천 루트:', formattedCourses);
        } else {
          console.log('[HomeScreen] 기존 루트가 없음, sampleCourses 사용');
          setRecommendedCourses([]);
        }
      } else {
        console.log('[HomeScreen] 기존 루트 API 호출 실패:', response.status, response.statusText);
        // API 호출 실패 시 sampleCourses 사용
        setRecommendedCourses([]);
      }
    } catch (error) {
      console.error('[HomeScreen] 기존 루트 가져오기 에러:', error);
      // 에러 발생 시 sampleCourses 사용
      setRecommendedCourses([]);
    }
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

  const handleNextDestination = (spot: any) => {
    // MapScreen으로 이동하여 길찾기
    navigation.navigate('Map', {
      destination: spot.title || spot.name || '알 수 없는 장소',
      destinationLat: spot.lat,
      destinationLng: spot.lng
    });
  };

  const handleRouteCardPress = async (routeId: number) => {
    try {
      console.log('[HomeScreen] 루트 카드 클릭:', routeId);
      
      // route-detail API 호출
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/${routeId}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const routeData = await response.json();
        console.log('[HomeScreen] 루트 상세 데이터:', routeData);
        
        // 루트 상세 정보를 더 자세하게 표시
        const route = routeData.route;
        const spots = routeData.spots;
        
        let message = `📍 ${route.title}\n`;
        message += `🏙️ 지역: ${route.user_region_name || '인천'}\n`;
        message += `🗺️ 총 장소 수: ${route.total_spots || spots.length}개\n`;
        if (route.mission_available) {
          message += `🎯 미션 가능: 예\n`;
        }
        message += `\n🗺️ 장소 목록:\n`;
        
        spots.forEach((spot: any, index: number) => {
          message += `${index + 1}. ${spot.title}\n`;
          if (spot.address) {
            message += `   📍 ${spot.address}\n`;
          }
        });
        
        Alert.alert(
          '루트 상세 정보',
          message,
          [
            { text: '확인', style: 'default' }
          ]
        );
      } else {
        console.log('[HomeScreen] 루트 상세 조회 실패:', response.status, response.statusText);
        Alert.alert('오류', '루트 정보를 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('[HomeScreen] 루트 상세 조회 에러:', error);
      Alert.alert('오류', '루트 정보 조회 중 오류가 발생했습니다.');
    }
  };

  // 진행중인 코스 카드 렌더링
  const renderOngoingCourseCard = (course: any) => (
    <View key={course.route_id} style={styles.ongoingCourseCard}>
      <View style={styles.courseHeader}>
        <Text style={styles.ongoingCourseTitle} numberOfLines={1}>
          {course.user_region_name || '인천'} 여행 코스
        </Text>
        <Text style={styles.courseSubtitle}>
          총 {course.total_spots || course.spots?.length || 0}개 장소 • {course.spots?.length || 0}개 진행중
        </Text>
      </View>
      
      <View style={styles.spotsList}>
        {course.spots && course.spots.map((spot: any, index: number) => (
          <View key={spot.id} style={styles.spotItem}>
            <View style={styles.spotOrderContainer}>
              <Text style={styles.spotOrder}>{spot.order || index + 1}</Text>
            </View>
            <View style={styles.spotInfo}>
              <Text style={styles.spotTitle} numberOfLines={1}>{spot.title || spot.name || '알 수 없는 장소'}</Text>
              <Text style={styles.spotLocation} numberOfLines={1}>
                {spot.lat && spot.lng ? `${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}` : '위치 정보 없음'}
              </Text>
            </View>
            <View style={styles.spotStatus}>
                             {index === 0 ? (
                 <TouchableOpacity 
                   style={styles.nextDestinationBtn}
                   onPress={() => handleNextDestination(spot)}
                 >
                   <Text style={styles.nextDestinationText}>다음 목적지</Text>
                 </TouchableOpacity>
               ) : (
                <View style={styles.lockedIcon}>
                  <Ionicons name="lock-closed" size={16} color="#FFD700" />
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
      
      <TouchableOpacity style={styles.continueBtn} onPress={handleContinueCourse}>
        <Text style={styles.continueBtnText}>코스 계속하기</Text>
      </TouchableOpacity>
    </View>
  );

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
          <Text style={styles.recommendCourseBtnText}>지금 코스를 추천 받아 보세요!</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // 로그인되지 않은 상태일 때 상단 섹션
  const renderLoggedOutHeader = () => (
    <View style={styles.loginSection}>
      <Text style={styles.topTitle}>어디로 떠나볼까요?</Text>
      <TouchableOpacity style={styles.loginBtn} onPress={handleLoginPress}>
        <Text style={styles.loginBtnText}>로그인으로 여행을 시작해보세요</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        {isLoggedIn && hasOngoingCourse ? (
          <>
            <Text style={styles.sectionTitle}>진행 중인 코스</Text>
            <View style={styles.underline} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll}>
              {ongoingCourses.map(renderOngoingCourseCard)}
            </ScrollView>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>추천 코스</Text>
            <View style={styles.underline} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll}>
                             {recommendedCourses.length > 0 ? (
                 recommendedCourses.map((course) => (
                   <TouchableOpacity 
                     key={course.id} 
                     style={styles.courseCard}
                     onPress={() => handleRouteCardPress(course.id)}
                     activeOpacity={0.7}
                   >
                     <View style={styles.imageBox}>
                       <TouchableOpacity 
                         style={styles.bookmarkIcon}
                         onPress={(e) => {
                           e.stopPropagation();
                           Alert.alert('북마크', '북마크에 루트가 추가되었습니다.');
                         }}
                       >
                         <Ionicons name="bookmark-outline" size={20} color="#fff" />
                       </TouchableOpacity>
                       <View style={styles.priceIndicator}>
                         <Text style={styles.priceText}>$~~~</Text>
                       </View>
                       <Ionicons name="image-outline" size={36} color="#bbb" />
                     </View>
                     <Text style={styles.courseTitle} numberOfLines={1}>{course.title}</Text>
                     <View style={styles.locationContainer}>
                       <Ionicons name="location-outline" size={14} color={INCHEON_GRAY} />
                       <Text style={styles.locationText} numberOfLines={1}>{course.location || '위치 정보 없음'}</Text>
                     </View>
                     <TouchableOpacity style={styles.startBtn} disabled>
                       <Text style={styles.startBtnText}>시작하기</Text>
                     </TouchableOpacity>
                   </TouchableOpacity>
                 ))
               ) : (sampleCourses.map((course) => (
                   <TouchableOpacity 
                     key={course.id} 
                     style={styles.courseCard}
                     onPress={() => handleRouteCardPress(course.id)}
                     activeOpacity={0.7}
                   >
                     <View style={styles.imageBox}>
                       <TouchableOpacity 
                         style={styles.bookmarkIcon}
                         onPress={(e) => {
                           e.stopPropagation();
                           Alert.alert('북마크', '북마크에 루트가 추가되었습니다.');
                         }}
                       >
                         <Ionicons name="bookmark-outline" size={20} color="#fff" />
                       </TouchableOpacity>
                       <View style={styles.priceIndicator}>
                         <Text style={styles.priceText}>$~~~</Text>
                       </View>
                       <Ionicons name="image-outline" size={36} color="#bbb" />
                     </View>
                     <Text style={styles.courseTitle} numberOfLines={1}>{course.title}</Text>
                     <View style={styles.locationContainer}>
                       <Ionicons name="location-outline" size={14} color={INCHEON_GRAY} />
                       <Text style={styles.locationText} numberOfLines={1}>인천</Text>
                     </View>
                     <TouchableOpacity style={styles.startBtn} disabled>
                       <Text style={styles.startBtnText}>시작하기</Text>
                     </TouchableOpacity>
                   </TouchableOpacity>
                 ))
              )}
            </ScrollView>
            {isLoggedIn ? renderLoggedInHeader() : renderLoggedOutHeader()}
          </>
        )}
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
    backgroundColor: '#fff',
    padding: 8,
  },
  loginSection: {
    alignItems: 'center',
    marginTop: 70,
    marginBottom: 24,
  },
  topTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 20,
    color: INCHEON_GRAY,
    marginBottom: 16,
    textAlign: 'center',
  },

  sectionTitle: {
    ...TEXT_STYLES.subtitle,
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 4,
    marginLeft: 8,
  },
underline: {
  height: 3,
  backgroundColor: INCHEON_BLUE,
  width: 120,
  alignSelf: 'center',
  marginBottom: 16,
  borderRadius: 2,
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
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  startBtnText: {
      ...TEXT_STYLES.button,
  },
  // 진행중인 코스 카드 스타일
  ongoingCourseCard: {
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
  courseHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  ongoingCourseTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 18,
    color: INCHEON_GRAY,
    fontWeight: '600',
    textAlign: 'center',
  },
  courseSubtitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
    marginTop: 4,
  },
  spotsPreview: {
    width: '100%',
    marginBottom: 12,
  },
  spotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  spotOrderGray: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_GRAY,
    fontWeight: '600',
    marginRight: 8,
  },
  spotTitleGray: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 15,
    color: INCHEON_GRAY,
    flex: 1,
  },
  moreSpots: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
    marginTop: 4,
  },
  continueBtn: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 10,
    shadowColor: INCHEON_BLUE,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
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
  userInfo: {
    flex: 1,
    marginLeft: 16,
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
  spotsList: {
    width: '100%',
    marginBottom: 12,
  },
  spotOrderContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: INCHEON_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  spotOrder: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  spotInfo: {
    flex: 1,
    marginRight: 12,
  },
  spotTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 15,
    color: INCHEON_GRAY,
    fontWeight: '600',
  },
  spotLocation: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 13,
    color: INCHEON_GRAY,
    marginTop: 2,
  },
  spotStatus: {
    width: 50,
    alignItems: 'center',
  },
  nextDestinationBtn: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  nextDestinationText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  lockedIcon: {
    marginTop: 8,
  },
  bookmarkIcon: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 5,
  },
  priceIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  priceText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  locationText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 12,
    color: INCHEON_GRAY,
    marginLeft: 4,
  },
}); 