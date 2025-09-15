import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert, AppState, Modal, ActivityIndicator } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Geolocation from '@react-native-community/geolocation';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES, FONT_STYLES } from '../../styles/fonts';
import authService from '../../services/authService';
import { BACKEND_API } from '../../config/apiKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  setCurrentLocation,
  startLocationBasedMissionDetection,
  refreshMissionData,
  completeSpotVisit,
  getSpotDetail,
  getVisitedSpots
} from '../../data/missions';
import MissionNotification from '../../components/MissionNotification';


const { width, height } = Dimensions.get('window');


export default function HomeScreen({ navigation }: any) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [hasOngoingCourse, setHasOngoingCourse] = useState(false);
  const [ongoingCourses, setOngoingCourses] = useState<any[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(true);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulatedCourses, setSimulatedCourses] = useState<any[]>([]);

  // 미션 관련 상태
  const [currentMission, setCurrentMission] = useState<any>(null);
  const [showMissionNotification, setShowMissionNotification] = useState(false);
  const [currentLocation, setCurrentLocationState] = useState<{ lat: number; lng: number } | null>(null);

  const [currentRouteId, setCurrentRouteId] = useState<number | null>(null);
  const [visitedSpots, setVisitedSpots] = useState<any[]>([]);
  
  // 루트 상세 정보 모달 관련 상태
  const [routeDetailModalVisible, setRouteDetailModalVisible] = useState(false);
  const [selectedRouteDetail, setSelectedRouteDetail] = useState<any>(null);
  const [routeSpotsWithImages, setRouteSpotsWithImages] = useState<any[]>([]);
  
  // 카드 이미지 carousel 관련 상태
  const [cardImageIndices, setCardImageIndices] = useState<{[key: number]: number}>({});
  const carouselIntervalsRef = useRef<{[key: number]: any}>({});

  // 위치 감지 인터벌 참조
  const locationIntervalRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkLoginStatus();
    checkOngoingCourses();
    fetchRecommendedCourses(); // 로그인 여부와 관계없이 추천 코스 로드
    fetchVisitedSpots();

    // 앱 상태 변화 감지
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // 앱이 포그라운드로 돌아올 때
        console.log('[HomeScreen] 앱이 포그라운드로 돌아왔습니다.');
        if (isLoggedIn && currentLocation) {
          startLocationDetection();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // 앱이 백그라운드로 갈 때
        console.log('[HomeScreen] 앱이 백그라운드로 갔습니다.');
        stopLocationDetection();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
      stopLocationDetection();
    };
  }, []);

  // 화면이 포커스될 때마다 로그인 상태 확인
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkLoginStatus();
      checkOngoingCourses();
      fetchRecommendedCourses(); // 로그인 여부와 관계없이 추천 코스 로드
      fetchVisitedSpots();
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

  // 로그인 상태가 변경될 때 추천 코스 다시 로드
  useEffect(() => {
    // 로그인 여부와 관계없이 추천 코스를 로드
    console.log('[HomeScreen] 추천 코스 로드');
    fetchRecommendedCourses();
  }, [isLoggedIn]);

  // 컴포넌트 언마운트 시 모든 carousel 정리
  useEffect(() => {
    return () => {
      Object.values(carouselIntervalsRef.current).forEach(timeout => clearTimeout(timeout));
      carouselIntervalsRef.current = {};
    };
  }, []);

  // 위치 기반 미션 감지 시작
  const startLocationDetection = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }

    // 30초마다 위치 기반 미션 감지 (더 빠른 감지)
    locationIntervalRef.current = setInterval(async () => {
      if (currentLocation && isLoggedIn) {
        try {
          const nearbyMission = await startLocationBasedMissionDetection();
          if (nearbyMission && nearbyMission.id !== currentMission?.id) {
            console.log('[HomeScreen] 새로운 미션 발견:', nearbyMission.location.name);
            setCurrentMission(nearbyMission);
            setShowMissionNotification(true);
          }
        } catch (error) {
          console.error('[HomeScreen] 위치 기반 미션 감지 실패:', error);
        }
      }
    }, 30000); // 30초마다 (더 빠른 감지)

    console.log('[HomeScreen] 위치 기반 미션 감지 시작 (30초 간격)');
  };

  // 위치 기반 미션 감지 중지
  const stopLocationDetection = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
      console.log('[HomeScreen] 위치 기반 미션 감지 중지');
    }
  };

  // 현재 위치 설정 (GPS나 네트워크 기반 위치 서비스에서 가져오기)
  const setUserLocation = async () => {
    try {
      // React Native Geolocation 사용
      Geolocation.getCurrentPosition(
        (position: any) => {
          const { latitude, longitude } = position.coords;
          console.log(`[HomeScreen] GPS 위치 획득: ${latitude}, ${longitude}`);

          setCurrentLocationState({ lat: latitude, lng: longitude });
          
          // 로그인된 상태에서만 missions.ts에 위치 설정
          if (isLoggedIn) {
            setCurrentLocation(latitude, longitude);
            startLocationDetection();
          }
        },
        (error: any) => {
          console.error('[HomeScreen] GPS 위치 획득 실패:', error);

          // GPS 실패시 기본 위치 설정 (인천 근처)
          const defaultLat = 37.4563;
          const defaultLng = 126.7052;
          console.log(`[HomeScreen] 기본 위치 설정: ${defaultLat}, ${defaultLng}`);

          setCurrentLocationState({ lat: defaultLat, lng: defaultLng });
          
          // 로그인된 상태에서만 missions.ts에 위치 설정
          if (isLoggedIn) {
            setCurrentLocation(defaultLat, defaultLng);
          }
        },
        {
          enableHighAccuracy: false, // true → false로 변경하여 배터리 절약
          timeout: 10000, // 15초 → 10초로 단축
          maximumAge: 300000, // 10초 → 5분으로 증가 (캐시된 위치 사용)
        }
      );
    } catch (error) {
      console.error('[HomeScreen] 위치 서비스 초기화 실패:', error);

      // 위치 서비스 실패시 기본 위치 설정
      const defaultLat = 37.4563;
      const defaultLng = 126.7052;
      setCurrentLocationState({ lat: defaultLat, lng: defaultLng });
      
      // 로그인된 상태에서만 missions.ts에 위치 설정
      if (isLoggedIn) {
        setCurrentLocation(defaultLat, defaultLng);
      }
    }
  };

  // 미션 시작 처리
  const handleStartMission = (mission: any) => {
    setShowMissionNotification(false);
    console.log('[HomeScreen] 미션 시작:', mission.location.name);

    // MissionScreen으로 이동
    navigation.navigate('Mission', { mission });
  };

  // 미션 알림 닫기
  const handleCloseMissionNotification = () => {
    setShowMissionNotification(false);
  };

  // 미션 시뮬레이션 버튼 클릭 (개발용 테스트)
  const handleMissionSimulation = async () => {
    console.log('[HomeScreen] 미션 시뮬레이션 시작');
    
    try {
      // 스팟들 조회
      const spotsResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (spotsResponse.ok) {
        const spotsData = await spotsResponse.json();
        console.log('[HomeScreen] 스팟 데이터:', spotsData);
        
        // 부평향교 찾기
        const bupyeongSpot = spotsData.find((spot: any) => 
          spot.name && spot.name.includes('인천내동성공회성당')
        );

        if (bupyeongSpot && bupyeongSpot.past_image_url) {
          const testMission = {
            id: bupyeongSpot.id,
            location: {
              id: bupyeongSpot.id,
              name: bupyeongSpot.name,
              lat: bupyeongSpot.lat || 37.4563,
              lng: bupyeongSpot.lng || 126.7052,
              order: 1,
              radius: 300,
              completed: false,
            },
            historicalPhotos: [{
              id: bupyeongSpot.id,
              title: `${bupyeongSpot.name} 과거 사진`,
              description: `${bupyeongSpot.name}의 과거 모습`,
              imageUrl: bupyeongSpot.past_image_url,
              year: '과거',
              location: bupyeongSpot.address || bupyeongSpot.name || '주소 정보 없음',
            }],
            completed: false,
            routeId: 1, // 테스트용
          };
          
          console.log('[HomeScreen] 부평향교 미션 생성:', testMission);
          setCurrentMission(testMission);
          setShowMissionNotification(true);
        } else {
          Alert.alert('시뮬레이션 오류', '부평향교의 과거사진을 찾을 수 없습니다.');
        }
      } else {
        console.error('[HomeScreen] 스팟 데이터 가져오기 실패:', spotsResponse.status);
        Alert.alert('시뮬레이션 오류', '스팟 데이터를 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('[HomeScreen] 미션 시뮬레이션 오류:', error);
      Alert.alert('시뮬레이션 오류', '미션 시뮬레이션 중 오류가 발생했습니다.');
    }
  };

  // 코스 완료 테스트 - 마지막 스팟 제외하고 모든 스팟 방문 완료 처리
  const handleCompleteAllSpotsExceptLast = async () => {
    try {
      console.log('[HomeScreen] 코스 완료 테스트 시작 - 마지막 스팟 제외하고 모든 스팟 방문 완료');
      
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      // 진행중인 코스가 있는지 확인
      if (!hasOngoingCourse || ongoingCourses.length === 0) {
        Alert.alert('오류', '진행중인 코스가 없습니다.');
        return;
      }

      // 최신 코스 데이터를 다시 가져오기
      console.log('[HomeScreen] 최신 코스 데이터 다시 가져오기...');
      const courseResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/user_routes/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      if (!courseResponse.ok) {
        Alert.alert('오류', '코스 데이터를 가져올 수 없습니다.');
        return;
      }

      const freshData = await courseResponse.json();
      console.log('[HomeScreen] 최신 코스 데이터:', freshData);

      if (!freshData || freshData.length === 0) {
        Alert.alert('오류', '진행중인 코스가 없습니다.');
        return;
      }

      const currentCourse = freshData[0];
      const spots = currentCourse.spots || [];
      
      console.log('[HomeScreen] currentCourse:', currentCourse);
      console.log('[HomeScreen] currentCourse.spots:', spots);
      
      if (spots.length === 0) {
        Alert.alert('오류', '코스에 스팟이 없습니다.');
        return;
      }

      console.log(`[HomeScreen] 현재 코스 스팟 수: ${spots.length}`);
      console.log('[HomeScreen] 스팟 목록:', spots.map((s: any) => ({ id: s.id, title: s.title, completed: !!(s.completed_at || s.unlock_at) })));
      
      // 실제 스팟 데이터 구조 확인을 위한 상세 로그
      console.log('[HomeScreen] 첫 번째 스팟 상세 데이터:', spots[0]);
      console.log('[HomeScreen] 모든 스팟의 키 확인:', spots.map((s: any) => Object.keys(s)));
      
      // 각 스팟의 모든 필드와 값 출력
      spots.forEach((spot: any, index: number) => {
        console.log(`[HomeScreen] 스팟 ${index + 1} (${spot.title}) 모든 필드:`, spot);
        console.log(`[HomeScreen] 스팟 ${index + 1} 모든 키:`, Object.keys(spot));
      });

      // 마지막 스팟을 제외한 모든 스팟 찾기
      const spotsToComplete = spots.slice(0, -1); // 마지막 스팟 제외
      
      console.log(`[HomeScreen] 방문 완료할 스팟 수: ${spotsToComplete.length}`);
      console.log('[HomeScreen] 방문 완료할 스팟들:', spotsToComplete.map((s: any) => ({ id: s.id, title: s.title })));

      // 백엔드 API 대신 프론트엔드에서 unlock_at 시뮬레이션
      console.log('[HomeScreen] 백엔드 API 호출 대신 프론트엔드에서 unlock_at 시뮬레이션 시작');
      setIsSimulationMode(true);
      
      let successCount = 0;
      const currentTime = new Date().toISOString();
      
      for (let i = 0; i < spotsToComplete.length; i++) {
        const spot = spotsToComplete[i];
        console.log(`[HomeScreen] 스팟 ${i + 1}/${spotsToComplete.length} 방문 완료 시뮬레이션: ${spot.title} (ID: ${spot.id})`);
        
        // unlock_at을 현재 시간으로 설정 (시뮬레이션)
        spot.unlock_at = currentTime;
        
        // 스팟의 모든 정보를 유지하면서 unlock_at만 업데이트
        const updatedSpot = {
          ...spot,
          unlock_at: currentTime
        };
        
        console.log(`[HomeScreen] ✅ 스팟 ${spot.title} unlock_at 설정: ${currentTime}`);
        console.log(`[HomeScreen] 스팟 ${spot.title} 전체 정보:`, updatedSpot);
        
        // 원본 배열에서 해당 스팟을 업데이트된 정보로 교체
        const spotIndex = spots.findIndex((s: any) => s.id === spot.id);
        if (spotIndex !== -1) {
          spots[spotIndex] = updatedSpot;
        }
        
        successCount++;
      }
      
      console.log(`[HomeScreen] 방문 완료 처리 결과: ${successCount}/${spotsToComplete.length} 성공`);

      // 시뮬레이션된 데이터를 ongoingCourses 상태에 반영
      const updatedCourses = ongoingCourses.map((course: any) => {
        if (course.route_id === currentCourse.route_id) {
          return {
            ...course,
            spots: spots // 이미 업데이트된 spots 배열 사용
          };
        }
        return course;
      });
      
      setOngoingCourses(updatedCourses);
      setSimulatedCourses(updatedCourses); // 시뮬레이션된 데이터 저장
      
      // AsyncStorage에 시뮬레이션된 데이터 저장
      try {
        await AsyncStorage.setItem('simulatedCourses', JSON.stringify(updatedCourses));
        await AsyncStorage.setItem('isSimulationMode', 'true');
        console.log('[HomeScreen] 시뮬레이션된 데이터 AsyncStorage에 저장 완료');
        console.log('[HomeScreen] 저장된 데이터 확인:', updatedCourses[0]?.spots?.map((s: any) => ({ 
          title: s.title, 
          unlock_at: s.unlock_at, 
          completed_at: s.completed_at 
        })));
      } catch (error) {
        console.error('[HomeScreen] AsyncStorage 저장 오류:', error);
      }
      
      console.log('[HomeScreen] ongoingCourses 상태 업데이트 완료');
      console.log('[HomeScreen] 시뮬레이션된 데이터 저장:', updatedCourses);
      console.log('[HomeScreen] 업데이트된 첫 번째 스팟:', updatedCourses[0]?.spots[0]);

      Alert.alert(
        '테스트 완료', 
        `마지막 스팟을 제외한 ${spotsToComplete.length}개 스팟 중 ${successCount}개 스팟 방문 완료 처리했습니다.\n\n이제 "마지막 스팟 완료" 버튼을 눌러 코스 완료를 테스트해보세요!`,
        [
          {
            text: '확인',
            onPress: () => {
              // 시뮬레이션 중이므로 데이터 새로고침하지 않음
              console.log('[HomeScreen] 시뮬레이션 모드 - 데이터 새로고침 건너뜀');
            }
          }
        ]
      );

    } catch (error) {
      console.error('[HomeScreen] 코스 완료 테스트 오류:', error);
      Alert.alert('오류', '코스 완료 테스트 중 오류가 발생했습니다.');
    }
  };

  // 코스 완료 테스트 - 마지막 스팟 방문 완료 처리
  const handleCompleteLastSpot = async () => {
    try {
      console.log('[HomeScreen] 코스 완료 테스트 시작 - 마지막 스팟 방문 완료');
      
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      // 진행중인 코스가 있는지 확인
      if (!hasOngoingCourse || ongoingCourses.length === 0) {
        Alert.alert('오류', '진행중인 코스가 없습니다.');
        return;
      }

      // 최신 코스 데이터를 다시 가져오기
      console.log('[HomeScreen] 최신 코스 데이터 다시 가져오기...');
      const courseResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/user_routes/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      if (!courseResponse.ok) {
        Alert.alert('오류', '코스 데이터를 가져올 수 없습니다.');
        return;
      }

      const freshData = await courseResponse.json();
      console.log('[HomeScreen] 최신 코스 데이터:', freshData);

      if (!freshData || freshData.length === 0) {
        Alert.alert('오류', '진행중인 코스가 없습니다.');
        return;
      }

      const currentCourse = freshData[0];
      const spots = currentCourse.spots || [];
      
      if (spots.length === 0) {
        Alert.alert('오류', '코스에 스팟이 없습니다.');
        return;
      }

      // 마지막 스팟 찾기
      const lastSpot = spots[spots.length - 1];
      
      console.log(`[HomeScreen] 마지막 스팟: ${lastSpot.title} (ID: ${lastSpot.id})`);
      console.log(`[HomeScreen] 마지막 스팟 현재 상태: completed_at=${lastSpot.completed_at}, unlock_at=${lastSpot.unlock_at}`);

      // 마지막 스팟 방문 완료 시뮬레이션
      console.log(`[HomeScreen] 마지막 스팟 방문 완료 시뮬레이션 시작: ${lastSpot.title}`);
      setIsSimulationMode(true);
      
      const currentTime = new Date().toISOString();
      
      // 마지막 스팟의 모든 정보를 유지하면서 unlock_at만 업데이트
      const updatedLastSpot = {
        ...lastSpot,
        unlock_at: currentTime
      };
      
      // 원본 배열에서 마지막 스팟을 업데이트된 정보로 교체
      spots[spots.length - 1] = updatedLastSpot;
      
      console.log(`[HomeScreen] ✅ 마지막 스팟 ${lastSpot.title} unlock_at 설정: ${currentTime}`);
      console.log(`[HomeScreen] 마지막 스팟 ${lastSpot.title} 전체 정보:`, updatedLastSpot);
      
      // 시뮬레이션된 데이터를 ongoingCourses 상태에 반영
      const updatedCourses = ongoingCourses.map((course: any) => {
        if (course.route_id === currentCourse.route_id) {
          return {
            ...course,
            spots: spots // 이미 업데이트된 spots 배열 사용
          };
        }
        return course;
      });
      
      setOngoingCourses(updatedCourses);
      setSimulatedCourses(updatedCourses); // 시뮬레이션된 데이터 저장
      
      // AsyncStorage에 시뮬레이션된 데이터 저장
      try {
        await AsyncStorage.setItem('simulatedCourses', JSON.stringify(updatedCourses));
        await AsyncStorage.setItem('isSimulationMode', 'true');
        console.log('[HomeScreen] 시뮬레이션된 데이터 AsyncStorage에 저장 완료');
        console.log('[HomeScreen] 저장된 데이터 확인:', updatedCourses[0]?.spots?.map((s: any) => ({ 
          title: s.title, 
          unlock_at: s.unlock_at, 
          completed_at: s.completed_at 
        })));
      } catch (error) {
        console.error('[HomeScreen] AsyncStorage 저장 오류:', error);
      }
      
      console.log('[HomeScreen] ongoingCourses 상태 업데이트 완료');
      console.log('[HomeScreen] 시뮬레이션된 데이터 저장:', updatedCourses);
      console.log('[HomeScreen] 업데이트된 마지막 스팟:', updatedCourses[0]?.spots[updatedCourses[0]?.spots.length - 1]);
      console.log('[HomeScreen] ✅ 마지막 스팟 방문 완료 처리 성공 - 코스 완료!');
      
      Alert.alert(
        '🎉 코스 완료!', 
        `${lastSpot.title} 방문이 완료되었습니다!\n\n이제 TripsScreen에서 "진행 완료" 탭을 확인해보세요.`,
        [
          {
            text: '확인',
            onPress: () => {
              // 시뮬레이션 중이므로 데이터 새로고침하지 않음
              console.log('[HomeScreen] 시뮬레이션 모드 - 데이터 새로고침 건너뜀');
            }
          }
        ]
      );

    } catch (error) {
      console.error('[HomeScreen] 마지막 스팟 방문 완료 처리 오류:', error);
      Alert.alert('오류', '마지막 스팟 방문 완료 처리 중 오류가 발생했습니다.');
    }
  };

  // 방문 완료 처리 (미션이 없는 spot용)
  const handleCompleteVisit = async (mission: any) => {
    try {
      setShowMissionNotification(false);
      console.log('[HomeScreen] 방문 완료 처리 시작:', mission.location.name);

      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      // 현재 진행중인 코스에서 해당 spot의 UserRouteSpot ID 찾기
      const currentCourse = ongoingCourses[0]; // 첫 번째 진행중인 코스
      if (!currentCourse || !currentCourse.spots) {
        Alert.alert('오류', '진행중인 코스 정보를 찾을 수 없습니다.');
        return;
      }

      // 현재 미션 spot과 일치하는 UserRouteSpot 찾기
      const currentSpot = currentCourse.spots.find((spot: any) => spot.id === mission.id);
      if (!currentSpot) {
        Alert.alert('오류', '해당 스팟을 찾을 수 없습니다.');
        return;
      }

      // UserRouteSpot ID를 사용하여 방문 완료 처리
      if (currentSpot.user_route_spot_id && currentSpot.route_spot_id) {
        console.log('[HomeScreen] 🔗 API 호출: PATCH /v1/courses/unlock_route_spot/');
        console.log('[HomeScreen] 📋 요청 데이터:', {
          id: currentSpot.user_route_spot_id
        });
        console.log('[HomeScreen] 📋 요청 헤더: Authorization: Bearer', tokens.access.substring(0, 20) + '...');
        
        const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/unlock_route_spot/${currentSpot.route_spot_id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.access}`,
          },
          body: JSON.stringify({
            id: currentSpot.user_route_spot_id
          }),
        });
        
        console.log('[HomeScreen] ✅ 방문 완료 API 응답:', response.status, response.statusText);

        if (response.ok) {
          console.log('[HomeScreen] 방문 완료 처리 성공');
          Alert.alert('방문 완료!', `${mission.location.name} 방문이 완료되었습니다.`);
          
          // 미션 데이터 새로고침
          await refreshMissionData();
        } else {
          console.error('[HomeScreen] 방문 완료 처리 실패:', response.status);
          Alert.alert('오류', '방문 완료 처리에 실패했습니다.');
        }
      } else {
        console.error('[HomeScreen] UserRouteSpot ID를 찾을 수 없습니다.');
        Alert.alert('오류', '방문 완료 처리에 필요한 정보를 찾을 수 없습니다.');
      }

    } catch (error) {
      console.error('[HomeScreen] 방문 완료 처리 오류:', error);
      Alert.alert('오류', '방문 완료 처리 중 오류가 발생했습니다.');
    }
  };






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

        // 로그인 후 GPS 위치 설정
        setUserLocation();
      } else {
        // 토큰이나 사용자 정보가 없으면 로그아웃된 상태
        setIsLoggedIn(false);
        setUserProfile(null);
        console.log('[HomeScreen] 로그아웃된 상태');
        stopLocationDetection();
      }
    } catch (error) {
      console.error('로그인 상태 확인 실패:', error);
      setIsLoggedIn(false);
      setUserProfile(null);
      stopLocationDetection();
    }
  };

  const checkOngoingCourses = async () => {
    try {
      // 시뮬레이션 모드일 때는 API 호출하지 않음
      if (isSimulationMode) {
        console.log('[HomeScreen] 시뮬레이션 모드 - API 호출 건너뜀');
        return;
      }
      
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

        // API 응답 구조 상세 분석
        if (data.length > 0) {
          console.log('[HomeScreen] 첫 번째 코스 상세:', data[0]);
          if (data[0].spots && data[0].spots.length > 0) {
            console.log('[HomeScreen] 첫 번째 스팟 상세:', data[0].spots[0]);
            console.log('[HomeScreen] 첫 번째 스팟의 모든 키:', Object.keys(data[0].spots[0]));
          }
        }

        // 진행중인 코스만 필터링 (모든 스팟이 완료되지 않은 코스)
        const ongoingCoursesData = data.filter((course: any) => {
          if (!course.spots || course.spots.length === 0) {
            return false; // 스팟이 없으면 진행중이 아님
          }
          
          // 모든 스팟이 완료되었는지 확인 (unlock_at이 있는지)
          const allSpotsCompleted = course.spots.every((spot: any) => spot.unlock_at !== null);
          console.log(`[HomeScreen] 코스 ${course.route_id} 완료 상태 확인:`, {
            totalSpots: course.spots.length,
            completedSpots: course.spots.filter((s: any) => s.unlock_at !== null).length,
            allCompleted: allSpotsCompleted
          });
          
          return !allSpotsCompleted; // 모든 스팟이 완료되지 않은 코스만 진행중으로 간주
        });

        const hasOngoingCourses = ongoingCoursesData.length > 0;
        setHasOngoingCourse(hasOngoingCourses);
        setOngoingCourses(ongoingCoursesData);

        // 첫 번째 진행중인 코스의 route_id를 현재 route_id로 설정
        if (hasOngoingCourses && ongoingCoursesData.length > 0) {
          setCurrentRouteId(ongoingCoursesData[0].route_id);
        } else {
          setCurrentRouteId(null); // 진행중인 코스가 없으면 null로 설정
        }

        console.log('[HomeScreen] 전체 코스 개수:', data.length);
        console.log('[HomeScreen] 진행중인 코스 개수:', ongoingCoursesData.length);
        console.log('[HomeScreen] 진행중인 코스 상세:', ongoingCoursesData);
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

  // 방문 완료된 spot들 조회
  const fetchVisitedSpots = async () => {
    try {
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        setVisitedSpots([]);
        return;
      }

      const visitedSpotsData = await getVisitedSpots(tokens.access);
      setVisitedSpots(visitedSpotsData);
      console.log('[HomeScreen] 방문 완료된 spot들:', visitedSpotsData);
    } catch (error) {
      console.error('[HomeScreen] 방문 완료된 spot들 조회 에러:', error);
      setVisitedSpots([]);
    }
  };

  const fetchRecommendedCourses = async () => {
    try {
      console.log('[HomeScreen] 인기 추천 루트 데이터 가져오기 시작');
      setIsLoadingRecommended(true);

      // 로그인 여부와 관계없이 추천 코스를 가져옴

      // 1. 먼저 spots 데이터를 한 번에 가져오기
      console.log('[HomeScreen] spots 데이터 가져오기 시작...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
      
      const spotsResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      let spotsData: any[] = [];
      if (spotsResponse.ok) {
        spotsData = await spotsResponse.json();
        console.log('[HomeScreen] spots 데이터 가져오기 완료:', spotsData.length, '개');
        console.log('[HomeScreen] spots 데이터 샘플 (처음 3개):', spotsData.slice(0, 3));
        console.log('[HomeScreen] spots ID 목록 (처음 10개):', spotsData.slice(0, 10).map(s => s.id));
      } else {
        console.log('[HomeScreen] spots API 호출 실패:', spotsResponse.status);
      }

      // 2. 인기 루트 데이터 가져오기 (best_routes API 사용)
      console.log('[HomeScreen] 인기 루트 데이터 가져오기 시작...');
      const bestRoutesResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/best/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (bestRoutesResponse.ok) {
        const bestRoutesData = await bestRoutesResponse.json();
        console.log('[HomeScreen] 인기 루트 데이터 가져오기 완료:', bestRoutesData.length, '개');
        console.log('[HomeScreen] 인기 루트 데이터:', bestRoutesData);

        if (Array.isArray(bestRoutesData) && bestRoutesData.length > 0) {
          // 최대 5개까지만 표시
          const limitedRoutes = bestRoutesData.slice(0, 5);

          // 3. 각 루트의 상세 정보를 가져와서 모든 스팟의 이미지 정보 획득
          const formattedCourses = await Promise.all(
            limitedRoutes.map(async (route: any, index: number) => {
              try {
                // route_detail API 호출하여 spots 정보 가져오기
                const detailResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/${route.id}/`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });

                let images: string[] = [];
                if (detailResponse.ok) {
                  const detailData = await detailResponse.json();
                  console.log(`[HomeScreen] 루트 ${route.id} 상세 데이터:`, detailData);
                  
                  // spots 배열에서 모든 스팟의 이미지 가져오기
                  if (detailData.spots && detailData.spots.length > 0) {
                    console.log(`[HomeScreen] 루트 ${route.id}의 스팟들:`, detailData.spots);
                    
                    // 각 스팟의 상세 정보를 개별적으로 가져오기
                    const spotImages = await Promise.all(
                      detailData.spots.map(async (spot: any, spotIndex: number) => {
                        try {
                          console.log(`[HomeScreen] 스팟 ${spot.id} (${spot.title}) 상세 정보 가져오기...`);
                          
                          // 공개 API이므로 인증 토큰 없이 요청
                          const headers: any = {
                            'Content-Type': 'application/json',
                          };
                          
                          console.log(`[HomeScreen] 공개 API로 스팟 ${spot.id} 상세 정보 요청`);
                          
                          const spotDetailResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/${spot.id}/`, {
                            method: 'GET',
                            headers,
                          });
                          
                          if (spotDetailResponse.ok) {
                            const spotDetailData = await spotDetailResponse.json();
                            console.log(`[HomeScreen] 스팟 ${spot.id} 상세 데이터:`, spotDetailData);
                            
                            // first_image가 없거나 null인 경우 기본 이미지 사용
                            const imageUrl = (spotDetailData.first_image && spotDetailData.first_image.trim() !== '') 
                              ? spotDetailData.first_image 
                              : (spotDetailData.past_image_url && spotDetailData.past_image_url.trim() !== '')
                                ? spotDetailData.past_image_url
                                : Image.resolveAssetSource(require('../../assets/images/대동여지도.jpg'))?.uri || '';
                            console.log(`[HomeScreen] 스팟 ${spot.id} 이미지 URL:`, imageUrl);
                            
                            return imageUrl;
                          } else {
                            console.log(`[HomeScreen] 스팟 ${spot.id} 상세 정보 가져오기 실패:`, spotDetailResponse.status);
                            return '';
                          }
                        } catch (error) {
                          // 네트워크 에러는 정상적인 fallback 처리이므로 에러 로그를 조건부로 출력
                          if (error instanceof Error && !error.message.includes('Network request failed')) {
                            console.error(`[HomeScreen] 스팟 ${spot.id} 상세 정보 가져오기 에러:`, error);
                          }
                          return '';
                        }
                      })
                    );
                    
                    images = spotImages.filter((img: string) => img !== ''); // 빈 이미지 제거
                    
                    console.log(`[HomeScreen] 루트 ${route.id} 최종 이미지들:`, images);
                    console.log(`[HomeScreen] 루트 ${route.id} 이미지 개수:`, images.length);
                  }
                }

                return {
            id: route.id || index,
                  title: route.user_region_name || route.title || '알 수 없는 루트',
                  images: images.map(img => img.replace('http://', 'https://')), // HTTPS로 변환
            location: route.user_region_name || '인천',
            price: '$~~~', // 가격 정보 (현재는 고정값)
            locked: false,
                };
              } catch (error) {
                console.error(`[HomeScreen] 루트 ${route.id} 처리 중 오류:`, error);
                return {
                  id: route.id || index,
                  title: route.user_region_name || route.title || '알 수 없는 루트',
                  images: [],
                  location: route.user_region_name || '인천',
                  price: '$~~~',
                  locked: false,
                };
              }
            })
          );

          setRecommendedCourses(formattedCourses);
          console.log('[HomeScreen] 포맷된 인기 추천 루트:', formattedCourses);
        } else {
          console.log('[HomeScreen] 인기 루트가 없음, 일반 루트로 대체');
          // 인기 루트가 없으면 일반 루트로 대체
          await fetchGeneralRoutes(spotsData);
        }
      } else {
        console.log('[HomeScreen] 인기 루트 API 호출 실패:', bestRoutesResponse.status, bestRoutesResponse.statusText);
        // 인기 루트 API 실패 시 일반 루트로 대체
        await fetchGeneralRoutes(spotsData);
      }
    } catch (error) {
      // 네트워크 에러는 정상적인 fallback 처리이므로 에러 로그를 조건부로 출력
      if (error instanceof Error && !error.message.includes('Network request failed')) {
        console.error('[HomeScreen] 추천 루트 가져오기 에러:', error);
      }
      setRecommendedCourses([]);
    } finally {
      setIsLoadingRecommended(false);
    }
  };

  // 일반 루트 가져오기 (인기 루트가 없을 때 대체용)
  const fetchGeneralRoutes = async (spotsData: any[]) => {
    try {
      console.log('[HomeScreen] 일반 루트 데이터 가져오기 시작...');
      setIsLoadingRecommended(true);

      // 로그인 여부와 관계없이 일반 루트를 가져옴
      const routesResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (routesResponse.ok) {
        const routesData = await routesResponse.json();
        console.log('[HomeScreen] 일반 루트 데이터 가져오기 완료:', routesData.length, '개');

        if (Array.isArray(routesData) && routesData.length > 0) {
          const limitedRoutes = routesData.slice(0, 5);
          const formattedCourses = await Promise.all(
            limitedRoutes.map(async (route: any, index: number) => {
              try {
                const detailResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/${route.id}/`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });

                let images: string[] = [];
                if (detailResponse.ok) {
                  const detailData = await detailResponse.json();
                  if (detailData.spots && detailData.spots.length > 0) {
                    console.log(`[HomeScreen] 일반 루트 ${route.id}의 스팟들:`, detailData.spots);
                    
                    // 각 스팟의 상세 정보를 개별적으로 가져오기
                    const spotImages = await Promise.all(
                      detailData.spots.map(async (spot: any, spotIndex: number) => {
                        try {
                          console.log(`[HomeScreen] 일반 루트 스팟 ${spot.id} (${spot.title}) 상세 정보 가져오기...`);
                          
                          // 공개 API이므로 인증 토큰 없이 요청
                          const headers: any = {
                            'Content-Type': 'application/json',
                          };
                          
                          console.log(`[HomeScreen] 공개 API로 일반 루트 스팟 ${spot.id} 상세 정보 요청`);
                          
                          const spotDetailResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/${spot.id}/`, {
                            method: 'GET',
                            headers,
                          });
                          
                          if (spotDetailResponse.ok) {
                            const spotDetailData = await spotDetailResponse.json();
                            console.log(`[HomeScreen] 일반 루트 스팟 ${spot.id} 상세 데이터:`, spotDetailData);
                            
                            // first_image가 없거나 null인 경우 기본 이미지 사용
                            const imageUrl = (spotDetailData.first_image && spotDetailData.first_image.trim() !== '') 
                              ? spotDetailData.first_image 
                              : (spotDetailData.past_image_url && spotDetailData.past_image_url.trim() !== '')
                                ? spotDetailData.past_image_url
                                : Image.resolveAssetSource(require('../../assets/images/대동여지도.jpg'))?.uri || '';
                            console.log(`[HomeScreen] 일반 루트 스팟 ${spot.id} 이미지 URL:`, imageUrl);
                            
                            return imageUrl;
                          } else {
                            console.log(`[HomeScreen] 일반 루트 스팟 ${spot.id} 상세 정보 가져오기 실패:`, spotDetailResponse.status);
                            return '';
                          }
                        } catch (error) {
                          // 네트워크 에러는 정상적인 fallback 처리이므로 에러 로그를 조건부로 출력
                          if (error instanceof Error && !error.message.includes('Network request failed')) {
                            console.error(`[HomeScreen] 일반 루트 스팟 ${spot.id} 상세 정보 가져오기 에러:`, error);
                          }
                          return '';
                        }
                      })
                    );
                    
                    images = spotImages.filter((img: string) => img !== ''); // 빈 이미지 제거
                    
                    console.log(`[HomeScreen] 일반 루트 ${route.id} 최종 이미지들:`, images);
                    console.log(`[HomeScreen] 일반 루트 ${route.id} 이미지 개수:`, images.length);
                  }
                }

                return {
                  id: route.id || index,
                  title: route.user_region_name || route.title || '알 수 없는 루트',
                  images: images.map(img => img.replace('http://', 'https://')),
                  location: route.user_region_name || '인천',
                  price: '$~~~',
                  locked: false,
                };
              } catch (error) {
                console.error(`[HomeScreen] 일반 루트 ${route.id} 처리 중 오류:`, error);
                return {
                  id: route.id || index,
                  title: route.user_region_name || route.title || '알 수 없는 루트',
                  images: [],
                  location: route.user_region_name || '인천',
                  price: '$~~~',
                  locked: false,
                };
              }
            })
          );

          setRecommendedCourses(formattedCourses);
          console.log('[HomeScreen] 포맷된 일반 추천 루트:', formattedCourses);
        } else {
          setRecommendedCourses([]);
        }
      } else {
        setRecommendedCourses([]);
      }
    } catch (error) {
      // 네트워크 에러는 정상적인 fallback 처리이므로 에러 로그를 조건부로 출력
      if (error instanceof Error && !error.message.includes('Network request failed')) {
        console.error('[HomeScreen] 일반 루트 가져오기 에러:', error);
      }
      setRecommendedCourses([]);
    } finally {
      setIsLoadingRecommended(false);
    }
  };

  const handleLoginPress = () => {
    navigation.navigate('Profile'); // Profile 탭으로 이동(로그인 유도)
  };

  const handleCourseRecommendation = () => {
    navigation.navigate('CourseRecommendation');
  };

  const handleContinueCourse = () => {
    Alert.alert('코스 진행', '진행중인 코스로 이동합니다.');
    navigation.navigate('Trips');
  };

  const handleNextDestination = (spot: any) => {
    // MapScreen으로 이동하여 길찾기 (TripsScreen과 동일한 방식)
    navigation.navigate('Map', {
      screen: 'MapMain',
      params: {
        destination: spot.title || spot.name || '알 수 없는 장소',
        destinationLat: spot.lat,
        destinationLng: spot.lng,
      }
    });
  };



  // 단순한 carousel 함수들
  const nextImage = useCallback((courseId: number, totalImages: number) => {
    setCardImageIndices(prev => {
      const current = prev[courseId] || 0;
      const next = (current + 1) % totalImages;
      return { ...prev, [courseId]: next };
    });
  }, []);

  const prevImage = useCallback((courseId: number, totalImages: number) => {
    setCardImageIndices(prev => {
      const current = prev[courseId] || 0;
      const prevIndex = (current - 1 + totalImages) % totalImages;
      return { ...prev, [courseId]: prevIndex };
    });
  }, []);

  const startCarousel = useCallback((courseId: number, totalImages: number) => {
    if (totalImages <= 1) return;
    
    
    // 기존 인터벌 정리
    if (carouselIntervalsRef.current[courseId]) {
      clearTimeout(carouselIntervalsRef.current[courseId]);
    }
    
    // 재귀적 setTimeout 사용
    const scheduleNext = () => {
      nextImage(courseId, totalImages);
      
      // 다음 실행 예약
      const timeoutId = setTimeout(scheduleNext, 3000);
      carouselIntervalsRef.current[courseId] = timeoutId;
    };
    
    // 첫 실행 예약
    const timeoutId = setTimeout(scheduleNext, 3000);
    carouselIntervalsRef.current[courseId] = timeoutId;
  }, [nextImage]);

  const stopCarousel = useCallback((courseId: number) => {
    if (carouselIntervalsRef.current[courseId]) {
      clearTimeout(carouselIntervalsRef.current[courseId]);
      delete carouselIntervalsRef.current[courseId];
    }
  }, []);

  const stopAllCarousels = useCallback(() => {
    Object.values(carouselIntervalsRef.current).forEach(timeout => clearTimeout(timeout));
    carouselIntervalsRef.current = {};
  }, []);

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

        // spots API에서 이미지 정보 가져오기
        const spotsResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        let spotsData: any[] = [];
        if (spotsResponse.ok) {
          spotsData = await spotsResponse.json();
        }

        // 각 spot에 이미지 정보 추가
        const spotsWithImages = routeData.spots.map((spot: any) => {
          const spotData = spotsData.find((s: any) => s.id === spot.id);
          return {
            ...spot,
            first_image: (spotData?.first_image && spotData.first_image.trim() !== '') 
              ? spotData.first_image 
              : Image.resolveAssetSource(require('../../assets/images/대동여지도.jpg'))?.uri || '',
            past_image_url: spotData?.past_image_url || ''
          };
        });

        console.log('[HomeScreen] 모달 데이터 설정:', {
          routeData,
          spotsWithImages: spotsWithImages.length
        });

        setSelectedRouteDetail(routeData);
        setRouteSpotsWithImages(spotsWithImages);
        setRouteDetailModalVisible(true);
        
        console.log('[HomeScreen] 모달 상태 설정 완료');

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
          총 {course.total_spots || course.spots?.length || 0}개 장소 • {course.spots?.length || 0}개 진행 중
        </Text>
      </View>

      <View style={styles.spotsList}>
        {course.spots && course.spots.map((spot: any, index: number) => {
          // 완료된 스팟인지 확인 (completed_at 또는 unlock_at이 있으면 완료)
          const isCompleted = spot.completed_at || spot.unlock_at;
          
          // 다음 목적지인지 확인 (첫 번째 미완료 스팟)
          const isNextDestination = !isCompleted && index === course.spots.findIndex((s: any) => !s.completed_at && !s.unlock_at);
          
          return (
            <View key={spot.id} style={styles.spotItem}>
              <View style={styles.spotOrderContainer}>
                <Text style={styles.spotOrder}>{spot.order || index + 1}</Text>
              </View>
              <View style={styles.spotStatus}>
                {isNextDestination ? (
                  // 현재 목적지: 핀 버튼
                  <TouchableOpacity
                    style={styles.spotInfo}
                    activeOpacity={0.7}
                    onPress={() => handleNextDestination(spot)}
                  >
                    <Text style={styles.spotTitle} numberOfLines={1}>{spot.title || spot.name || '알 수 없는 장소'}</Text>
                    <View style={styles.nextDestinationBtn}>
                      <Text style={styles.nextDestinationText}>📍</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  // 나머지 스팟들: 아이콘 없이 텍스트만
                  <View style={styles.spotInfo}>
                    <Text style={styles.spotTitle} numberOfLines={1}>{spot.title || spot.name || '알 수 없는 장소'}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
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
          <View style={styles.locationContainer}>
            <View style={styles.greetingContainer}>
                <Ionicons name="location" size={16} color={INCHEON_GRAY} />
                <Text style={styles.userName}>{userProfile?.nickname || userProfile?.username || '사용자'}님 안녕하세요</Text>
            </View>
          </View>
      </View>

      <Text style={styles.greetingText}>어디로 떠나볼까요?</Text>

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
    <View style={styles.loginSection}>
      <Text style={styles.topTitle}>어디로 떠나볼까요?</Text>
      <TouchableOpacity style={styles.loginBtn} onPress={handleLoginPress}>
        <Text style={styles.loginBtnText}>로그인으로 여행을 시작해보세요</Text>
      </TouchableOpacity>
    </View>
  );

  // 루트 상세 정보 모달 렌더링
  const renderRouteDetailModal = () => {
    if (!routeDetailModalVisible) {
      return null;
    }

    const route = selectedRouteDetail?.route || {};
    const spots = routeSpotsWithImages || [];

    return (
      <Modal
        visible={routeDetailModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRouteDetailModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            width: width - 30,
            maxHeight: height - 80,
            backgroundColor: '#fff',
            borderRadius: 20,
            margin: 15,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 10,
            },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 20,
          }}>
            {/* 헤더 */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 25,
              paddingVertical: 20,
              backgroundColor: INCHEON_BLUE_LIGHT,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomWidth: 2,
              borderBottomColor: INCHEON_BLUE,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="map" size={20} color={INCHEON_BLUE} style={{ marginRight: 8 }} />
                <Text style={{
                  ...FONT_STYLES.pixel,
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: INCHEON_BLUE,
                }}>
                  코스 상세 정보
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRouteDetailModalVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#fff',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            {/* 내용 */}
            <ScrollView
              style={{ maxHeight: height - 300 }}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View style={{ paddingHorizontal: 25, paddingTop: 20 }}>
                {/* 루트 기본 정보 */}
                <View style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                  borderLeftWidth: 4,
                  borderLeftColor: INCHEON_BLUE,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="location" size={18} color={INCHEON_BLUE} style={{ marginRight: 8 }} />
                    <Text style={{
                      ...FONT_STYLES.pixel,
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      {route.title || '알 수 없는 루트'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="business" size={16} color="#4ECDC4" style={{ marginRight: 8 }} />
                    <Text style={{
                      ...FONT_STYLES.pixel,
                      fontSize: 14,
                      color: '#666'
                    }}>
                      지역: {route.user_region_name || '인천'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="map" size={16} color="#45B7D1" style={{ marginRight: 8 }} />
                    <Text style={{
                      ...FONT_STYLES.pixel,
                      fontSize: 14,
                      color: '#666'
                    }}>
                      총 장소 수: {route.total_spots || spots.length}개
                    </Text>
                  </View>

                  {route.mission_available && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="target" size={16} color="#96CEB4" style={{ marginRight: 8 }} />
                      <Text style={{
                        ...FONT_STYLES.pixel,
                        fontSize: 14,
                        color: '#28a745',
                        fontWeight: '600'
                      }}>
                        미션 가능: 예
                      </Text>
                    </View>
                  )}
                </View>

                {/* 장소 목록 헤더 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  <Ionicons name="list" size={18} color={INCHEON_BLUE} style={{ marginRight: 8 }} />
                  <Text style={{
                    ...FONT_STYLES.pixel,
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    장소 목록
                  </Text>
                </View>

                {spots.length > 0 ? (
                  spots.map((spot: any, index: number) => (
                    <View key={spot.id} style={{
                      marginBottom: 12,
                      backgroundColor: '#fff',
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#e9ecef',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 2,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: INCHEON_BLUE,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                        }}>
                                                  <Text style={{
                          ...FONT_STYLES.pixel,
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </Text>
                        </View>
                        <Text style={{
                          ...FONT_STYLES.pixel,
                          fontSize: 16,
                          fontWeight: 'bold',
                          color: '#333',
                          flex: 1,
                        }}>
                          {spot.title}
                        </Text>
                      </View>
                      {spot.address && (
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginLeft: 36 }}>
                          <Ionicons name="location-outline" size={14} color="#666" style={{ marginRight: 6, marginTop: 2 }} />
                          <Text style={{
                            ...FONT_STYLES.pixel,
                            fontSize: 13,
                            color: '#666',
                            flex: 1,
                            lineHeight: 18,
                          }}>
                            {spot.address}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: 12,
                    padding: 30,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#e9ecef',
                    borderStyle: 'dashed',
                  }}>
                    <Ionicons name="hourglass-outline" size={32} color="#adb5bd" style={{ marginBottom: 10 }} />
                    <Text style={{
                      ...FONT_STYLES.pixel,
                      fontSize: 14,
                      color: '#6c757d',
                      textAlign: 'center'
                    }}>
                      장소 정보를 불러오는 중...
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* 푸터 */}
            <View style={{
              paddingHorizontal: 25,
              paddingVertical: 20,
              backgroundColor: '#f8f9fa',
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
              borderTopWidth: 1,
              borderTopColor: '#e9ecef',
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: INCHEON_BLUE,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  shadowColor: INCHEON_BLUE,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
                onPress={() => setRouteDetailModalVisible(false)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={{
                    ...FONT_STYLES.pixel,
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 'bold',
                  }}>
                    다른 코스 보기
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
  <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        {isLoggedIn && hasOngoingCourse ? (
          <>
            <Text style={styles.sectionTitle}>진행 중인 코스</Text>
            <View style={styles.underline} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ongoingCardScroll}>
              {ongoingCourses.map(renderOngoingCourseCard)}
            </ScrollView>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>코스 생성 예시</Text>
            <View style={styles.underline} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll}>
              {isLoadingRecommended ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={INCHEON_BLUE} />
                  <Text style={styles.loadingText}>추천 코스를 불러오는 중...</Text>
                </View>
              ) : recommendedCourses.length > 0 ? (
                recommendedCourses.map((course, index) => (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.courseCard}
                    onPress={() => handleRouteCardPress(course.id)}
                    activeOpacity={0.7}
                    onLayout={() => {
                      // 모든 카드에서 자동 carousel 시작
                      if (course.images && course.images.length > 1) {
                        startCarousel(course.id, course.images.length);
                      }
                    }}
                  >
                    <View style={styles.imageBox}>



                                            {/* 이미지 Carousel */}
                      {course.images && course.images.length > 0 ? (
                        <View style={styles.cardImageCarousel}>
                                                <TouchableOpacity
                            style={[styles.cardCarouselButton, styles.cardCarouselButtonLeft]}
                            onPress={(e) => {
                              e.stopPropagation();
                              prevImage(course.id, course.images.length);
                            }}
                          >
                            <Ionicons name="chevron-back" size={16} color="#fff" />
                          </TouchableOpacity>

                          <View style={styles.imageContainer}>
                            <Image
                              source={{
                                uri: course.images[cardImageIndices[course.id] || 0]
                              }}
                              style={styles.courseImage}
                              resizeMode="cover"
                            />
                          </View>

                          <TouchableOpacity
                            style={[styles.cardCarouselButton, styles.cardCarouselButtonRight]}
                            onPress={(e) => {
                              e.stopPropagation();
                              nextImage(course.id, course.images.length);
                            }}
                          >
                            <Ionicons name="chevron-forward" size={16} color="#fff" />
                          </TouchableOpacity>

                          {/* 이미지 인디케이터 */}
                          {course.images.length > 1 && (
                            <View style={styles.cardImageIndicator}>
                              <Text style={styles.cardImageIndicatorText}>
                                {(cardImageIndices[course.id] || 0) + 1} / {course.images.length}
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <Ionicons name="image-outline" size={36} color="#bbb" />
                      )}
                    </View>
                    <View style={styles.locationContainer}>
                      <Ionicons name="location-outline" size={14} color={INCHEON_GRAY} />
                      <Text style={styles.locationText} numberOfLines={1}>{course.location || '위치 정보 없음'}</Text>
                    </View>
                    <TouchableOpacity style={styles.startBtn} disabled>
                      <Text style={styles.startBtnText}>살펴보기</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>예시 코스가 없습니다.</Text>
                </View>
              )}
            </ScrollView>
            {isLoggedIn ? renderLoggedInHeader() : renderLoggedOutHeader()}
          </>
        )}

        {/* 미션 시뮬레이션 버튼 (개발용) */}
        <View style={styles.simulationSection}>
          <TouchableOpacity style={styles.simulationBtn} onPress={handleMissionSimulation}>
            <Text style={styles.simulationBtnText}>🎯 미션 시뮬레이션 (개발용)</Text>
          </TouchableOpacity>
        </View>

        {/* 코스 완료 테스트 버튼들 (개발용) */}
        {isLoggedIn && hasOngoingCourse && (
          <View style={styles.courseTestSection}>
            <Text style={styles.courseTestTitle}>코스 완료 테스트</Text>
            <TouchableOpacity 
              style={styles.courseTestBtn} 
              onPress={handleCompleteAllSpotsExceptLast}
            >
              <Text style={styles.courseTestBtnText}>1️⃣ 마지막 스팟 제외하고 모든 스팟 완료</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.courseTestBtn}
              onPress={handleCompleteLastSpot}
            >
              <Text style={styles.courseTestBtnText}>2️⃣ 마지막 스팟 완료 (코스 완료)</Text>
            </TouchableOpacity>
            
            {isSimulationMode && (
              <TouchableOpacity
                style={[styles.courseTestBtn, { backgroundColor: '#ff6b6b' }]}
                onPress={async () => {
                  setIsSimulationMode(false);
                  setSimulatedCourses([]); // 시뮬레이션 데이터 초기화
                  
                  // AsyncStorage 초기화
                  try {
                    await AsyncStorage.removeItem('simulatedCourses');
                    await AsyncStorage.removeItem('isSimulationMode');
                    console.log('[HomeScreen] AsyncStorage 시뮬레이션 데이터 초기화 완료');
                  } catch (error) {
                    console.error('[HomeScreen] AsyncStorage 초기화 오류:', error);
                  }
                  
                  checkOngoingCourses();
                  Alert.alert('시뮬레이션 모드 해제', '실제 데이터로 복원되었습니다.');
                }}
              >
                <Text style={styles.courseTestBtnText}>🔄 시뮬레이션 모드 해제</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* 미션 알림 컴포넌트 */}
      <MissionNotification
        visible={showMissionNotification}
        mission={currentMission}
        onClose={handleCloseMissionNotification}
        onStartMission={handleStartMission}
        onCompleteVisit={handleCompleteVisit}
      />

      {/* 루트 상세 정보 모달 */}
      {renderRouteDetailModal()}

    </View>
  </SafeAreaView>

  );
}


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
    ...TEXT_STYLES.heading,
    marginBottom: 16,
    textAlign: 'center',
  },

  sectionTitle: {
    ...TEXT_STYLES.subtitle,
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 4,
    marginLeft: 8,
  },
underline: {
  height: 3,
  backgroundColor: INCHEON_BLUE,
  width: 170,
  alignSelf: 'center',
  marginBottom: 16,
  borderRadius: 2,
},
  loadingContainer: {
    width: width - 30,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    ...FONT_STYLES.pixel,
    fontSize: 16,
    marginTop: 16,
    color: INCHEON_GRAY,
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
  },
  cardScroll: {
    marginTop: 8,
    paddingLeft: 16,
    paddingRight: 16,
  },
  courseCard: {
    width: width * 0.7,
    backgroundColor: '#fefefe',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 16,
    marginBottom: 32,
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
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  courseImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  // 카드 이미지 carousel 스타일
  cardImageCarousel: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  cardCarouselButton: {
    position: 'absolute',
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  cardCarouselButtonLeft: {
    left: 4,
  },
  cardCarouselButtonRight: {
    right: 4,
  },
  cardImageIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cardImageIndicatorText: {
    ...TEXT_STYLES.small,
    color: '#fff',
    fontSize: 10,
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
  ongoingCardScroll: {
		flex: 1,
    marginTop: 8,
    paddingLeft: 10,
    paddingRight: 16,
  },
  ongoingCourseCard: {
		width: width * 0.9,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginRight: 16,
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  courseHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  ongoingCourseTitle: {
    ...TEXT_STYLES.heading,
    color: INCHEON_GRAY,
    textAlign: 'center',
    marginBottom: 4,
  },
  courseSubtitle: {
    ...TEXT_STYLES.body,
    color: INCHEON_GRAY,
    marginBottom: 8,
  },
  spotsPreview: {
    width: '100%',
    marginBottom: 12,
  },
  spotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  spotOrderGray: {
    ...TEXT_STYLES.body,
    color: INCHEON_GRAY,
    marginRight: 8,
  },
  spotTitleGray: {
    ...TEXT_STYLES.body,
    color: INCHEON_GRAY,
    flex: 1,
  },
  moreSpots: {
    ...TEXT_STYLES.small,
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
    ...TEXT_STYLES.button,
    color: '#fff',
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
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 8,
  },
  greetingContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  userName: {
    ...TEXT_STYLES.subtitle,
    textAlign: 'center',
    padding: 8,
    marginLeft: 6,
  },
  greetingText: {
    ...TEXT_STYLES.heading,
    textAlign: 'center',
    color: INCHEON_GRAY,
    marginTop: 0,
    marginBottom: 15,
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
    ...TEXT_STYLES.button,
    color: '#fff',
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
    ...TEXT_STYLES.button,
    color: '#fff',
  },
  simulationBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
    shadowColor: '#FF6B6B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  simulationBtnText: {
    ...TEXT_STYLES.button,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  simulationSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  courseTestSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#28a745',
    borderStyle: 'dashed',
  },
  courseTestTitle: {
    ...TEXT_STYLES.subtitle,
    color: '#28a745',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  courseTestBtn: {
    backgroundColor: '#28a745',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
    shadowColor: '#28a745',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
    alignItems: 'center',
  },
  courseTestBtnText: {
    ...TEXT_STYLES.button,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
    ...TEXT_STYLES.button,
    color: '#fff',
  },
  spotInfo: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 20,
  },
  spotTitle: {
    ...TEXT_STYLES.heading,
    color: INCHEON_GRAY,
  },
  spotLocation: {
    ...TEXT_STYLES.small,
    color: INCHEON_GRAY,
    marginTop: 2,
  },
  spotStatus: {
    width: '100%',
    alignItems: 'center',
  },
  nextDestinationBtn: {
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  nextDestinationText: {
    ...TEXT_STYLES.button,
  },
  bookmarkIcon: {
    position: 'absolute',
    top: 10,
    left: 10,
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
    ...TEXT_STYLES.small,
    color: '#fff',
    fontWeight: 'bold',
  },
  locationText: {
    ...TEXT_STYLES.small,
    color: INCHEON_GRAY,
    marginLeft: 4,
  },

  // 루트 정보 섹션
  routeInfoSection: {
    marginBottom: 20,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeInfoText: {
    ...TEXT_STYLES.body,
    marginLeft: 8,
  },
  // 이미지 carousel 스타일
  imageCarouselContainer: {
    marginBottom: 20,
  },
  imageCarousel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  carouselButton: {
    position: 'absolute',
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  carouselButtonLeft: {
    left: 10,
  },
  carouselButtonRight: {
    right: 10,
  },
  carouselImage: {
    width: width - 80,
    height: 200,
    borderRadius: 10,
  },
  imageIndicator: {
    alignItems: 'center',
    marginTop: 10,
  },
  imageIndicatorText: {
    ...TEXT_STYLES.small,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#fff',
  },
  currentSpotTitle: {
    ...TEXT_STYLES.heading,
    textAlign: 'center',
    marginTop: 10,
    color: INCHEON_BLUE,
  },
  // 장소 목록 스타일
  spotsListSection: {
    marginBottom: 20,
  },
  spotsListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  spotsListTitle: {
    ...TEXT_STYLES.subtitle,
    marginLeft: 8,
    color: INCHEON_BLUE,
  },
  routeSpotItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  spotNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: INCHEON_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  spotNumberText: {
    ...TEXT_STYLES.button,
    color: '#fff',
    fontWeight: 'bold',
  },
  routeSpotInfo: {
    flex: 1,
  },
  routeSpotTitle: {
    ...TEXT_STYLES.heading,
    marginBottom: 4,
    color: '#333',
  },
  spotAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotAddress: {
    ...TEXT_STYLES.small,
    marginLeft: 4,
    color: INCHEON_GRAY,
  },
  emptySpotsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptySpotsText: {
    ...TEXT_STYLES.body,
    color: INCHEON_GRAY,
    textAlign: 'center',
  },
});