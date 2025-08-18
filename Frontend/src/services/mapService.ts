import axios from 'axios';
import { API_KEYS } from '../config/apiKeys';
import { Platform, PermissionsAndroid } from 'react-native';

// 카카오맵 API 키
const KAKAO_MAP_API_KEY = API_KEYS.KAKAO_MAP_API_KEY;
const KAKAO_REST_API_KEY = API_KEYS.KAKAO_REST_API_KEY;

// 카카오맵 API 기본 URL
const KAKAO_API_BASE = 'https://dapi.kakao.com';

// axios 인스턴스 생성
const kakaoApiClient = axios.create({
  baseURL: KAKAO_API_BASE,
  timeout: 10000,
  headers: {
    'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// 주소 검색
export const searchAddress = async (query: string) => {
  try {
    const response = await kakaoApiClient.get('/v2/local/search/address.json', {
      params: {
        query,
        size: 10,
      },
    });
    return response.data.documents;
  } catch (error) {
    console.error('주소 검색 오류:', error);
    throw error;
  }
};

// 장소 검색
export const searchPlace = async (query: string) => {
  try {
    const response = await kakaoApiClient.get('/v2/local/search/keyword.json', {
      params: {
        query,
        size: 10,
      },
    });
    return response.data.documents;
  } catch (error) {
    console.error('장소 검색 오류:', error);
    throw error;
  }
};

// 길찾기 (경로 검색) - 개선된 버전
export const searchRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints?: Array<{ lat: number; lng: number }>
) => {
  try {
    const waypointsParam = waypoints?.map(point => `${point.lng},${point.lat}`).join('|') || '';
    
    const response = await kakaoApiClient.get('/v1/directions', {
      params: {
        origin: `${origin.lng},${origin.lat}`,
        destination: `${destination.lng},${destination.lat}`,
        waypoints: waypointsParam,
      },
    });
    
    // 경로 데이터 구조화
    const routeData = {
      path: response.data.routes[0].sections[0].roads.map((road: any) => 
        road.vertexes.map((vertex: any, index: number) => ({
          lat: vertex.y,
          lng: vertex.x
        }))
      ).flat(),
      distance: response.data.routes[0].summary.distance,
      duration: response.data.routes[0].summary.duration,
      tollFare: response.data.routes[0].summary.tollFare,
      fuelPrice: response.data.routes[0].summary.fuelPrice
    };
    
    return routeData;
  } catch (error) {
    console.error('길찾기 오류:', error);
    throw error;
  }
};

// 좌표 변환 (주소 -> 좌표)
export const addressToCoordinates = async (address: string) => {
  try {
    const response = await kakaoApiClient.get('/v2/local/search/address.json', {
      params: {
        query: address,
        size: 1,
      },
    });
    
    if (response.data.documents && response.data.documents.length > 0) {
      const document = response.data.documents[0];
      return {
        lat: parseFloat(document.y),
        lng: parseFloat(document.x),
        address: document.address_name
      };
    } else {
      throw new Error('주소를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('주소-좌표 변환 오류:', error);
    throw error;
  }
};

// 좌표 변환 (좌표 -> 주소)
export const coordinatesToAddress = async (lat: number, lng: number) => {
  try {
    const response = await kakaoApiClient.get('/v2/local/geo/coord2address.json', {
      params: {
        x: lng,
        y: lat,
      },
    });
    
    if (response.data.documents && response.data.documents.length > 0) {
      const document = response.data.documents[0];
      return {
        address: document.address_name,
        roadAddress: document.road_address?.address_name || '',
        region: document.address.region_1depth_name
      };
    } else {
      throw new Error('좌표에 해당하는 주소를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('좌표-주소 변환 오류:', error);
    throw error;
  }
};

// 카카오맵 HTML 생성
export const generateMapHtml = (
  locations: Array<{ id: number; name: string; lat: number; lng: number; order: number }>,
  showRoute: boolean = false,
  routeData?: any,
  currentLocation?: { lat: number; lng: number }
) => {
  // API 키 유효성 검사
  if (!KAKAO_MAP_API_KEY || KAKAO_MAP_API_KEY === 'your_kakao_map_api_key_here') {
    console.error('카카오맵 API 키가 설정되지 않았습니다.');
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>카카오맵</title>
        <style>
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
          .error-container { text-align: center; padding: 20px; }
          .error-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
          .error-message { font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-title">API 키 오류</div>
          <div class="error-message">카카오맵 API 키가 설정되지 않았습니다.<br>.env 파일을 확인해주세요.</div>
        </div>
      </body>
      </html>
    `;
  }

  console.log('카카오맵 HTML 생성 중...', { KAKAO_MAP_API_KEY, locations, currentLocation });

  // 간단한 테스트용 지도 (API 키 문제 확인용)
  const testMapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; background: #e5e5e5; }
            .test-info {
                position: absolute;
                top: 10px;
                left: 10px;
                background: white;
                padding: 10px;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                z-index: 1000;
            }
        </style>
    </head>
    <body>
        <div id="map">
            <div class="test-info">
                <h3>테스트 지도</h3>
                <p>API 키: ${KAKAO_MAP_API_KEY.substring(0, 10)}...</p>
                <p>위치 개수: ${locations.length}</p>
                <p>현재 위치: ${currentLocation ? '있음' : '없음'}</p>
            </div>
        </div>
        
        <script>
            console.log('테스트 지도 로드됨');
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'testMapLoaded',
                    message: '테스트 지도가 로드되었습니다.'
                }));
            }
        </script>
    </body>
    </html>
  `;

  // 실제 카카오맵 HTML
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_API_KEY}&libraries=services"></script>
        <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; }
            .map-controls {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 1000;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                padding: 8px;
            }
            .control-btn {
                display: block;
                width: 40px;
                height: 40px;
                margin: 4px 0;
                border: none;
                border-radius: 4px;
                background: #0066CC;
                color: white;
                font-size: 18px;
                cursor: pointer;
            }
            .control-btn:hover {
                background: #0052A3;
            }
            .loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                text-align: center;
                z-index: 1000;
            }
        </style>
    </head>
    <body>
        <div id="map">
            <div class="loading" id="loading">
                <h3>카카오맵 로딩 중...</h3>
                <p>잠시만 기다려주세요</p>
            </div>
        </div>
        <div class="map-controls">
            <button class="control-btn" onclick="zoomIn()" title="확대">+</button>
            <button class="control-btn" onclick="zoomOut()" title="축소">-</button>
            <button class="control-btn" onclick="moveToCurrentLocation()" title="현재 위치">📍</button>
            <button class="control-btn" onclick="resetMap()" title="기본 위치">🏠</button>
        </div>
        
        <script>
            // 전역 오류 핸들러
            window.onerror = function(message, source, lineno, colno, error) {
                console.error('JavaScript 오류:', message, 'at', source, ':', lineno, ':', colno);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'error',
                        message: message,
                        source: source,
                        lineno: lineno,
                        colno: colno
                    }));
                }
            };

            let map;
            let markers = [];
            let currentLocationMarker = null;
            let currentLocationCircle = null;
            let sdkLoadAttempts = 0;
            const maxAttempts = 3;
            
            // SDK 로드 상태 확인
            function checkSDKLoaded() {
                console.log('SDK 로드 상태 확인 중...', sdkLoadAttempts);
                
                if (typeof kakao !== 'undefined' && kakao.maps) {
                    console.log('카카오맵 SDK 로드 성공!');
                    document.getElementById('loading').style.display = 'none';
                    initMap();
                    return true;
                }
                
                sdkLoadAttempts++;
                if (sdkLoadAttempts >= maxAttempts) {
                    console.error('카카오맵 SDK 로드 실패');
                    document.getElementById('loading').innerHTML = '<h3>지도 로드 실패</h3><p>네트워크 연결을 확인해주세요</p>';
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'error',
                            message: '카카오맵 SDK 로드 실패 - 네트워크 연결을 확인해주세요'
                        }));
                    }
                    return false;
                }
                
                // 2초 후 다시 시도
                setTimeout(checkSDKLoaded, 2000);
                return false;
            }
            
            // 지도 초기화
            function initMap() {
                try {
                    console.log('지도 초기화 시작...');
                    const container = document.getElementById('map');
                    if (!container) {
                        console.error('지도 컨테이너를 찾을 수 없습니다.');
                        return;
                    }
                    
                    const options = {
                        center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울시청
                        level: 7
                    };
                    
                    map = new kakao.maps.Map(container, options);
                    console.log('지도 생성 완료');
                    
                    // 위치 마커 추가
                    ${locations.map(location => `
                        try {
                            const marker${location.id} = new kakao.maps.Marker({
                                position: new kakao.maps.LatLng(${location.lat}, ${location.lng}),
                                map: map
                            });
                            
                            const infowindow${location.id} = new kakao.maps.InfoWindow({
                                content: '<div style="padding:10px;text-align:center;"><b>${location.name}</b><br>순서: ${location.order}</div>'
                            });
                            
                            kakao.maps.event.addListener(marker${location.id}, 'click', function() {
                                infowindow${location.id}.open(map, marker${location.id});
                            });
                            
                            markers.push(marker${location.id});
                        } catch (markerError) {
                            console.error('마커 생성 오류:', markerError);
                        }
                    `).join('')}
                    
                    // 현재 위치 마커 추가 (있는 경우)
                    ${currentLocation ? `
                        try {
                            currentLocationMarker = new kakao.maps.Marker({
                                position: new kakao.maps.LatLng(${currentLocation.lat}, ${currentLocation.lng}),
                                map: map,
                                image: new kakao.maps.MarkerImage(
                                    'data:image/svg+xml;base64,${btoa(`
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="12" cy="12" r="8" fill="#0066CC" stroke="white" stroke-width="2"/>
                                            <circle cx="12" cy="12" r="3" fill="white"/>
                                        </svg>
                                    `)}',
                                    new kakao.maps.Size(24, 24)
                                )
                            });
                            
                            currentLocationCircle = new kakao.maps.Circle({
                                center: new kakao.maps.LatLng(${currentLocation.lat}, ${currentLocation.lng}),
                                radius: 100,
                                strokeWeight: 2,
                                strokeColor: '#0066CC',
                                strokeOpacity: 0.8,
                                strokeStyle: 'solid',
                                fillColor: '#0066CC',
                                fillOpacity: 0.2,
                                map: map
                            });
                        } catch (currentLocationError) {
                            console.error('현재 위치 마커 생성 오류:', currentLocationError);
                        }
                    ` : ''}
                    
                    // 경로 표시 (있는 경우)
                    ${showRoute && routeData ? `
                        try {
                            const path = new kakao.maps.Polyline({
                                path: [
                                    ${routeData.path.map((point: any) => `new kakao.maps.LatLng(${point.lat}, ${point.lng})`).join(', ')}
                                ],
                                strokeWeight: 5,
                                strokeColor: '#0066CC',
                                strokeOpacity: 0.7,
                                strokeStyle: 'solid',
                                map: map
                            });
                            
                            // 경로 정보 표시
                            const routeInfo = new kakao.maps.InfoWindow({
                                content: '<div style="padding:10px;"><b>경로 정보</b><br>거리: ${Math.round(routeData.distance / 1000)}km<br>시간: ${Math.round(routeData.duration / 60)}분</div>',
                                position: new kakao.maps.LatLng(${routeData.path[Math.floor(routeData.path.length / 2)].lat}, ${routeData.path[Math.floor(routeData.path.length / 2)].lng})
                            });
                            routeInfo.open(map);
                        } catch (routeError) {
                            console.error('경로 표시 오류:', routeError);
                        }
                    ` : ''}
                    
                    console.log('지도 초기화 완료');
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'mapReady'}));
                    }
                } catch (error) {
                    console.error('지도 초기화 오류:', error);
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'error',
                            message: '지도 초기화 오류: ' + error.message
                        }));
                    }
                }
            }
            
            // 지도 컨트롤 함수들
            function zoomIn() {
                if (map) {
                    map.setLevel(map.getLevel() - 1);
                    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'zoomIn'}));
                }
            }
            
            function zoomOut() {
                if (map) {
                    map.setLevel(map.getLevel() + 1);
                    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'zoomOut'}));
                }
            }
            
            function moveToCurrentLocation() {
                ${currentLocation ? `
                    if (map && currentLocationMarker) {
                        map.panTo(currentLocationMarker.getPosition());
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'moveToCurrentLocation',
                            lat: ${currentLocation.lat},
                            lng: ${currentLocation.lng}
                        }));
                    }
                ` : `
                    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'requestCurrentLocation'}));
                `}
            }
            
            function resetMap() {
                if (map) {
                    map.setCenter(new kakao.maps.LatLng(37.5665, 126.9780));
                    map.setLevel(7);
                    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'resetMap'}));
                }
            }
            
            // 메시지 수신 처리
            window.addEventListener('message', function(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'moveToLocation' && map) {
                        const newPosition = new kakao.maps.LatLng(data.lat, data.lng);
                        map.panTo(newPosition);
                        
                        // 현재 위치 마커 업데이트
                        if (currentLocationMarker) {
                            currentLocationMarker.setMap(null);
                        }
                        if (currentLocationCircle) {
                            currentLocationCircle.setMap(null);
                        }
                        
                        currentLocationMarker = new kakao.maps.Marker({
                            position: newPosition,
                            map: map,
                            image: new kakao.maps.MarkerImage(
                                'data:image/svg+xml;base64,${btoa(`
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="8" fill="#0066CC" stroke="white" stroke-width="2"/>
                                        <circle cx="12" cy="12" r="3" fill="white"/>
                                    </svg>
                                `)}',
                                new kakao.maps.Size(24, 24)
                            )
                        });
                        
                        currentLocationCircle = new kakao.maps.Circle({
                            center: newPosition,
                            radius: 100,
                            strokeWeight: 2,
                            strokeColor: '#0066CC',
                            strokeOpacity: 0.8,
                            strokeStyle: 'solid',
                            fillColor: '#0066CC',
                            fillOpacity: 0.2,
                            map: map
                        });
                    }
                } catch (error) {
                    console.error('메시지 처리 오류:', error);
                }
            });
            
            // 지도 로드 완료 시 초기화
            document.addEventListener('DOMContentLoaded', function() {
                console.log('DOM 로드 완료');
                // 1초 후 SDK 로드 확인 시작
                setTimeout(checkSDKLoaded, 1000);
            });
        </script>
    </body>
    </html>
  `;
  
  // 테스트 모드인지 확인 (API 키가 테스트용인 경우)
  if (KAKAO_MAP_API_KEY.includes('your_kakao_map_api_key_here') || KAKAO_MAP_API_KEY.length < 20) {
    console.log('테스트 모드로 실행');
    return testMapHtml;
  }
  
  return mapHtml;
};

// 위치 권한 요청 (Android)
export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '위치 권한',
          message: '현재 위치를 가져오기 위해 위치 권한이 필요합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '거부',
          buttonPositive: '허용',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('위치 권한 요청 오류:', error);
      return false;
    }
  }
  return true; // iOS는 별도 처리 필요
};

// 안전한 현재 위치 가져오기 (기본값 반환)
export const getCurrentLocationSafe = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 서울시청 좌표를 기본값으로 반환
      resolve({ lat: 37.5665, lng: 126.9780 });
    }, 1000);
  });
};

