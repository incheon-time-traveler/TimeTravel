import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
  Dimensions,
  Text,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, WARNING, TEXT_STYLES } from '../../styles/fonts';
import PixelLockIcon from '../../components/ui/PixelLockIcon';
import CheckIcon from '../../components/ui/CheckIcon';
import { useNavigation } from '@react-navigation/native';
import authService from '../../services/authService';
import { getSpotDetail } from '../../data/missions';
import { BACKEND_API } from '../../config/apiKeys';

const { width, height } = Dimensions.get('window');


// 스팟 상세 정보 보기
const handleViewSpotDetail = async (spotId: number) => {
  try {
    const tokens = await authService.getTokens();
    if (!tokens?.access) {
      return null; // 로그인 안 됐으면 null 반환
    }

    const spotDetail = await getSpotDetail(spotId, tokens.access);
    return spotDetail?.description || null; // ✅ description 반환
  } catch (error) {
    console.error('[HomeScreen] 스팟 상세 정보 가져오기 오류:', error);
    return null;
  }
};

// 자물쇠 이미지 import
const lockedIcon = require('../../assets/icons/locked.png');
const unlockedIcon = require('../../assets/icons/unlocked.png');
const lockedBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAOCAYAAAAbvf3sAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAC0SURBVHgBrVCxDQIxDHRCAxItJexAS5U1mAF6WlLSwwyskYqWFRIoaZGgC9h6R/d8EEL6k6KczmefE0NtZKrDdAib3xASQigic+998Ro0cxHNCGzShuycy81a5XzoZOn7zqZWGBA8NKVEMUam2+Z0dJ6Sb7u5FMbLhdz346k2nCabs8Tmx2VVxOF0L/fzum4187DR7EDVBC4wVMcEq0Y1awIOQG41VqN1FVwHeT9v+PlL9AdeQLdshK47lHUAAAAASUVORK5CYII=';
const unlockedBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAOCAYAAADJ7fe0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADDSURBVHgBtZExDsIwDEXtigEkVka4AytTrsEZYGdMVnY4Azdh5Q4wsiLBFuq0ttLEVdqhX0qTfsWv3y7CMPkeH+VRAlhrwRgjBp8RG0YJEgCaCEQLsZzD1xc9CZqWZMV+BeOEoIxgBv1DEznnJFkMYZ8M/z5vw8tyvwv753ZXYavTQ2rSeP77PIgxX1/C/nsdO0D6wGJz5RrIIGmS9jKwryTpqOJiBnCSGJqeVQhF5tjcBvvaWW1nkpkM+Ds5BMYpg/wBwNpZg8S0BsUAAAAASUVORK5CYII=';
const TABS = [
  { key: 'progress', label: '진행 중' },
  { key: 'completed', label: '진행 완료' },
];

const TripsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('progress');
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const [spotDescription, setSpotDescription] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  // 백엔드 데이터 상태
  const [userRouteSpot, setUserRouteSpot] = useState<any>(null);
  const [userCourses, setUserCourses] = useState<any[]>([]);
  const [completedCourses, setCompletedCourses] = useState<any[]>([]);
  const [userPhotos, setUserPhotos] = useState<any[]>([]); // 사용자 촬영 사진
  const [spotsData, setSpotsData] = useState<any[]>([]); // 스팟 상세 정보
  const [isLoading, setIsLoading] = useState(true); // 초기 로딩 상태를 true로 설정

  // 화면이 포커스될 때마다 데이터 새로고침
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[TripsScreen] 화면 포커스됨, 데이터 새로고침 시작');
      fetchUserCourses();
    });

    // 초기 로딩
    fetchUserCourses();

    return unsubscribe;
  }, [navigation]);

  // spot description 가져오기 위해 상태 확인
   useEffect(() => {
     const fetchSpotDetail = async () => {
       if (selectedSpot) {
         const desc = await handleViewSpotDetail(selectedSpot.id);
         setSpotDescription(desc);
       } else {
         setSpotDescription(null);
       }
   };

   fetchSpotDetail();
 }, [selectedSpot]);

  // 사용자 코스 그만두기
  const handleQuitCourse = async () => {
    try {
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        console.log('[TripsScreen] 로그인이 필요합니다.');
        return;
      }

      console.log(userRouteSpot)
      // 사용자 코스 데이터 삭제
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/${userRouteSpot[0].route_id}/users/delete/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      if (response.ok) {
        Alert.alert('알림','코스를 멈췄습니다. 다른 코스를 시작할 수 있어요.');
        console.log(response.json())
        fetchUserCourses();
      } else {
        console.log('[TripsScreen] 사용자 코스 데이터 삭제 실패:', response.status);
      }
    } catch (error) {
      console.error('[TripsScreen] 사용자 코스 데이터 삭제 에러:', error);
    }
  }
  // 사용자 코스 데이터 가져오기
  const fetchUserCourses = async (retryCount = 0) => {
    const maxRetries = 3;

    try {
      setIsLoading(true);
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        console.log('[TripsScreen] 로그인이 필요합니다.');
        setUserCourses([]);
        setCompletedCourses([]);
        return;
      }

      console.log(`[TripsScreen] 코스 조회 시작 (시도 ${retryCount + 1}/${maxRetries + 1})`);
      console.log(`[TripsScreen] 백엔드 URL: ${BACKEND_API.BASE_URL}`);

      // 사용자 코스 데이터 가져오기
      let response;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

        response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/user_routes/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokens.access}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`[TripsScreen] 코스 조회 응답: ${response.status} ${response.statusText}`);
      } catch (fetchError) {
        console.error(`[TripsScreen] API 호출 에러 (시도 ${retryCount + 1}):`, fetchError);

        // 네트워크 에러인 경우 재시도
        if (retryCount < maxRetries) {
          console.log(`[TripsScreen] 네트워크 에러, ${retryCount + 1}/${maxRetries} 재시도 중...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // 2초, 4초, 6초 대기
          return fetchUserCourses(retryCount + 1);
        }

        throw fetchError;
      }

      if (response.ok) {
        const data = await response.json();
        setUserRouteSpot(data);
        console.log('[TripsScreen] 사용자 코스 데이터:', data);
        
        // 각 코스의 스팟 데이터 상세 로그
        data.forEach((course: any, courseIndex: number) => {
          console.log(`[TripsScreen] 코스 ${courseIndex + 1} (${course.user_region_name}):`, {
            route_id: course.route_id,
            total_spots: course.total_spots,
            spots_count: course.spots.length
          });
          
          course.spots.forEach((spot: any, spotIndex: number) => {
            console.log(`[TripsScreen] 스팟 ${spotIndex + 1} (${spot.title}):`, {
              id: spot.id,
              title: spot.title,
              completed_at: spot.completed_at,
              unlock_at: spot.unlock_at,
              is_completed: !!(spot.completed_at || spot.unlock_at)
            });
          });
        });

        // spots API에서 first_image 데이터 가져오기
        let spotsResponse;
        try {
          const spotsController = new AbortController();
          const spotsTimeoutId = setTimeout(() => spotsController.abort(), 10000); // 10초 타임아웃

          spotsResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: spotsController.signal,
          });

          clearTimeout(spotsTimeoutId);
          console.log(`[TripsScreen] spots 조회 응답: ${spotsResponse.status} ${spotsResponse.statusText}`);
        } catch (spotsFetchError) {
          console.error(`[TripsScreen] spots API 호출 에러:`, spotsFetchError);
          // spots API 실패는 치명적이지 않으므로 빈 배열로 처리
          spotsResponse = { ok: false };
        }

        let spotsData: any[] = [];
        if (spotsResponse.ok) {
          spotsData = await spotsResponse.json();
          console.log('[TripsScreen] spots 데이터:', spotsData);
          setSpotsData(spotsData);
        }

        // 사용자 촬영 사진 가져오기
        let photosResponse;
        try {
          const photosController = new AbortController();
          const photosTimeoutId = setTimeout(() => photosController.abort(), 10000); // 10초 타임아웃

          photosResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/photos/`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokens.access}`,
            },
            signal: photosController.signal,
          });

          clearTimeout(photosTimeoutId);
          console.log(`[TripsScreen] photos 조회 응답: ${photosResponse.status} ${photosResponse.statusText}`);
        } catch (photosFetchError) {
          console.error(`[TripsScreen] photos API 호출 에러:`, photosFetchError);
          // photos API 실패는 치명적이지 않으므로 빈 배열로 처리
          photosResponse = { ok: false };
        }

        let photosData: any[] = [];
        if (photosResponse.ok) {
          photosData = await photosResponse.json();
          console.log('[TripsScreen] 사용자 촬영 사진 데이터:', photosData);
          setUserPhotos(photosData);
        }

        // 진행중인 코스와 완료된 코스 분리
        const inProgress: any[] = [];
        const completed: any[] = [];

        data.forEach((course: any) => {
          // completed_at 또는 unlock_at이 있는 스팟을 완료된 것으로 간주
          const completedSpots = course.spots.filter((spot: any) => spot.completed_at || spot.unlock_at);
          const totalSpots = course.spots.length;

          // spots 데이터에서 first_image 매핑
          const spotsWithImages = course.spots.map((spot: any) => {
            const spotData = spotsData.find((s: any) => s.id === spot.id);
            return {
              ...spot,
              first_image: (spotData?.first_image && spotData.first_image.trim() !== '')
                ? spotData.first_image
                : Image.resolveAssetSource(require('../../assets/images/대동여지도.jpg'))?.uri || ''
            };
          });

          if (completedSpots.length === totalSpots) {
            // 모든 스팟이 완료된 경우
            completed.push({
              ...course,
              spots: spotsWithImages,
              completedDate: completedSpots[completedSpots.length - 1]?.completed_at?.split('T')[0] || '2024.01.01',
              totalPhotos: totalSpots,
              photos: Array(totalSpots).fill(require('../../assets/icons/대불호텔.jpg'))
            });
          } else {
            // 진행중인 코스
            inProgress.push({
              ...course,
              spots: spotsWithImages
            });
          }
        });

        setUserCourses(inProgress);
        setCompletedCourses(completed);

      } else {
        console.log('[TripsScreen] 코스 조회 실패:', response.status);
        setUserCourses([]);
        setCompletedCourses([]);
      }
    } catch (error) {
      console.error(`[TripsScreen] 코스 조회 최종 에러 (시도 ${retryCount + 1}):`, error);

      // 최대 재시도 횟수 초과 시에만 에러 상태로 설정
      if (retryCount >= maxRetries) {
        console.error('[TripsScreen] 최대 재시도 횟수 초과, 빈 데이터로 설정');
        setUserCourses([]);
        setCompletedCourses([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 핀들을 일렬로 나열하는 HTML 생성 함수
  const generateStaticMapHTML = (spots: any[]) => {
    console.log('[TripsScreen] generateStaticMapHTML 호출됨, spots:', spots);

    // spot 데이터를 JavaScript 배열로 변환
    const spotsData = spots.map(spot => ({
      title: spot.title,
      completed: spot.completed_at || spot.unlock_at ? true : false,
      first_image: spot.first_image
    }));

    console.log('[TripsScreen] 원본 spots 데이터:', spots);
    console.log('[TripsScreen] 변환된 spotsData:', spotsData);

    // 현재 진행중인 spot (첫 번째 미완료 spot) 찾기
    const currentSpot = spotsData.find(spot => !spot.completed);

    // first_image가 없거나 null인 경우 기본 이미지 사용 (대동여지도)
    const defaultImage = require('../../assets/images/대동여지도.jpg');
    const defaultImageUri = Image.resolveAssetSource(defaultImage)?.uri || '';
    let backgroundImage = defaultImageUri;

    if (currentSpot?.first_image && currentSpot.first_image.trim() !== '') {
      // 이미 대체 이미지 URL인지 확인
      if (currentSpot.first_image.includes('picsum.photos') || currentSpot.first_image.includes('via.placeholder.com') || currentSpot.first_image.includes('대동여지도.jpg')) {
        backgroundImage = currentSpot.first_image;
      } else {
        backgroundImage = currentSpot.first_image.replace('http://', 'https://');
      }
    }

    console.log('[TripsScreen] spotsData:', spotsData);
    console.log('[TripsScreen] currentSpot:', currentSpot);
    console.log('[TripsScreen] currentSpot.first_image:', currentSpot?.first_image);
    console.log('[TripsScreen] backgroundImage:', backgroundImage);

    // 자물쇠 이미지 URI 변환
    const lockedResolved = Image.resolveAssetSource(lockedBase64);
    const unlockedResolved = Image.resolveAssetSource(unlockedBase64);
    const lockedUri = lockedResolved?.uri || '';
    const unlockedUri = unlockedResolved?.uri || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>코스 진행</title>
        <script>
          window.addEventListener('load', function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('WebView loaded successfully');
              window.ReactNativeWebView.postMessage('Background image URL: ${backgroundImage}');
            }
            if ('${backgroundImage}') {
              const img = new Image();
              img.onload = function() {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage('Background image loaded successfully');
                }
              };
              img.onerror = function() {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage('Background image failed to load');
                }
              };
              img.src = '${backgroundImage}';
            }
          });
        </script>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: #f8f9fa;
            height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          body::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(255, 255, 255, 0.4) 70%, rgba(255, 255, 255, 0.9) 100%), url('${backgroundImage}');
            background-size: 100% 100%;
            background-position: center;
            background-repeat: no-repeat;
            filter: blur(1px) brightness(0.7);
            z-index: 0;
          }
          body::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(248, 249, 250, 0.3);
            z-index: 1;
          }
          .pins-container {
            display: flex;
            align-items: center;
            justify-content: space-around;
            position: relative;
            width: 100%;
            height: 90px;
            padding: 0;
            box-sizing: border-box;
            top: 25%;
            z-index: 20;
          }
          .connection-line {
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 2px;
            background: repeating-linear-gradient(
              to right,
              #2196f3 0px,
              #2196f3 8px,
              transparent 8px,
              transparent 16px
            );
            z-index: 1;
          }
          .pin-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            z-index: 20;
            flex: 1;
            min-width: 0;
          }
          .pin {
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            border: 2px solid white;
            position: relative;
          }
          .pin.completed {
            background: #9e9e9e;
          }
          .pin.next {
            background:rgb(253, 228, 191);
            border: 3px solid #ff9800;
            animation: pulse 2s infinite;
          }
          .pin.waiting {
            background:rgb(201, 218, 248);
            border: 3px solid #2196f3;
          }
          .pin-icon {
            width: 14px;
            height: 14px;
            object-fit: contain;
            transform: rotate(45deg);
          }
          .pin-label {
            margin-top: 10px;
            font-size: 10px;
            font-weight: bold;
            color: #333;
            text-align: center;
            max-width: 60px;
            line-height: 1.2;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(255, 152, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0); }
          }
        </style>
      </head>
      <body>
        <div class="pins-container">
          <div class="connection-line"></div>
          ${spotsData.map((spot, index) => {
            let pinClass = 'waiting';
            let iconSrc = lockedUri;

            if (spot.completed) {
              pinClass = 'completed';
              iconSrc = unlockedUri;
            } else if (index === spotsData.findIndex(s => !s.completed)) {
              pinClass = 'next';
              iconSrc = lockedUri;
            }

            return `
              <div class="pin-item">
                <div class="pin ${pinClass}">
                  <img src="${spot.completed ? unlockedBase64 : lockedBase64}" class="pin-icon" alt="pin" />
                </div>
                <div class="pin-label">${spot.title}</div>
              </div>
            `;
          }).join('')}
        </div>
      </body>
      </html>
    `;
  };

  const renderProgressTab = () => {
    // 진행 중인 코스가 없으면 빈 화면 표시
    if (userCourses.length === 0) {
      return (
        <ScrollView style={styles.content} contentContainerStyle={{paddingBottom: 32}} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>진행 중인 코스가 없습니다.</Text>
            <Text style={styles.emptyStateSubtext}>새로운 코스를 생성해보세요!</Text>
          </View>
        </ScrollView>
      );
    }

    // 첫 번째 진행중인 코스의 진행률 계산
    const currentCourse = userCourses[0];
    const completedSpots = currentCourse.spots.filter((spot: any) => spot.completed_at || spot.unlock_at);
    const totalSpots = currentCourse.spots.length;
    const progressPercentage = totalSpots > 0 ? (completedSpots.length / totalSpots) * 100 : 0;

    return (
      <ScrollView style={styles.content} contentContainerStyle={{paddingBottom: 32}} showsVerticalScrollIndicator={false}>
        {/* 진행률 섹션 */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>진행률</Text>
            <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercentage}%` }
                ]}
              />
            </View>
          </View>
          <Text style={styles.progressDetail}>
            {completedSpots.length} / {totalSpots} 완료
          </Text>
        </View>



        {/* 지도 영역 - 인천 정적 지도 with 핀 */}
        <View style={styles.mapBox}>
          <WebView
            source={{ html: generateStaticMapHTML(currentCourse.spots) }}
            style={styles.mapImg}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowingReadAccessToURL={"*"}
            startInLoadingState={true}
            scalesPageToFit={false}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="always"
            allowsBackForwardNavigationGestures={false}
            cacheEnabled={false}
            incognito={false}
            androidLayerType="hardware"
            originWhitelist={['*']}
            allowsArbitraryLoads={true}
            allowsArbitraryLoadsInWebContent={true}
            onLoadStart={() => {
              console.log('[TripsScreen] 카카오맵 로딩 시작');
            }}
            onLoadEnd={() => {
              console.log('[TripsScreen] 카카오맵 로딩 완료');
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('[TripsScreen] 카카오맵 에러:', nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('[TripsScreen] 카카오맵 HTTP 에러:', nativeEvent);
            }}
            onMessage={(event) => {
              console.log('[TripsScreen] WebView 메시지:', event.nativeEvent.data);
            }}
            onConsoleMessage={(event) => {
              console.log('[TripsScreen] WebView Console:', event.nativeEvent.message);
            }}
          />
        </View>

        <View style={styles.cardContainer}>
            {selectedSpot && (() => {
              // spots 데이터에서 해당 스팟의 상세 정보 찾기
              const spotDetail = spotsData.find((spot: any) => spot.id === selectedSpot.id);
              const userPhoto = userPhotos.find((photo: any) => photo.spot_id === selectedSpot.id);
              
              return (
                <Modal
                  visible={!!selectedSpot}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setSelectedSpot(null)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{selectedSpot.title}</Text>
                        <TouchableOpacity
                          onPress={() => setSelectedSpot(null)}
                          style={styles.modalCloseButton}
                        >
                          <Text style={styles.modalCloseButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView style={styles.modalTextContainer}>
                        {/* 사용자 촬영 사진이 있으면 우선 표시, 없으면 기본 이미지 */}
                        {userPhoto && userPhoto.image_url ? (
                          <Image
                            source={{ uri: userPhoto.image_url }}
                            style={styles.modalImage}
                            resizeMode="cover"
                          />
                        ) : spotDetail && spotDetail.first_image ? (
                          <Image
                            source={{ uri: spotDetail.first_image.replace("http://", "https://") }}
                            style={styles.modalImage}
                            resizeMode="cover"
                          />
                        ) : null}
                        
                        {/* 방문 상태 표시 */}
                        <View style={styles.visitStatusContainer}>
                          <Text style={styles.visitStatusText}>
                            {selectedSpot.completed_at || selectedSpot.unlock_at ? '✅ 방문 완료' : '🔒 미방문'}
                          </Text>
                          {(selectedSpot.completed_at || selectedSpot.unlock_at) && (
                            <Text style={styles.visitDateText}>
                              방문일: {new Date(selectedSpot.completed_at || selectedSpot.unlock_at).toLocaleDateString('ko-KR')}
                            </Text>
                          )}
                        </View>

                        {/* 스팟 상세 정보 */}
                        {spotDetail && (
                          <View style={styles.spotDetailContainer}>
                            <Text style={styles.spotDetailTitle}>장소 정보</Text>
                            <Text style={styles.spotDetailText}>
                              {spotDetail.description || '상세 정보가 없습니다.'}
                            </Text>
                            
                            {spotDetail.address && (
                              <Text style={styles.spotDetailLabel}>주소: {spotDetail.address}</Text>
                            )}
                            
                            {spotDetail.lat && spotDetail.lng && (
                              <Text style={styles.spotDetailLabel}>
                                위치: {spotDetail.lat.toFixed(6)}, {spotDetail.lng.toFixed(6)}
                              </Text>
                            )}
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </View>
                </Modal>
              );
            })()}
          {/* 실제 코스 스팟들 렌더링 */}
          {currentCourse.spots.map((spot: any, index: number) => (
            <View key={spot.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              {spot.completed_at || spot.unlock_at ? (
                // ✅ 1. 완료된 스팟: TouchableOpacity로 감싸고 onPress 추가
                <TouchableOpacity
                  style={styles.hotelCard}
                  activeOpacity={0.8}
                  onPress={() => setSelectedSpot(spot)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={styles.hotelCardText}>{spot.title}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative', paddingRight: 0 }}>
                    <Text style={styles.arrowText}>></Text>
                    <CheckIcon />
                  </View>
                </TouchableOpacity>
              ) : index === currentCourse.spots.findIndex((s: any) => !s.completed_at && !s.unlock_at) ? (
                 // 다음 목적지 (첫 번째 미완료 스팟)
                 <View style={styles.hotelCard}>
                   {/* ✅ 2. 다음 목적지: 정보 모달 열기 금지 (완료된 스팟만 허용) */}
                   <View>
                     <Text style={styles.hotelCardText}>{spot.title}</Text>
                   </View>
                   <TouchableOpacity
                     onPress={() => (navigation as any).navigate('Map', {
                       screen: 'MapMain',
                       params: {
                         destination: spot.title,
                         destinationLat: spot.lat,
                         destinationLng: spot.lng,
                       }
                     })}
                     style={styles.nextDestinationButton}
                     activeOpacity={0.8}
                   >
                     <Text style={styles.nextDestinationButtonText}>출발하기</Text>
                   </TouchableOpacity>
                 </View>
              ) : (
                // ✅ 3. 잠긴 스팟: 정보 모달 열기 금지
                <View
                  style={styles.lockedCard}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.lockedCardText}>{spot.title}</Text>
                  </View>
                  <PixelLockIcon />
                </View>
              )}
            </View>
          ))}
        </View>


        {/* 사진 섹션 */}
        <Text style={[styles.photoSectionTitle, { fontFamily: 'NeoDunggeunmoPro-Regular' }]}>미션 완료</Text>
        <View style={styles.photoGrid}>
          {currentCourse.spots.map((spot: any, idx: number) => {
            // 해당 스팟의 사용자 촬영 사진 찾기
            const userPhoto = userPhotos.find((photo: any) => photo.spot_id === spot.id);
            
            return (
              <View key={idx} style={styles.photoSlot}>
                {spot.completed_at || spot.unlock_at ? (
                  userPhoto && userPhoto.image_url ? (
                    <Image 
                      source={{ uri: userPhoto.image_url }} 
                      style={styles.photo} 
                      resizeMode="cover" 
                    />
                  ) : (
                    <Image source={require('../../assets/icons/대불호텔.jpg')} style={styles.photo} resizeMode="cover" />
                  )
                ) : (
                  <PixelLockIcon />
                )}
              </View>
            );
          })}
        </View>

        {/* 하단 버튼 */}
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.quitBtn}
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert(
                "🔴 주의",
                "코스를 그만두면 모든 정보가 사라지고 미션이 초기화됩니다. 그래도 삭제하시겠습니까?",
                [
                  {
                    text: "돌아가기", // 취소 버튼
                    style: "cancel",
                  },
                  {
                    text: "그만두기", // 실행 버튼
                    style: "destructive", // iOS에서 빨간색 표시
                    onPress: () => handleQuitCourse(),
                  },
                ]
              );
            }}
          >
            <Text style={styles.quitBtnText}>코스 그만두기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

const renderCompletedTab = () => (
  completedCourses.length === 0 ? (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>완료된 코스가 없습니다.</Text>
        <Text style={styles.emptyStateSubtext}>진행 중인 코스를 완주해보세요!</Text>
      </View>
    </ScrollView>
  ) : (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingVertical: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {completedCourses.map((course) => (
        <TouchableOpacity
          key={course.route_id}
          style={styles.courseCard}
          onPress={() => {
            setSelectedCourse(course);
            setCourseModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.courseCardHeader}>
            <Text style={styles.courseCardTitle}>{course.user_region_name || '인천 여행 코스'}</Text>
            <Text style={styles.courseCardDate}>{course.completedDate}</Text>
          </View>
          <Text style={styles.courseCardDescription}>완료된 여행 코스입니다.</Text>
          <View style={styles.courseCardLocations}>
            {course.spots.map((spot: any, index: number) => (
              <Text key={index} style={styles.courseCardLocation}>
                {index + 1}. {spot.title}
              </Text>
            ))}
          </View>
          <View style={styles.courseCardPhotos}>
            {course.photos.slice(0, 3).map((photo: any, index: number) => (
              <Image key={index} source={photo} style={styles.courseCardPhoto} resizeMode="cover" />
            ))}
            {course.photos.length > 3 && (
              <View style={styles.courseCardPhotoMore}>
                <Text style={styles.courseCardPhotoMoreText}>+{course.photos.length - 3}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
);

  const renderCourseModal = () => (
    <Modal
      visible={courseModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{selectedCourse?.user_region_name || '인천 여행 코스'}</Text>
          <TouchableOpacity onPress={() => setCourseModalVisible(false)} style={styles.modalCloseButton}>
            <Text style={styles.modalCloseButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalTextContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalDescription}>완료된 여행 코스입니다.</Text>

          <Text style={styles.modalSectionTitle}>방문 장소</Text>
          {selectedCourse?.spots?.map((spot: any, index: number) => (
            <View key={index} style={styles.modalLocationItem}>
              <Text style={styles.modalLocationNumber}>{index + 1}</Text>
              <Text style={styles.modalLocationText}>{spot.title}</Text>
            </View>
          ))}

          <Text style={styles.modalSectionTitle}>코스 사진</Text>
          <View style={styles.modalPhotoGrid}>
            {selectedCourse?.photos?.map((photo: any, index: number) => (
              <Image key={index} source={photo} style={styles.modalPhoto} resizeMode="cover" />
            ))}
          </View>

          {selectedCourse?.completedDate && (
            <Text style={styles.modalDate}>완료 날짜: {selectedCourse.completedDate}</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f0f0' }} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          {/* 상단 탭 네비게이션 (세그먼트 컨트롤 스타일) */}
          <View style={styles.tabBarWrap}>
            {TABS.map((tab, idx) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabBtn,
                    isActive && styles.tabBtnActive,
                    idx === 0 && styles.tabBtnFirst,
                    idx === TABS.length - 1 && styles.tabBtnLast,
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.tabBtnText,
                    isActive ? styles.tabBtnTextActive : styles.tabBtnTextInactive,
                    { fontFamily: 'NeoDunggeunmoPro-Regular' }
                  ]}>{tab.label}</Text>
                  {isActive && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 로딩 상태 표시 */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={INCHEON_BLUE} />
              <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
            </View>
          ) : (
            <>
              {/* 탭별 콘텐츠 */}
              {activeTab === 'progress' && renderProgressTab()}
              {activeTab === 'completed' && renderCompletedTab()}
            </>
          )}
        </View>
      </SafeAreaView>

      {/* 코스 상세 모달 */}
      {renderCourseModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
  },
  tabBarWrap: {
    flexDirection: 'row',
    borderRadius: 16,
    marginTop: 18,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginHorizontal: 2,
    position: 'relative',
  },
  tabBtnActive: {},
  tabBtnFirst: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  tabBtnLast: {
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  tabBtnText: {
    marginBottom: 3,
    fontSize: 16,
    textAlign: 'center',
  },
  tabBtnTextActive: {
    color: INCHEON_BLUE,
  },
  tabBtnTextInactive: {
    color: INCHEON_GRAY,
  },
  tabUnderline: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 4,
    height: 4,
    backgroundColor: INCHEON_BLUE,
    borderRadius: 2,
  },
  // 진행률 섹션 스타일
  progressSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE,
  },
  progressPercentage: {
    ...TEXT_STYLES.body,
    color: INCHEON_BLUE,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: INCHEON_BLUE,
    borderRadius: 4,
  },
  progressDetail: {
    fontSize: 14,
    color: INCHEON_GRAY,
    textAlign: 'center',
  },
  mapBox: {
    borderWidth: 5,
    borderColor: INCHEON_BLUE_LIGHT,
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mapImg: {
    width: width - 40,
    height: 180,
    borderRadius: 0,
  },

  cardContainer: {
    marginTop: 16
  },
  hotelCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingLeft: 18,
    paddingRight: 0,
    marginBottom: 10,
    borderRadius: 10,
  },
  hotelCardText: {
    ...TEXT_STYLES.body,
  },
  arrowText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 18,
    color: INCHEON_GRAY,
    marginRight: 0,
    marginLeft: 'auto',
  },
  hotelCardArrow: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 18,
    color: INCHEON_GRAY,
  },
  nextDestinationButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: INCHEON_BLUE,
    borderRadius: 8,
    marginRight: 8,
  },
  nextDestinationButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  lockedCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 10,
    borderRadius: 10,
  },
  lockedCardText: {
    ...TEXT_STYLES.body,
  },
  photoSectionTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE,
    marginVertical: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  photoSlot: {
    width: (width - 48) / 2,
    height: 90,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    position: 'relative',
  },
  quitBtn: {
    flex: 1,
    borderColor: WARNING,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  quitBtnText: {
    ...TEXT_STYLES.button,
    color: WARNING,
  },
  // 새로운 코스 카드 스타일
  courseCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
  },
  courseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseCardTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE,
  },
  courseCardDate: {
    ...TEXT_STYLES.small
  },
  courseCardDescription: {
    ...TEXT_STYLES.body,
    marginBottom: 12,
    lineHeight: 22,
  },
  courseCardLocations: {
    marginBottom: 12,
  },
  courseCardLocation: {
    ...TEXT_STYLES.small,
    marginBottom: 4,
  },
  courseCardPhotos: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  courseCardPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  courseCardPhotoMore: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: INCHEON_BLUE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseCardPhotoMoreText: {
    ...TEXT_STYLES.small,
    color: INCHEON_BLUE,
  },
  // 모달 스타일

  modalImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },
  visitStatusContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: INCHEON_BLUE,
  },
  visitStatusText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_BLUE,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  visitDateText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
  },
  spotDetailContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  spotDetailTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 18,
    color: INCHEON_BLUE,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  spotDetailText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  spotDetailLabel: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 13,
    color: INCHEON_GRAY,
    marginBottom: 4,
  },

  modalSectionTitle: {
    ...TEXT_STYLES.heading,
    color: INCHEON_BLUE,
    marginBottom: 12,
    marginTop: 20,
  },
  modalLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalLocationNumber: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_BLUE,
    fontWeight: 'bold',
    marginRight: 8,
    width: 20,
  },
  modalLocationText: {
    ...TEXT_STYLES.body,
  },
  modalPhotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  modalPhoto: {
    width: (width - 80) / 3,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalDate: {
    ...TEXT_STYLES.small,
    marginBottom: 8,
  },
  // 빈 상태 스타일
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateText: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_GRAY,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    ...TEXT_STYLES.body,
    color: INCHEON_GRAY,
  },
  // 길찾기 버튼 스타일
  routeContainer: {
    width: width - 40,
    height: 180,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#fff',
  },
  routeDestination: {
    fontSize: 16,
    marginBottom: 20,
    opacity: 0.9,
    color: '#fff',
  },
     routeButton: {
     backgroundColor: '#ff5722',
     paddingVertical: 12,
     paddingHorizontal: 24,
     borderRadius: 8,
     margin: 10,
   },
  routeButtonText: {
    color: '#fff',
  },
  routeInfo: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 20,
    color: '#fff',
    textAlign: 'center',
  },
  completionContainer: {
    width: width - 40,
    height: 180,
    backgroundColor: '#4caf50',
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#fff',
  },
     completionText: {
     fontSize: 16,
     opacity: 0.9,
    color: '#fff',
  },
   mapOverlay: {
    position: 'absolute',
    top: 10,
     left: 10,
     backgroundColor: 'rgba(0, 0, 0, 0.7)',
     paddingHorizontal: 12,
     paddingVertical: 6,
     borderRadius: 6,
   },
   mapOverlayText: {
     color: '#fff',
     fontSize: 14,
    fontWeight: 'bold',
  },
   mapPlaceholder: {
     flex: 1,
    alignItems: 'center',
     justifyContent: 'center',
     backgroundColor: '#f8f9fa',
   },
   mapPlaceholderIcon: {
     fontSize: 48,
     marginBottom: 16,
   },
   mapPlaceholderTitle: {
     fontSize: 20,
     fontWeight: 'bold',
     color: INCHEON_BLUE,
     marginBottom: 8,
   },
   mapPlaceholderSubtitle: {
     fontSize: 14,
    color: INCHEON_GRAY,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width - 20,
    height: height * 0.9,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginVertical: 30,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  modalTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE
  },
  modalCloseButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    ...TEXT_STYLES.body,
  },
  modalTextContainer: {
    padding: 16,
    flex: 1,
    gap: 8,
  },
  modalSubTitle: {
    ...TEXT_STYLES.heading,
   },
  modalText: {
    ...TEXT_STYLES.body,
    marginBottom: 50,
  },
  modalDescription: {
    ...TEXT_STYLES.small,
  },
  // 로딩 스타일
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    minHeight: height * 0.6,
  },
  loadingText: {
    ...TEXT_STYLES.body,
    fontFamily: 'NeoDunggeunmoPro-Regular',
    color: INCHEON_GRAY,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default TripsScreen;