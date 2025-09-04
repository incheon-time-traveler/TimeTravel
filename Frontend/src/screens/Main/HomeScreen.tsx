import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert, AppState, Modal } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES, FONT_STYLES } from '../../styles/fonts';
import authService from '../../services/authService';
import { BACKEND_API } from '../../config/apiKeys';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  setCurrentLocation,
  startLocationBasedMissionDetection,
  findMissionByLocation,
  getActiveMissions,
  getCompletedMissions,
  createMissionsFromUserCourse,
  refreshMissionData,
  completeSpotVisit,
  getSpotDetail,
  getVisitedSpots
} from '../../data/missions';
import MissionNotification from '../../components/MissionNotification';


const { width, height } = Dimensions.get('window');

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

  // 위치 감지 인터벌 참조
  const locationIntervalRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkLoginStatus();
    checkOngoingCourses();
    fetchRecommendedCourses();
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
      fetchRecommendedCourses();
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

  // 위치 기반 미션 감지 시작
  const startLocationDetection = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }

    // 60초마다 위치 기반 미션 감지 (10초에서 60초로 변경)
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
    }, 60000); // 60초마다 (10초 → 60초)

    console.log('[HomeScreen] 위치 기반 미션 감지 시작 (60초 간격)');
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
          setCurrentLocation(latitude, longitude); // missions.ts에 위치 설정

          // 로그인된 상태이고 위치가 설정되면 미션 감지 시작
          if (isLoggedIn) {
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
          setCurrentLocation(defaultLat, defaultLng);

          // GPS 실패 시에는 미션 감지를 시작하지 않음 (무한 루프 방지)
          // if (isLoggedIn) {
          //   startLocationDetection();
          // }
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
      setCurrentLocation(defaultLat, defaultLng);

      // 위치 서비스 실패 시에도 미션 감지를 시작하지 않음 (무한 루프 방지)
      // if (isLoggedIn) {
      //   startLocationDetection();
      // }
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

  // 방문 완료 처리 (미션이 없는 spot용)
  const handleCompleteVisit = async (mission: any) => {
    try {
      setShowMissionNotification(false);

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

      // UserRouteSpot ID가 필요하지만, 현재 구조에서는 직접적으로 제공되지 않음
      // 대신 spot ID를 사용하여 방문 완료 처리
      // 실제로는 UserRouteSpot의 ID가 필요하지만, 임시로 spot ID 사용

      // 방문 완료 알림 표시
      Alert.alert('방문 완료!', `${mission.location.name} 방문이 완료되었습니다.`);

      // 미션 데이터 새로고침
      await refreshMissionData();

    } catch (error) {
      console.error('[HomeScreen] 방문 완료 처리 오류:', error);
      Alert.alert('오류', '방문 완료 처리 중 오류가 발생했습니다.');
    }
  };

  // 미션 테스트 시뮬레이션 (에뮬레이터용)
  const simulateMission = async () => {
    try {
      console.log('[HomeScreen] 미션 시뮬레이션 시작');

      // 현재 토큰 가져오기
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      // 먼저 사용자의 진행중인 코스에서 미션 생성 (토큰 전달)
      const missions = await createMissionsFromUserCourse(tokens.access);

      if (missions.length === 0) {
        Alert.alert(
          '미션 없음',
          '진행중인 코스가 없거나 미션 가능한 스팟이 없습니다.\n새로운 코스를 생성해보세요!'
        );
        return;
      }

      // 첫 번째 미션을 현재 미션으로 설정
      const testMission = missions[0];
      console.log('[HomeScreen] 테스트 미션 설정:', testMission.location.name);

      setCurrentMission(testMission);
      setShowMissionNotification(true);

      // 성공 메시지
      Alert.alert(
        '미션 시뮬레이션 성공!',
        `${testMission.location.name} 미션이 발견되었습니다!\n미션 알림을 확인해보세요.`
      );

    } catch (error) {
      console.error('[HomeScreen] 미션 시뮬레이션 실패:', error);
      Alert.alert('오류', '미션 시뮬레이션 중 오류가 발생했습니다.');
    }
  };

  // 미션 상태 확인 (디버깅용)
  const checkMissionStatus = async () => {
    try {
      const activeMissions = getActiveMissions();
      const completedMissions = getCompletedMissions();

      let message = '🎯 미션 상태 확인\n\n';
      message += `📍 현재 위치: ${currentLocation ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : '설정되지 않음'}\n\n`;
      message += `🔄 활성 미션: ${activeMissions.length}개\n`;
      message += `✅ 완료된 미션: ${completedMissions.length}개\n\n`;

      if (activeMissions.length > 0) {
        message += '📋 활성 미션 목록:\n';
        activeMissions.forEach((mission, index) => {
          // 디버깅: 미션 객체 전체 구조 확인
          console.log(`[HomeScreen] 미션 ${index + 1} 전체 데이터:`, mission);
          console.log(`[HomeScreen] 미션 ${index + 1} location:`, mission.location);

          const missionName = mission.location?.name || '이름 없음';
          const missionLat = mission.location?.lat || 0;
          const missionLng = mission.location?.lng || 0;

          message += `${index + 1}. ${missionName} (${missionLat.toFixed(4)}, ${missionLng.toFixed(4)})\n`;
        });
      }

      Alert.alert('미션 상태', message);

    } catch (error) {
      console.error('[HomeScreen] 미션 상태 확인 실패:', error);
      Alert.alert('오류', '미션 상태 확인 중 오류가 발생했습니다.');
    }
  };

  // 스팟 정보 확인 (디버깅용)
  const checkSpotInfo = async () => {
    try {
      console.log('[HomeScreen] 스팟 정보 확인 시작');

      // 로그인 상태 확인 및 토큰 가져오기
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      // /v1/spots/ API 호출하여 전체 스팟 정보 가져오기 (인증 토큰 포함)
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[HomeScreen] 전체 스팟 데이터:', data);

        // past_image_url이 있는 스팟들 필터링
        const spotsWithPastImage = data.filter((spot: any) =>
          spot.past_image_url && spot.past_image_url.trim() !== ''
        );

        // past_image_url이 없는 스팟들
        const spotsWithoutPastImage = data.filter((spot: any) =>
          !spot.past_image_url || spot.past_image_url.trim() === ''
        );

        let message = '🗺️ 스팟 정보 확인\n\n';
        message += `📊 전체 스팟: ${data.length}개\n`;
        message += `🖼️ 과거사진 있는 스팟: ${spotsWithPastImage.length}개\n`;
        message += `❌ 과거사진 없는 스팟: ${spotsWithoutPastImage.length}개\n\n`;

        if (spotsWithPastImage.length > 0) {
          message += '🖼️ 과거사진 있는 스팟들:\n';
          spotsWithPastImage.slice(0, 10).forEach((spot: any, index: number) => {
            message += `${index + 1}. ${spot.name || spot.title || `스팟 ${spot.id}`}\n`;
            message += `   📍 ${spot.address || '주소 없음'}\n`;
            message += `   🖼️ ${spot.past_image_url?.substring(0, 50)}...\n\n`;
          });

          if (spotsWithPastImage.length > 10) {
            message += `... 외 ${spotsWithPastImage.length - 10}개 더\n\n`;
          }
        }

        if (spotsWithoutPastImage.length > 0) {
          message += '❌ 과거사진 없는 스팟들 (샘플):\n';
          spotsWithoutPastImage.slice(0, 5).forEach((spot: any, index: number) => {
            message += `${index + 1}. ${spot.name || spot.title || `스팟 ${spot.id}`}\n`;
            message += `   📍 ${spot.address || '주소 없음'}\n\n`;
          });

          if (spotsWithoutPastImage.length > 5) {
            message += `... 외 ${spotsWithoutPastImage.length - 5}개 더\n\n`;
          }
        }

        Alert.alert('스팟 정보', message);

      } else {
        console.error('[HomeScreen] 스팟 정보 가져오기 실패:', response.status);
        Alert.alert('오류', '스팟 정보를 가져올 수 없습니다.');
      }

    } catch (error) {
      console.error('[HomeScreen] 스팟 정보 확인 실패:', error);
      Alert.alert('오류', '스팟 정보 확인 중 오류가 발생했습니다.');
    }
  };

  // 백엔드 연결 테스트 (상세)
  const testBackendConnection = async () => {
    try {
      console.log('[HomeScreen] 백엔드 연결 테스트 시작');
      console.log('[HomeScreen] 테스트 URL:', `${BACKEND_API.BASE_URL}/v1/photos/`);

      const startTime = Date.now();
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/photos/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const endTime = Date.now();

      console.log('[HomeScreen] 백엔드 연결 테스트 결과:', {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${endTime - startTime}ms`,
        url: `${BACKEND_API.BASE_URL}/v1/photos/`,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        Alert.alert(
          '백엔드 연결 성공! 🎉',
          `상태: ${response.status}\n응답 시간: ${endTime - startTime}ms\nURL: ${BACKEND_API.BASE_URL}/v1/photos/`
        );
      } else {
        Alert.alert(
          '백엔드 연결 실패 ❌',
          `상태: ${response.status} ${response.statusText}\n응답 시간: ${endTime - startTime}ms\nURL: ${BACKEND_API.BASE_URL}/v1/photos/`
        );
      }

    } catch (error) {
      console.error('[HomeScreen] 백엔드 연결 테스트 실패:', error);
      Alert.alert(
        '백엔드 연결 실패 ❌',
        `에러: ${error?.message || '알 수 없는 오류'}\nURL: ${BACKEND_API.BASE_URL}/v1/photos/`
      );
    }
  };

  // 간단한 GET 요청 테스트
  const testSimpleGetRequest = async () => {
    try {
      console.log('[HomeScreen] 간단한 GET 요청 테스트 시작');
      console.log('[HomeScreen] 테스트 URL:', `${BACKEND_API.BASE_URL}/v1/routes/`);

      const startTime = Date.now();
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const endTime = Date.now();

      console.log('[HomeScreen] 간단한 GET 요청 테스트 결과:', {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${endTime - startTime}ms`,
        url: `${BACKEND_API.BASE_URL}/v1/routes/`,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[HomeScreen] 응답 데이터:', data);
        Alert.alert(
          'GET 요청 성공! 🎉',
          `상태: ${response.status}\n응답 시간: ${endTime - startTime}ms\n데이터 개수: ${Array.isArray(data) ? data.length : 'N/A'}`
        );
      } else {
        Alert.alert(
          'GET 요청 실패 ❌',
          `상태: ${response.status} ${response.statusText}\n응답 시간: ${endTime - startTime}ms`
        );
      }

    } catch (error) {
      console.error('[HomeScreen] 간단한 GET 요청 테스트 실패:', error);
      Alert.alert(
        'GET 요청 실패 ❌',
        `에러: ${error?.message || '알 수 없는 오류'}`
      );
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

        // 첫 번째 코스의 route_id를 현재 route_id로 설정
        if (hasCourses && data.length > 0) {
          setCurrentRouteId(data[0].route_id);
        }

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

      // 1. 먼저 spots 데이터를 한 번에 가져오기
      console.log('[HomeScreen] spots 데이터 가져오기 시작...');
      const spotsResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

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
                          
                          // 토큰 가져오기
                          const tokens = await authService.getTokens();
                          const headers: any = {
                            'Content-Type': 'application/json',
                          };
                          
                          if (tokens?.access) {
                            headers['Authorization'] = `Bearer ${tokens.access}`;
                            console.log(`[HomeScreen] 인증 토큰으로 스팟 ${spot.id} 상세 정보 요청`);
                          } else {
                            console.log(`[HomeScreen] 인증 토큰 없이 스팟 ${spot.id} 상세 정보 요청`);
                          }
                          
                          const spotDetailResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/${spot.id}/`, {
                            method: 'GET',
                            headers,
                          });
                          
                          if (spotDetailResponse.ok) {
                            const spotDetailData = await spotDetailResponse.json();
                            console.log(`[HomeScreen] 스팟 ${spot.id} 상세 데이터:`, spotDetailData);
                            
                            const imageUrl = spotDetailData.first_image || spotDetailData.past_image_url || '';
                            console.log(`[HomeScreen] 스팟 ${spot.id} 이미지 URL:`, imageUrl);
                            
                            return imageUrl;
                          } else {
                            console.log(`[HomeScreen] 스팟 ${spot.id} 상세 정보 가져오기 실패:`, spotDetailResponse.status);
                            return '';
                          }
                        } catch (error) {
                          console.error(`[HomeScreen] 스팟 ${spot.id} 상세 정보 가져오기 에러:`, error);
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
      console.error('[HomeScreen] 추천 루트 가져오기 에러:', error);
      setRecommendedCourses([]);
    }
  };

  // 일반 루트 가져오기 (인기 루트가 없을 때 대체용)
  const fetchGeneralRoutes = async (spotsData: any[]) => {
    try {
      console.log('[HomeScreen] 일반 루트 데이터 가져오기 시작...');
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
                          
                          // 토큰 가져오기
                          const tokens = await authService.getTokens();
                          const headers: any = {
                            'Content-Type': 'application/json',
                          };
                          
                          if (tokens?.access) {
                            headers['Authorization'] = `Bearer ${tokens.access}`;
                            console.log(`[HomeScreen] 인증 토큰으로 일반 루트 스팟 ${spot.id} 상세 정보 요청`);
                          } else {
                            console.log(`[HomeScreen] 인증 토큰 없이 일반 루트 스팟 ${spot.id} 상세 정보 요청`);
                          }
                          
                          const spotDetailResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/${spot.id}/`, {
                            method: 'GET',
                            headers,
                          });
                          
                          if (spotDetailResponse.ok) {
                            const spotDetailData = await spotDetailResponse.json();
                            console.log(`[HomeScreen] 일반 루트 스팟 ${spot.id} 상세 데이터:`, spotDetailData);
                            
                            const imageUrl = spotDetailData.first_image || spotDetailData.past_image_url || '';
                            console.log(`[HomeScreen] 일반 루트 스팟 ${spot.id} 이미지 URL:`, imageUrl);
                            
                            return imageUrl;
                          } else {
                            console.log(`[HomeScreen] 일반 루트 스팟 ${spot.id} 상세 정보 가져오기 실패:`, spotDetailResponse.status);
                            return '';
                          }
                        } catch (error) {
                          console.error(`[HomeScreen] 일반 루트 스팟 ${spot.id} 상세 정보 가져오기 에러:`, error);
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
      console.error('[HomeScreen] 일반 루트 가져오기 에러:', error);
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
    Alert.alert('코스 진행', '진행중인 코스로 이동합니다.');
    navigation.navigate('Trips');
  };

  const handleNextDestination = (spot: any) => {
    // MapScreen으로 이동하여 길찾기
    navigation.navigate('Map', {
      destination: spot.title || spot.name || '알 수 없는 장소',
      destinationLat: spot.lat,
      destinationLng: spot.lng
    });
  };

  // 카드 이미지 carousel 관련 함수들
  const nextCardImage = (courseId: number, totalImages: number) => {
    setCardImageIndices(prev => ({
      ...prev,
      [courseId]: ((prev[courseId] || 0) + 1) % totalImages
    }));
  };

  const prevCardImage = (courseId: number, totalImages: number) => {
    setCardImageIndices(prev => ({
      ...prev,
      [courseId]: ((prev[courseId] || 0) - 1 + totalImages) % totalImages
    }));
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
            first_image: spotData?.first_image || '',
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
        {course.spots && course.spots.map((spot: any, index: number) => (
          <View key={spot.id} style={styles.spotItem}>
            <View style={styles.spotOrderContainer}>
              <Text style={styles.spotOrder}>{spot.order || index + 1}</Text>
            </View>
            <View style={styles.spotStatus}>
              {index === 0 ? (
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
                <View style={styles.spotInfo}>
                  <Text style={styles.spotTitle} numberOfLines={1}>{spot.title || spot.name || '알 수 없는 장소'}</Text>
                  <View style={styles.lockedIcon}>
                    <Ionicons name="lock-closed" size={16} color="#FFD700" />
                  </View>
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
        <View style={styles.locationContainer}>
          <View style={styles.greetingContainer}>
              <Ionicons name="location" size={16} color={INCHEON_GRAY} />
              <Text style={styles.userName}>{userProfile?.nickname || userProfile?.username || '사용자'}님 안녕하세요</Text>
          </View>
        </View>
        <Text style={styles.greetingText}>어디로 떠나볼까요?</Text>
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

       {/* 미션 테스트 버튼들 */}
       <View style={styles.missionTestSection}>
         <Text style={styles.missionTestTitle}>🧪 미션 테스트 (에뮬레이터용)</Text>
         <View style={styles.missionTestButtons}>
           <TouchableOpacity style={styles.missionTestBtn} onPress={simulateMission}>
             <Text style={styles.missionTestBtnText}>미션 시뮬레이션</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.missionStatusBtn} onPress={checkMissionStatus}>
             <Text style={styles.missionStatusBtnText}>미션 상태 확인</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.spotInfoBtn} onPress={checkSpotInfo}>
             <Text style={styles.spotInfoBtnText}>스팟 정보 확인</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.backendTestBtn} onPress={testBackendConnection}>
             <Text style={styles.backendTestBtnText}>백엔드 연결 테스트</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.simpleGetBtn} onPress={testSimpleGetRequest}>
             <Text style={styles.simpleGetBtnText}>간단한 GET 요청</Text>
           </TouchableOpacity>
         </View>
       </View>
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
                  루트 상세 정보
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
                    확인
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
            {/* 진행중인 코스가 있어도 미션 테스트 버튼 표시 */}
            {isLoggedIn && (
              <View style={styles.missionTestSection}>
                <Text style={styles.missionTestTitle}>🧪 미션 테스트 (에뮬레이터용)</Text>
                <View style={styles.missionTestButtons}>
                  <TouchableOpacity style={styles.missionTestBtn} onPress={simulateMission}>
                    <Text style={styles.missionTestBtnText}>미션 시뮬레이션</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.missionStatusBtn} onPress={checkMissionStatus}>
                    <Text style={styles.missionStatusBtnText}>미션 상태 확인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.spotInfoBtn} onPress={checkSpotInfo}>
                    <Text style={styles.spotInfoBtnText}>스팟 정보 확인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.backendTestBtn} onPress={testBackendConnection}>
                    <Text style={styles.backendTestBtnText}>백엔드 연결 테스트</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.simpleGetBtn} onPress={testSimpleGetRequest}>
                    <Text style={styles.simpleGetBtnText}>간단한 GET 요청</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>인기 추천 코스</Text>
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


                      
                      {/* 이미지 Carousel */}
                      {course.images && course.images.length > 0 ? (
                        <View style={styles.cardImageCarousel}>
                          <TouchableOpacity 
                            style={[styles.cardCarouselButton, styles.cardCarouselButtonLeft]} 
                            onPress={(e) => {
                              e.stopPropagation();
                              prevCardImage(course.id, course.images.length);
                            }}
                          >
                            <Ionicons name="chevron-back" size={16} color="#fff" />
                          </TouchableOpacity>
                          
                          <Image 
                            source={{ uri: course.images[cardImageIndices[course.id] || 0] }} 
                            style={styles.courseImage}
                            resizeMode="cover"
                          />
                          
                          <TouchableOpacity 
                            style={[styles.cardCarouselButton, styles.cardCarouselButtonRight]} 
                            onPress={(e) => {
                              e.stopPropagation();
                              nextCardImage(course.id, course.images.length);
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
                          Alert.alert('북마크', '북마크에 추가하기 위해선 로그인이 필요해요.');
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
    paddingLeft: 16,
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
    marginLeft: 6,
  },
  greetingText: {
    ...TEXT_STYLES.heading,
    textAlign: 'center',
    color: INCHEON_GRAY,
    marginBottom: 8,
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
  lockedIcon: {
    marginTop: 8,
    marginRight: 24,
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

  // 미션 테스트 버튼 스타일
  missionTestSection: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  missionTestTitle: {
    ...TEXT_STYLES.small,
    marginBottom: 12,
    textAlign: 'center',
  },
  missionTestButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  missionTestBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    shadowColor: '#FF6B6B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  missionTestBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  missionStatusBtn: {
    backgroundColor: '#4ECDC4',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    shadowColor: '#4ECDC4',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  missionStatusBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  spotInfoBtn: {
    backgroundColor: '#9B59B6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    shadowColor: '#9B59B6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  spotInfoBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  backendTestBtn: {
    backgroundColor: '#2ECC71',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    shadowColor: '#2ECC71',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  backendTestBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  simpleGetBtn: {
    backgroundColor: '#3498DB',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    shadowColor: '#3498DB',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  simpleGetBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
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