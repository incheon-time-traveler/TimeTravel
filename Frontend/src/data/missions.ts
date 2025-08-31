import { Mission, MissionLocation, HistoricalPhoto } from '../types/mission';
import { BACKEND_API } from '../config/apiKeys';

// 미션 상태 관리
export interface MissionState {
  activeMissions: Mission[];
  completedMissions: Mission[];
  currentLocation: { lat: number; lng: number } | null;
}

// 백엔드에서 받아올 스팟 데이터 타입
export interface SpotData {
  id: number;
  name?: string;
  description?: string;
  lat: number;
  lng: number;
  address?: string;
  past_image_url?: string;
  is_mission?: boolean;
  spot_full?: {
    id: number;
    title: string;
    lat: number;
    lng: number;
    address?: string;
    past_image_url?: string;
    description?: string;
  };
}

// 백엔드에서 받아올 루트 데이터 타입
export interface RouteData {
  id: number;
  title: string;
  spots: SpotData[];
  mission_available: boolean;
}

// 현재 활성화된 미션들
let activeMissions: Mission[] = [];
let completedMissions: Mission[] = [];
let currentLocation: { lat: number; lng: number } | null = null;

// 사용자의 현재 위치 설정
export const setCurrentLocation = (lat: number, lng: number) => {
  currentLocation = { lat, lng };
  console.log(`[missions] 현재 위치 설정: ${lat}, ${lng}`);
};

// 백엔드에서 사용자의 진행중인 코스 가져오기
export const fetchUserActiveCourse = async (authToken?: string): Promise<RouteData | null> => {
  try {
    // 토큰이 전달되지 않은 경우에만 getAuthToken() 사용
    const token = authToken || await getAuthToken();
    
    if (!token) {
      console.error('[missions] 인증 토큰이 없습니다.');
      return null;
    }

    const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/user_routes/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[missions] 사용자 코스 데이터:', data);
      
      // 진행중인 코스가 있는 경우 첫 번째 코스 반환
      if (data && data.length > 0) {
        return data[0];
      }
    }
    return null;
  } catch (error) {
    console.error('[missions] 사용자 코스 가져오기 실패:', error);
    return null;
  }
};

// 백엔드에서 루트 상세 정보 가져오기
export const fetchRouteDetail = async (routeId: number): Promise<RouteData | null> => {
  try {
    const response = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/${routeId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[missions] 루트 상세 데이터:', data);
      return data;
    }
    return null;
  } catch (error) {
    console.error('[missions] 루트 상세 정보 가져오기 실패:', error);
    return null;
  }
};

// 스팟 데이터를 미션으로 변환
const convertSpotToMission = (spot: any): Mission => {
  // 전체 스팟에서 가져온 데이터 구조 사용
  const spotName = spot.name || spot.title || `스팟 ${spot.id}`;
  const spotLat = spot.lat || spot.latitude;
  const spotLng = spot.lng || spot.longitude;
  const spotAddress = spot.address || '주소 정보 없음';
  const spotPastImageUrl = spot.past_image_url;
  
  // 디버깅: 스팟 데이터 확인
  console.log(`[missions] convertSpotToMission - 스팟 데이터:`, {
    id: spot.id,
    name: spotName,
    lat: spotLat,
    lng: spotLng,
    address: spotAddress,
    past_image_url: spotPastImageUrl
  });
  
  const mission = {
    id: spot.id,
    location: {
      id: spot.id,
      name: spotName,
      lat: spotLat,
      lng: spotLng,
      order: 0, // 기본값
      radius: 100, // 100m 반경
      completed: false,
    },
    historicalPhotos: spotPastImageUrl ? [{
      id: spot.id,
      title: `${spotName} 과거 사진`,
      description: `${spotName}의 과거 모습`,
      imageUrl: spotPastImageUrl,
      year: '과거',
      location: spotAddress,
    }] : [],
    completed: false,
  };
  
  // 디버깅: 생성된 미션 객체 확인
  console.log(`[missions] convertSpotToMission - 생성된 미션:`, mission);
  
  return mission;
};

// 사용자의 진행중인 코스에서 미션 생성
export const createMissionsFromUserCourse = async (authToken?: string): Promise<Mission[]> => {
  try {
    const userCourse = await fetchUserActiveCourse(authToken);
    if (!userCourse) {
      console.log('[missions] 진행중인 코스가 없습니다.');
      return [];
    }

    console.log('[missions] 사용자 코스의 스팟들:', userCourse.spots);
    
    // 다음 목적지 찾기 (첫 번째 스팟이 현재 목적지)
    const nextDestination = userCourse.spots[0];
    if (!nextDestination) {
      console.log('[missions] 다음 목적지가 없습니다.');
      return [];
    }
    
    console.log('[missions] 다음 목적지:', {
      id: nextDestination.id,
      name: (nextDestination as any).title || nextDestination.name,
      lat: nextDestination.lat,
      lng: nextDestination.lng
    });
    
    // 전체 스팟 목록에서 past_image_url이 있는 스팟들 가져오기
    const allSpotsResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    if (!allSpotsResponse.ok) {
      console.error('[missions] 전체 스팟 정보 가져오기 실패:', allSpotsResponse.status);
      return [];
    }
    
    const allSpots = await allSpotsResponse.json();
    console.log('[missions] 전체 스팟 개수:', allSpots.length);
    
    // 다음 목적지의 상세 정보 찾기 (past_image_url 포함)
    const nextDestinationDetail = allSpots.find((spot: any) => spot.id === nextDestination.id);
    
    if (!nextDestinationDetail) {
      console.log('[missions] 다음 목적지 상세 정보를 찾을 수 없습니다.');
      return [];
    }
    
    // 다음 목적지에 past_image_url이 있는지 확인
    if (!nextDestinationDetail.past_image_url || nextDestinationDetail.past_image_url.trim() === '') {
      console.log('[missions] 다음 목적지에 과거사진이 없습니다.');
      return [];
    }
    
    console.log('[missions] 미션 가능한 다음 목적지:', {
      id: nextDestinationDetail.id,
      name: nextDestinationDetail.name || nextDestinationDetail.title,
      past_image_url: nextDestinationDetail.past_image_url
    });
    
    // 다음 목적지만 미션으로 변환
    const mission = convertSpotToMission(nextDestinationDetail);
    
    // activeMissions 업데이트 (다음 목적지 하나만)
    activeMissions = [mission];
    
    console.log('[missions] 생성된 미션:', mission);
    return [mission];
  } catch (error) {
    console.error('[missions] 미션 생성 실패:', error);
    return [];
  }
};

