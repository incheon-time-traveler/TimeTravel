import { Mission, MissionLocation, HistoricalPhoto } from '../types/mission';
import { BACKEND_API } from '../config/apiKeys';
import { authService } from '../services/authService';

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

// 스팟 정보 캐싱
let cachedSpots: any[] = [];
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// 사용자의 현재 위치 설정
export const setCurrentLocation = (lat: number, lng: number) => {
  currentLocation = { lat, lng };
  console.log(`[missions] 현재 위치 설정: ${lat}, ${lng}`);
};

// 백엔드에서 사용자의 진행중인 코스 가져오기
export const fetchUserActiveCourse = async (authToken?: string, retryCount = 0): Promise<RouteData | null> => {
  const maxRetries = 3;
  
  try {
    // 토큰이 전달되지 않은 경우에만 getAuthToken() 사용
    const token = authToken || await getAuthToken();
    
    if (!token) {
      // 로그아웃 상태에서는 에러 메시지 출력하지 않음
      return null;
    }

    console.log(`[missions] 사용자 코스 조회 시작 (시도 ${retryCount + 1}/${maxRetries + 1})`);
    console.log(`[missions] 🔗 API 호출: GET ${BACKEND_API.BASE_URL}/v1/courses/user_routes/`);
    console.log(`[missions] 📋 요청 헤더: Authorization: Bearer ${token.substring(0, 20)}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/user_routes/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    console.log(`[missions] ✅ 사용자 코스 조회 응답: ${response.status} ${response.statusText}`);

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
    console.error(`[missions] 사용자 코스 가져오기 실패 (시도 ${retryCount + 1}):`, error);
    
    // 네트워크 에러인 경우 재시도
    if (retryCount < maxRetries) {
      console.log(`[missions] 네트워크 에러, ${retryCount + 1}/${maxRetries} 재시도 중...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // 2초, 4초, 6초 대기
      return fetchUserActiveCourse(authToken, retryCount + 1);
    }
    
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
const convertSpotToMission = (spot: any, routeId?: number): Mission => {
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
    past_image_url: spotPastImageUrl,
    routeId: routeId
  });
  
  const mission = {
    id: spot.id,
    location: {
      id: spot.id,
      name: spotName,
      lat: spotLat,
      lng: spotLng,
      order: 0, // 기본값
      radius: 300, // 300m 반경 (더 넓은 감지 범위)
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
    routeId: routeId, // routeId 추가
  };
  
  // 디버깅: 생성된 미션 객체 확인
  console.log(`[missions] convertSpotToMission - 생성된 미션:`, mission);
  
  return mission;
};

// 사용자의 진행중인 코스에서 미션 생성 (past_image_url 유무에 관계없이)
export const createMissionsFromUserCourse = async (authToken?: string): Promise<Mission[]> => {
  try {
    console.log('[missions] 미션 생성 시작');
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
    
    // 캐시된 스팟 정보가 있고 유효한 경우 사용
    const now = Date.now();
    if (cachedSpots.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
      console.log('[missions] 캐시된 스팟 정보 사용 (캐시 시간:', Math.round((now - lastFetchTime) / 1000), '초)');
    } else {
      // 전체 스팟 목록 가져오기 (재시도 로직 포함)
      let allSpotsResponse;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`[missions] spots API 호출 시작 (시도 ${retryCount + 1}/${maxRetries + 1})`);
          console.log(`[missions] 🔗 API 호출: GET ${BACKEND_API.BASE_URL}/v1/spots/`);
          console.log(`[missions] 📋 요청 헤더: Content-Type: application/json (공개 API)`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
          
          allSpotsResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          console.log(`[missions] ✅ spots API 응답: ${allSpotsResponse.status} ${allSpotsResponse.statusText}`);
          
          if (allSpotsResponse.ok) {
            cachedSpots = await allSpotsResponse.json();
            lastFetchTime = now;
            console.log('[missions] 전체 스팟 개수:', cachedSpots.length);
            break;
          } else {
            console.error(`[missions] spots API 호출 실패 (시도 ${retryCount + 1}):`, allSpotsResponse.status);
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
              continue;
            }
          }
        } catch (fetchError) {
          console.error(`[missions] spots API 네트워크 에러 (시도 ${retryCount + 1}):`, fetchError);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            continue;
          }
          throw fetchError;
        }
      }
      
      // 최대 재시도 후에도 실패한 경우
      if (!allSpotsResponse || !allSpotsResponse.ok) {
        console.error('[missions] spots API 최종 실패, 캐시된 데이터 확인');
        // 401 에러인 경우 캐시된 데이터가 있으면 사용
        if (allSpotsResponse?.status === 401 && cachedSpots.length > 0) {
          console.log('[missions] 401 에러로 인해 캐시된 스팟 정보 사용');
        } else {
          return [];
        }
      }
    }
    
    // 다음 목적지의 상세 정보 찾기
    const nextDestinationDetail = cachedSpots.find((spot: any) => spot.id === nextDestination.id);
    
    if (!nextDestinationDetail) {
      console.log('[missions] 다음 목적지 상세 정보를 찾을 수 없습니다.');
      return [];
    }
    
    console.log('[missions] 다음 목적지 상세 정보:', {
      id: nextDestinationDetail.id,
      name: nextDestinationDetail.name || nextDestinationDetail.title,
      past_image_url: nextDestinationDetail.past_image_url,
      has_mission: !!(nextDestinationDetail.past_image_url && nextDestinationDetail.past_image_url.trim() !== '')
    });
    
    // past_image_url 유무에 관계없이 미션으로 변환 (routeId 포함)
    const mission = convertSpotToMission(nextDestinationDetail, userCourse.id);
    
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
export const completeMission = async (missionId: number, authToken?: string) => {
  try {
    const token = authToken || await getAuthToken();
    
    if (!token) {
      // 로그아웃 상태에서는 에러 메시지 출력하지 않음
      return false;
    }

    console.log('[missions] 미션 완료 시작, missionId(spot.id):', missionId);
    console.log('[missions] 🔗 API 호출: GET /v1/courses/user_routes/ (사용자 코스 조회)');
    console.log('[missions] 📋 요청 헤더: Authorization: Bearer', token.substring(0, 20) + '...');

    // 1. 사용자의 UserRouteSpot 정보를 가져와서 해당하는 UserRouteSpot의 id를 찾기
    const userRoutesResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/user_routes/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    console.log('[missions] ✅ 사용자 코스 조회 응답:', userRoutesResponse.status, userRoutesResponse.statusText);

    if (!userRoutesResponse.ok) {
      console.error('[missions] 사용자 코스 정보 가져오기 실패:', userRoutesResponse.status);
      return false;
    }

    const userRoutesData = await userRoutesResponse.json();
    console.log('[missions] 사용자 코스 데이터:', userRoutesData);

    // 2. missionId(spot.id)와 일치하는 spot이 있는 코스 찾기
    let targetRouteId = null;
    for (const course of userRoutesData) {
      const spot = course.spots.find((s: any) => s.id === missionId);
      if (spot) {
        targetRouteId = course.route_id;
        break;
      }
    }

    if (!targetRouteId) {
      console.error('[missions] 해당 spot이 포함된 코스를 찾을 수 없습니다.');
      return false;
    }

    console.log('[missions] 찾은 Route ID:', targetRouteId);

    // 3. 특정 코스의 UserRouteSpot 정보 가져오기
    const specificRouteResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/${targetRouteId}/users/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!specificRouteResponse.ok) {
      console.error('[missions] 특정 코스 정보 가져오기 실패:', specificRouteResponse.status);
      return false;
    }

    const specificRouteData = await specificRouteResponse.json();
    console.log('[missions] 특정 코스 데이터:', specificRouteData);
    console.log('[missions] UserRouteSpot 목록:', specificRouteData.map((urs: any) => ({ id: urs.id, route_spot_id: urs.route_spot_id })));

    // 4. Route 상세 정보를 가져와서 Spot ID와 RouteSpot ID 매핑
    const routeDetailResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/${targetRouteId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!routeDetailResponse.ok) {
      console.error('[missions] 루트 상세 정보 가져오기 실패:', routeDetailResponse.status);
      return false;
    }

    const routeDetailData = await routeDetailResponse.json();
    console.log('[missions] 루트 상세 데이터:', routeDetailData);

    // 5. missionId(spot.id)와 일치하는 RouteSpot 찾기
    const routeSpot = routeDetailData.spots.find((rs: any) => rs.id === missionId);
    if (!routeSpot) {
      console.error('[missions] 해당 spot의 RouteSpot을 찾을 수 없습니다.');
      console.error('[missions] 사용 가능한 spots:', routeDetailData.spots.map((rs: any) => ({ id: rs.id, title: rs.title })));
      return false;
    }

    console.log('[missions] 찾은 RouteSpot ID:', routeSpot.id);

    // 6. UserRouteSpot에서 해당 RouteSpot ID와 일치하는 것 찾기
    let userRouteSpot = specificRouteData.find((urs: any) => urs.route_spot_id === routeSpot.id);
    console.log('[missions] 매칭 시도 - routeSpot.id:', routeSpot.id, 'vs UserRouteSpot.route_spot_id들:', specificRouteData.map((urs: any) => urs.route_spot_id));
    
    // 매칭 실패 시: 아직 방문하지 않은 첫 번째 UserRouteSpot을 선택 (unlock_at == null)
    if (!userRouteSpot) {
      const fallback = specificRouteData.find((urs: any) => !urs.unlock_at);
      if (fallback) {
        console.warn('[missions] 직접 매핑 실패 → 첫 방문지 fallback 사용:', { id: fallback.id, route_spot_id: fallback.route_spot_id });
        userRouteSpot = fallback;
      }
    }

    if (!userRouteSpot) {
      console.error('[missions] 해당 spot의 UserRouteSpot을 찾을 수 없습니다.');
      return false;
    }

    console.log('[missions] 찾은 UserRouteSpot ID:', userRouteSpot.id);

    // 7. unlock_route_spot API 호출 로그
    const unlockUrl = `${BACKEND_API.BASE_URL}/v1/courses/unlock_route_spot/${userRouteSpot.route_spot_id}/`;
    const unlockPayload = { id: userRouteSpot.id }; // unlock_at은 백엔드에서 자동 설정
    console.log('[missions] 🔗 API 호출: PATCH /v1/courses/unlock_route_spot/');
    console.log('[missions] 📋 요청 URL:', unlockUrl);
    console.log('[missions] 📋 요청 데이터:', unlockPayload);
    console.log('[missions] 📋 요청 헤더: Authorization: Bearer', token.substring(0, 20) + '...');
    
    const response = await fetch(unlockUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(unlockPayload),
    });
    
    console.log('[missions] ✅ unlock_route_spot API 응답:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('[missions] 미션 완료 백엔드 처리 성공:', data);
      
      // 로컬 상태 업데이트
      const missionIndex = activeMissions.findIndex(m => m.id === missionId);
      if (missionIndex !== -1) {
        const mission = activeMissions[missionIndex];
        
        // 캐시된 스팟 정보에서 past_image_url 찾기
        const spotDetail = cachedSpots.find((spot: any) => spot.id === missionId);
        const pastImageUrl = spotDetail?.past_image_url || '';
        
        console.log('[missions] 미션 완료 - past_image_url:', pastImageUrl);
        
        const completedMission = { 
          ...mission, 
          completed: true,
          past_image_url: pastImageUrl
        };
        completedMissions.push(completedMission);
        activeMissions.splice(missionIndex, 1);
        
        console.log(`[missions] 미션 완료: ${completedMission.location.name}`);
      }
      
      return true;
    } else {
      let errText = '';
      try { errText = await response.text(); } catch (_) {}
      console.error('[missions] 미션 완료 백엔드 처리 실패:', response.status, errText);
      return false;
    }
  } catch (error) {
    console.error('[missions] 미션 완료 처리 오류:', error);
    return false;
  }
};

