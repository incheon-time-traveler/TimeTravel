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
  // API 키 확인
  if (!KAKAO_MAP_API_KEY) {
    console.error('❌ 카카오맵 API 키가 없습니다.');
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

  console.log('✅ 카카오맵 API 키 확인됨:', KAKAO_MAP_API_KEY.substring(0, 10) + '...');
  console.log('카카오맵 HTML 생성 중...', { locations, currentLocation });

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
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            // 카카오맵 초기화
            var map = new kakao.maps.Map(document.getElementById('map'), {
                center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울시청
                level: 8
            });
            
            // 위치 마커 추가
            ${locations.map(location => `
                var marker${location.id} = new kakao.maps.Marker({
                    position: new kakao.maps.LatLng(${location.lat}, ${location.lng})
                });
                marker${location.id}.setMap(map);
                
                var infowindow${location.id} = new kakao.maps.InfoWindow({
                    content: '<div style="padding:5px;">${location.name}</div>'
                });
                
                kakao.maps.event.addListener(marker${location.id}, 'click', function() {
                    infowindow${location.id}.open(map, marker${location.id});
                });
            `).join('')}
            
            // 현재 위치가 있으면 중심 이동
            ${currentLocation ? `
                map.setCenter(new kakao.maps.LatLng(${currentLocation.lat}, ${currentLocation.lng}));
                map.setLevel(5);
            ` : ''}
            
            // React Native와 통신
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapLoaded',
                    message: '카카오맵이 로드되었습니다.'
                }));
            }
        </script>
    </body>
    </html>
  `;
  
  // 실제 카카오맵 반환
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
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        };
        
        navigator.geolocation.getCurrentPosition(
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
  return typeof navigator !== 'undefined' && navigator.geolocation !== undefined;
}; 