// 특정 위치의 미션 찾기 (실시간 위치 기반)
export const findMissionByLocation = (lat: number, lng: number): Mission | null => {
  if (!currentLocation || activeMissions.length === 0) {
    return null;
  }

  // 현재 위치에서 가장 가까운 미션 찾기
  let closestMission: Mission | null = null;
  let minDistance = Infinity;

  for (const mission of activeMissions) {
    if (mission.completed) continue;

    const distance = calculateDistance(lat, lng, mission.location.lat, mission.location.lng);
    
    // 미션 반경 내에 있고, 가장 가까운 미션인 경우
    if (distance <= mission.location.radius && distance < minDistance) {
      minDistance = distance;
      closestMission = mission;
    }
  }

  if (closestMission) {
    console.log(`[missions] 미션 발견: ${closestMission.location.name}, 거리: ${minDistance.toFixed(1)}m`);
  }

  return closestMission;
};

// 미션 완료 처리
export const completeMission = (missionId: number) => {
  const missionIndex = activeMissions.findIndex(m => m.id === missionId);
  if (missionIndex !== -1) {
    const completedMission = { ...activeMissions[missionIndex], completed: true };
    completedMissions.push(completedMission);
    activeMissions.splice(missionIndex, 1);
    
    console.log(`[missions] 미션 완료: ${completedMission.location.name}`);
  }
};

// 다음 스팟으로 진행 (백엔드 API 호출)
export const proceedToNextSpot = async (authToken?: string): Promise<boolean> => {
  try {
    const userCourse = await fetchUserActiveCourse(authToken);
    if (!userCourse) {
      console.log('[missions] 진행중인 코스가 없습니다.');
      return false;
    }

    // 현재 완료된 스팟의 다음 스팟 찾기
    const currentSpotIndex = userCourse.spots.findIndex(spot => 
      activeMissions.some(mission => mission.id === spot.id)
    );
    
    if (currentSpotIndex === -1 || currentSpotIndex >= userCourse.spots.length - 1) {
      console.log('[missions] 다음 스팟이 없습니다. 코스 완료!');
      return false;
    }

    const nextSpot = userCourse.spots[currentSpotIndex + 1];
    console.log('[missions] 다음 스팟으로 진행:', {
      id: nextSpot.id,
      name: (nextSpot as any).title || nextSpot.name
    });

    // 다음 스팟을 활성화 (잠금 해제)
    const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/unlock_next_spot/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        route_id: userCourse.id,
        spot_id: nextSpot.id
      }),
    });

    if (response.ok) {
      console.log('[missions] 다음 스팟 활성화 성공');
      return true;
    } else {
      console.error('[missions] 다음 스팟 활성화 실패:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[missions] 다음 스팟 진행 실패:', error);
    return false;
  }
};

// 현재 활성화된 미션 가져오기
export const getActiveMissions = (): Mission[] => {
  return activeMissions;
};

// 완료된 미션 가져오기
export const getCompletedMissions = (): Mission[] => {
  return completedMissions;
};

// 미션 상태 초기화
export const resetMissionState = () => {
  activeMissions = [];
  completedMissions = [];
  currentLocation = null;
  console.log('[missions] 미션 상태 초기화 완료');
};

// 두 지점 간의 거리 계산 (미터)
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// 인증 토큰 가져오기 (authService 사용)
const getAuthToken = async (): Promise<string | null> => {
  try {
    // authService를 사용하여 토큰 가져오기
    const authService = require('../services/authService').default;
    const tokens = await authService.getTokens();
    return tokens?.access || null;
  } catch (error) {
    console.error('[missions] 토큰 가져오기 실패:', error);
    return null;
  }
};

// 위치 기반 미션 감지 시작 (주기적으로 호출)
export const startLocationBasedMissionDetection = async () => {
  if (!currentLocation) {
    console.log('[missions] 현재 위치가 설정되지 않았습니다.');
    return;
  }

  // 먼저 사용자의 진행중인 코스에서 미션 생성
  await createMissionsFromUserCourse();
  
  // 현재 위치에서 미션 찾기
  const nearbyMission = findMissionByLocation(currentLocation.lat, currentLocation.lng);
  
  if (nearbyMission) {
    console.log(`[missions] 근처 미션 발견: ${nearbyMission.location.name}`);
    // 여기서 미션 알림을 트리거할 수 있습니다
    return nearbyMission;
  }
  
  return null;
};

// 미션 데이터 새로고침
export const refreshMissionData = async () => {
  try {
    await createMissionsFromUserCourse();
    console.log('[missions] 미션 데이터 새로고침 완료');
    return activeMissions;
  } catch (error) {
    console.error('[missions] 미션 데이터 새로고침 실패:', error);
    return [];
  }
}; 