// 새로운 현재 위치 가져오기 (네이티브 모듈 없이)
export const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('기본 Geolocation API 사용 시도...');
      
      // React Native의 기본 Geolocation API 사용
      if (typeof (global as any).navigator !== 'undefined' && (global as any).navigator.geolocation) {
        const options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        };
        
        (global as any).navigator.geolocation.getCurrentPosition(
          (position: any) => {
            console.log('위치 가져오기 성공:', position);
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error: any) => {
            console.error('Geolocation 오류:', error);
            // 오류 시 안전한 위치 반환
            getCurrentLocationSafe().then(resolve).catch(() => {
              resolve({ lat: 37.5665, lng: 126.9780 });
            });
          },
          options
        );
      } else {
        console.log('Geolocation API를 사용할 수 없습니다. 안전한 위치 사용');
        getCurrentLocationSafe().then(resolve).catch(() => {
          resolve({ lat: 37.5665, lng: 126.9780 });
        });
      }
    } catch (error) {
      console.error('위치 서비스 초기화 오류:', error);
      getCurrentLocationSafe().then(resolve).catch(() => {
        resolve({ lat: 37.5665, lng: 126.9780 });
      });
    }
  });
};

// Geolocation 모듈 사용 가능 여부 확인 (더 이상 사용하지 않음)
export const isGeolocationAvailable = (): boolean => {
  return typeof (global as any).navigator !== 'undefined' && (global as any).navigator.geolocation !== undefined;
}; 