// 다음 스팟으로 진행 (기존 unlock_route_spot API 활용)
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

    // 기존 unlock_route_spot API를 사용하여 다음 스팟 활성화
    // 다음 스팟의 UserRouteSpot ID를 찾아서 unlock_at 설정
    const nextUserRouteSpot = userCourse.spots.find((spot: any) => spot.id === nextSpot.id);
    if (nextUserRouteSpot && nextUserRouteSpot.user_route_spot_id && nextUserRouteSpot.route_spot_id) {
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/unlock_route_spot/${nextUserRouteSpot.route_spot_id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          id: nextUserRouteSpot.user_route_spot_id
        }),
      });

      if (response.ok) {
        console.log('[missions] 다음 스팟 활성화 성공');
        return true;
      } else {
        console.error('[missions] 다음 스팟 활성화 실패:', response.status);
        return false;
      }
    } else {
      console.error('[missions] 다음 스팟의 UserRouteSpot 정보를 찾을 수 없습니다.');
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
    // 로그아웃 상태에서는 에러 메시지 출력하지 않음
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

// 스팟 방문 완료 처리 (기존 use_stamp API 활용)
export const completeSpotVisit = async (userRouteSpotId: number, authToken?: string): Promise<any> => {
  try {
    const token = authToken || await getAuthToken();
    
    if (!token) {
      // 로그아웃 상태에서는 에러 메시지 출력하지 않음
      return null;
    }

    const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/use_stamp/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: userRouteSpotId,
        is_used: true
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[missions] 스팟 방문 완료 처리 성공:', data);
      return data;
    } else {
      console.error('[missions] 스팟 방문 완료 처리 실패:', response.status);
      return null;
    }
  } catch (error) {
    console.error('[missions] 스팟 방문 완료 처리 오류:', error);
    return null;
  }
};

// 방문 완료된 spot들 조회 (기존 unlock_spots API 활용)
export const getVisitedSpots = async (authToken?: string): Promise<any[]> => {
  try {
    const response = await authService.authenticatedFetch(`${BACKEND_API.BASE_URL}/v1/courses/unlock_spots/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[missions] 방문 완료된 spot들 조회 성공:', data);
      return data;
    } else {
      console.error('[missions] 방문 완료된 spot들 조회 실패:', response.status);
      return [];
    }
  } catch (error) {
    console.error('[missions] 방문 완료된 spot들 조회 오류:', error);
    return [];
  }
};

// 스팟 상세 정보 가져오기
export const getSpotDetail = async (spotId: number, authToken?: string): Promise<any> => {
  try {
    const token = authToken || await getAuthToken();
    
    if (!token) {
      // 로그아웃 상태에서는 에러 메시지 출력하지 않음
      return null;
    }

    const response = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/${spotId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[missions] 스팟 상세 정보 가져오기 성공:', data);
      return data;
    } else {
      console.error('[missions] 스팟 상세 정보 가져오기 실패:', response.status);
      return null;
    }
  } catch (error) {
    console.error('[missions] 스팟 상세 정보 가져오기 오류:', error);
    return null;
  }
}; 