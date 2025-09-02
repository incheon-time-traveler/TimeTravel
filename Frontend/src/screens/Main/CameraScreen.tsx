import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Image,
  StatusBar,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse, CameraOptions } from 'react-native-image-picker';
import { INCHEON_BLUE, INCHEON_GRAY } from '../../styles/fonts';
import { Mission } from '../../types/mission';
import { BACKEND_API } from '../../config/apiKeys';
import authService from '../../services/authService';

const { width, height } = Dimensions.get('window');

interface CameraScreenProps {
  route: {
    params: {
      mission: Mission;
      selectedPhotoId: number;
      selectedPhoto: {
        id: number;
        name: string;
        past_image_url: string;
        address: string;
      };
    };
  };
  navigation: any;
}

const CameraScreen: React.FC<CameraScreenProps> = ({ route, navigation }) => {
  const { mission, selectedPhotoId, selectedPhoto } = route.params;
  const [photoTaken, setPhotoTaken] = useState(false);
  const [currentMode, setCurrentMode] = useState<'past' | 'overlay' | 'current'>('overlay');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [currentPhotoFileName, setCurrentPhotoFileName] = useState<string | null>(null);
  const [currentPhotoMimeType, setCurrentPhotoMimeType] = useState<string | null>(null);

  useEffect(() => {
    requestCameraPermission();
    // 화면 진입 시 미션 완료 알림
    Alert.alert(
      '미션 완료! 🎉',
      `${mission.location.name}의 과거 사진을 성공적으로 선택했습니다!\n이제 현재 모습을 촬영해보세요.`,
      [{ text: '확인' }]
    );
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: '카메라 권한',
            message: '사진 촬영을 위해 카메라 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '거부',
            buttonPositive: '허용',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
      } catch (err) {
        console.warn(err);
        setHasPermission(false);
      }
    } else {
      setHasPermission(true);
    }
  };

  const handleModeChange = (mode: 'past' | 'overlay' | 'current') => {
    setCurrentMode(mode);
  };

  const handleZoomChange = (level: number) => {
    setZoomLevel(level);
    // 줌 레벨에 따라 오버레이 투명도 조절
    if (level === 1) {
      setOverlayOpacity(0.6);
    } else if (level === 3) {
      setOverlayOpacity(0.8);
    } else {
      setOverlayOpacity(0.4);
    }
  };

  const handleTakePhoto = async () => {
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.8,
      saveToPhotos: false,
      includeBase64: false,
    };

    try {
      const response: ImagePickerResponse = await launchCamera(options);
      
      if (response.didCancel) {
        console.log('사용자가 카메라를 취소했습니다');
        return;
      }
      
      if (response.errorCode) {
        console.error('카메라 오류:', response.errorMessage);
        Alert.alert('오류', '카메라 실행 중 오류가 발생했습니다.');
        return;
      }
      
      if (response.assets && response.assets[0]) {
        const photoAsset = response.assets[0];
        const photoUri = photoAsset.uri;
        
        if (photoUri) {
          // 🖼️ 사진 메타데이터 상세 로그 출력
          console.log('📸 [CameraScreen] 사진 촬영 완료! 상세 메타데이터:');
          console.log('📊 사진 기본 정보:', {
            uri: photoUri,
            type: photoAsset.type,
            fileName: photoAsset.fileName,
            fileSize: photoAsset.fileSize,
            width: photoAsset.width,
            height: photoAsset.height,
            timestamp: photoAsset.timestamp,
            duration: photoAsset.duration,
            bitrate: photoAsset.bitrate,
          });
          
          // 📏 사진 사이즈 정보 강조
          console.log('📏 [CameraScreen] 🎯 사진 사이즈 정보 (중요!):', {
            width: photoAsset.width || '알 수 없음',
            height: photoAsset.height || '알 수 없음',
            aspectRatio: photoAsset.width && photoAsset.height ? 
              (photoAsset.width / photoAsset.height).toFixed(2) : '알 수 없음',
            megapixels: photoAsset.width && photoAsset.height ? 
              ((photoAsset.width * photoAsset.height) / 1000000).toFixed(2) : '알 수 없음',
            orientation: photoAsset.width && photoAsset.height ? 
              (photoAsset.width > photoAsset.height ? '가로' : '세로') : '알 수 없음'
          });
          
          // 💾 파일 정보
          console.log('💾 [CameraScreen] 파일 정보:', {
            fileSize: photoAsset.fileSize ? `${(photoAsset.fileSize / 1024 / 1024).toFixed(2)} MB` : '알 수 없음',
            fileSizeBytes: photoAsset.fileSize || '알 수 없음',
            mimeType: photoAsset.type || '알 수 없음',
            fileName: photoAsset.fileName || '알 수 없음'
          });
          
          // 🔍 전체 메타데이터 객체 출력
          console.log('🔍 [CameraScreen] 전체 메타데이터 객체:', JSON.stringify(photoAsset, null, 2));
          
          setCurrentPhoto(photoUri);
          setCurrentPhotoFileName(photoAsset.fileName || 'photo.jpg');
          setCurrentPhotoMimeType(photoAsset.type || 'image/jpeg');
          setPhotoTaken(true);
          Alert.alert('사진 촬영 완료!', '과거와 현재가 합쳐진 사진이 촬영되었습니다.');
        }
      }
    } catch (error) {
      console.error('사진 촬영 실패:', error);
      Alert.alert('오류', '사진 촬영에 실패했습니다.');
    }
  };

  const handleRetakePhoto = () => {
    setPhotoTaken(false);
    setCurrentPhoto(null);
    setCurrentPhotoFileName(null);
    setCurrentPhotoMimeType(null);
  };

  const handleSaveToGallery = async () => {
    try {
      // 인증 토큰 가져오기
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      console.log('[CameraScreen] 토큰 확인:', {
        hasAccessToken: !!tokens.access,
        tokenLength: tokens.access?.length,
        tokenPreview: tokens.access?.substring(0, 20) + '...'
      });

      // FormData 구성 확인
      if (!currentPhoto) {
        console.error('[CameraScreen] 현재 사진이 없습니다.');
        Alert.alert('오류', '촬영된 사진이 없습니다.');
        return;
      }

      console.log('[CameraScreen] 사진 정보:', {
        photoUri: currentPhoto,
        photoType: typeof currentPhoto,
        photoLength: currentPhoto?.length,
        // 🖼️ 추가된 상세 사진 정보
        fileName: currentPhoto?.split('/').pop() || '알 수 없음',
        fileExtension: currentPhoto?.split('.').pop() || '알 수 없음',
        cachePath: currentPhoto?.includes('/cache/') ? '캐시 경로' : '다른 경로',
        // 📏 파일 경로 분석
        pathInfo: {
          isFileUri: currentPhoto?.startsWith('file://'),
          isCacheFile: currentPhoto?.includes('rn_image_picker_lib_temp'),
          isJpgFile: currentPhoto?.endsWith('.jpg'),
          isPngFile: currentPhoto?.endsWith('.png'),
        }
      });
      
      // 🖼️ 추가: Image.getSize로 실제 이미지 크기 가져오기
      if (currentPhoto) {
        console.log('📏 [CameraScreen] 이미지 크기 정보 가져오기 시작...');
        
        // Image.getSize를 Promise로 감싸기
        const getImageSize = (uri: string): Promise<{width: number, height: number}> => {
          return new Promise((resolve, reject) => {
            Image.getSize(uri, (width, height) => {
              resolve({ width, height });
            }, (error) => {
              reject(error);
            });
          });
        };
        
        try {
          const { width, height } = await getImageSize(currentPhoto);
          console.log('📏 [CameraScreen] 🎯 실제 이미지 크기 정보:', {
            width: width,
            height: height,
            aspectRatio: (width / height).toFixed(2),
            megapixels: ((width * height) / 1000000).toFixed(2),
            orientation: width > height ? '가로' : '세로',
            totalPixels: width * height
          });
        } catch (error) {
          console.log('📏 [CameraScreen] 이미지 크기 가져오기 실패:', error);
        }
      }
      
      // 🔍 추가: 파일 시스템에서 파일 정보 가져오기 시도
      try {
        const { stat } = require('react-native-fs');
        if (currentPhoto && currentPhoto.startsWith('file://')) {
          const filePath = currentPhoto.replace('file://', '');
          stat(filePath).then((fileStats: any) => {
            console.log('📁 [CameraScreen] 파일 시스템 정보:', {
              size: fileStats.size ? `${(fileStats.size / 1024 / 1024).toFixed(2)} MB` : '알 수 없음',
              sizeBytes: fileStats.size || '알 수 없음',
              lastModified: fileStats.lastModified ? new Date(fileStats.lastModified).toISOString() : '알 수 없음',
              isFile: fileStats.isFile,
              isDirectory: fileStats.isDirectory,
              path: filePath
            });
          }).catch((fsError: any) => {
            console.log('📁 [CameraScreen] 파일 시스템 정보 가져오기 실패:', fsError);
          });
        }
      } catch (fsError) {
        console.log('📁 [CameraScreen] react-native-fs 모듈 없음, 파일 시스템 정보 생략');
      }
      
      // 백엔드에서 사용자의 현재 진행 중인 코스 정보 가져오기
      console.log('[CameraScreen] 사용자 코스 정보 가져오기 시작 (올바른 엔드포인트: /v1/routes/user_routes/)');
      let routeId = null;
      
      // 토큰 갱신 시도
      console.log('[CameraScreen] 토큰 갱신 시도...');
      try {
        await authService.refreshToken();
        const refreshedTokens = await authService.getTokens();
        if (refreshedTokens?.access) {
          console.log('[CameraScreen] 토큰 갱신 성공');
        } else {
          console.log('[CameraScreen] 토큰 갱신 실패, 기존 토큰 사용');
        }
      } catch (refreshError) {
        console.log('[CameraScreen] 토큰 갱신 중 오류 (기존 토큰 사용):', refreshError);
      }
      
      try {
        const userRoutesResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/user_routes/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokens.access}`,
            'Content-Type': 'application/json',
          },
        });

        if (userRoutesResponse.ok) {
          const userRoutesData = await userRoutesResponse.json();
          console.log('[CameraScreen] 사용자 코스 데이터:', userRoutesData);
          
          if (userRoutesData && userRoutesData.length > 0) {
            // 가장 최근에 생성된 코스의 route_id 사용
            routeId = userRoutesData[0].route_id;
            console.log('[CameraScreen] 현재 진행 중인 코스 ID:', routeId);
          } else {
            console.warn('[CameraScreen] 사용자의 진행 중인 코스가 없습니다.');
            Alert.alert('오류', '진행 중인 코스가 없습니다. 먼저 코스를 생성해주세요.');
            return;
          }
        } else {
          console.error('[CameraScreen] 사용자 코스 조회 실패:', {
            status: userRoutesResponse.status,
            statusText: userRoutesResponse.statusText,
            headers: Object.fromEntries(userRoutesResponse.headers.entries())
          });
          
          if (userRoutesResponse.status === 401) {
            console.error('[CameraScreen] 401 인증 실패 상세:', {
              tokenExists: !!tokens.access,
              tokenLength: tokens.access?.length,
              tokenPreview: tokens.access?.substring(0, 50) + '...',
              authorizationHeader: `Bearer ${tokens.access}`,
              requestUrl: `${BACKEND_API.BASE_URL}/v1/routes/user_routes/`
            });
            Alert.alert('인증 오류', '로그인이 만료되었습니다. 다시 로그인해주세요.');
          } else {
            Alert.alert('오류', '사용자 코스 정보를 가져올 수 없습니다.');
          }
          return;
        }
      } catch (routeError) {
        console.error('[CameraScreen] 사용자 코스 조회 중 에러:', routeError);
        Alert.alert('오류', '사용자 코스 정보를 가져오는 중 오류가 발생했습니다.');
        return;
      }

      // ✅ 수정 완료: 백엔드에서 가져온 실제 route_id 사용
      const spotId = mission.id; // mission.id는 실제로 spot_id
      
      // 단순 JSON 방식: 사진 URI를 문자열로 전송
      const requestData = {
        image_url: currentPhoto, // 로컬 file:// URI를 그대로 문자열로 전송
        route_id: routeId,
        spot_id: spotId
      };
      
      console.log('[CameraScreen] JSON 데이터 구성:', {
        requestData: requestData,
        imageUri: currentPhoto,
        imageUriType: typeof currentPhoto,
        imageUriLength: currentPhoto?.length
      });
      
      // 백엔드 엔드포인트는 트레일링 슬래시 포함: '<int:route_id>/<int:spot_id>/'
      const apiUrl = `${BACKEND_API.BASE_URL}/v1/photos/${routeId}/${spotId}/`;
      console.log('[CameraScreen] API 요청 정보 (수정됨):', {
        url: apiUrl,
        method: 'POST',
        routeId: routeId,
        spotId: spotId,
        baseUrl: BACKEND_API.BASE_URL,
        fullUrl: apiUrl
      });

      // URL 구성 요소별 상세 로그 (백엔드 연동)
      console.log('[CameraScreen] URL 구성 상세 (백엔드 연동):', {
        'BACKEND_API.BASE_URL': BACKEND_API.BASE_URL,
        'routeId (백엔드에서 가져옴)': routeId,
        'spotId (mission.id)': spotId,
        '경로 조각': '/v1/photos/',
        '최종 URL': `${BACKEND_API.BASE_URL}/v1/photos/${routeId}/${spotId}`,
        'URL 타입': typeof apiUrl,
        'URL 길이': apiUrl.length
      });

      // URL 유효성 사전 체크 (백엔드 연동)
      console.log('[CameraScreen] URL 유효성 사전 체크 (백엔드 연동):', {
        baseUrlEmpty: !BACKEND_API.BASE_URL,
        baseUrlType: typeof BACKEND_API.BASE_URL,
        baseUrlValue: `"${BACKEND_API.BASE_URL}"`,
        routeIdEmpty: !routeId,
        routeIdType: typeof routeId,
        routeIdValue: `"${routeId}"`,
        spotIdEmpty: !spotId,
        spotIdType: typeof spotId,
        spotIdValue: `"${spotId}"`,
        finalUrl: `"${apiUrl}"`
      });

      // ✅ 수정 완료: 백엔드 연동 URL 구성
      console.log('[CameraScreen] ✅ 백엔드 연동 URL 구성 완료:', {
        '이전 하드코딩된 URL': `${BACKEND_API.BASE_URL}/v1/photos/1/${mission.id}`,
        '현재 백엔드 연동 URL': `"${apiUrl}"`,
        '수정 내용': {
          'route_id': `하드코딩 (1) → 백엔드 API (${routeId})`,
          'spot_id': `mission.id (${mission.id})`
        }
      });

      // 요청 헤더 확인
      const headers: any = {
        'Authorization': `Bearer ${tokens.access}`,
        'Content-Type': 'application/json',
      };
      
      console.log('[CameraScreen] 요청 헤더:', headers);
      
      // 연결 확인 (간단 GET)
      try {
        console.log('[CameraScreen] 서버 연결 확인 시작');
        const ping = await fetch(`${BACKEND_API.BASE_URL}/v1/photos/`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${tokens.access}` },
        });
        console.log('[CameraScreen] 서버 연결 확인 응답:', { status: ping.status, ok: ping.ok });
      } catch (pingErr) {
        console.error('[CameraScreen] 서버 연결 확인 실패:', pingErr);
      }

      // 네트워크 요청 시작 시간 기록
      const startTime = Date.now();
      console.log('[CameraScreen] 네트워크 요청 시작:', new Date(startTime).toISOString());
      console.log('[CameraScreen] 실제 요청할 URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
      });

      const endTime = Date.now();
      console.log('[CameraScreen] 네트워크 요청 완료:', {
        duration: endTime - startTime,
        timestamp: new Date(endTime).toISOString()
      });

      console.log('[CameraScreen] 응답 정보:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const responseData = await response.text();
        console.log('[CameraScreen] 응답 데이터:', responseData);
        
        Alert.alert(
          '갤러리 저장 완료! 🎉',
          '과거와 현재가 합쳐진 사진이 갤러리에 저장되었습니다!',
          [
            {
              text: '갤러리 보기',
              onPress: () => {
                navigation.navigate('Gallery');
              }
            },
            {
              text: '홈으로',
              onPress: () => {
                navigation.navigate('MainTabs');
              }
            }
          ]
        );
      } else {
        const errorText = await response.text();
        console.error('[CameraScreen] 갤러리 저장 실패:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          headers: Object.fromEntries(response.headers.entries())
        });
        Alert.alert('오류', `갤러리 저장에 실패했습니다. (${response.status})`);
      }
    } catch (error) {
      console.error('[CameraScreen] 갤러리 저장 에러 상세:', {
        error: error,
        errorType: typeof error,
        errorMessage: error?.message,
        errorStack: error?.stack,
        errorName: error?.name,
        errorCode: error?.code,
        errorCause: error?.cause
      });
      
      // 모든 에러에서 URL 정보 출력
      console.error('[CameraScreen] 에러 발생 시 URL 정보:', {
        'BACKEND_API.BASE_URL 값': `"${BACKEND_API.BASE_URL}"`,
        // routeId/spotId는 try 블록 내 지역변수이므로 여기서는 출력 생략
        '전체 URL (백엔드 연동)': 'try 블록 로그 참고',
        'URL 유효성': {
          baseUrlEmpty: !BACKEND_API.BASE_URL,
          baseUrlType: typeof BACKEND_API.BASE_URL,
          // routeId/spotId 검증은 요청 직전에 이미 로그로 출력됨
        }
      });
      
              // 네트워크 관련 에러인지 확인
        if (error?.message?.includes('Network request failed')) {
          console.error('[CameraScreen] 네트워크 요청 실패 상세:', {
            apiUrl: '요청 URL은 try 블록 상단 로그 참고',
            baseUrl: BACKEND_API.BASE_URL,
            networkState: '네트워크 연결 상태 확인 필요',
            errorDetails: {
              message: error.message,
              name: error.name,
              stack: error.stack
            }
          });
        
        // 네트워크 상태 추가 확인
        console.log('[CameraScreen] 네트워크 상태 확인:', {
          userAgent: navigator.userAgent,
          onLine: navigator.onLine,
          connection: (navigator as any).connection,
          platform: Platform.OS,
          version: Platform.Version
        });
      }
      
      Alert.alert('오류', '갤러리 저장 중 오류가 발생했습니다: ' + (error?.message || '알 수 없는 오류'));
    }
  };

  const handleBackToMap = () => {
    navigation.navigate('Map');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>카메라 권한을 요청 중...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>카메라 권한이 거부되었습니다.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>권한 다시 요청</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* 카메라 프리뷰 영역 */}
      <View style={styles.cameraPreview}>
        {currentPhoto ? (
          // 촬영된 사진 표시
          <Image source={{ uri: currentPhoto }} style={styles.capturedImage} resizeMode="cover" />
        ) : (
          // 카메라 프리뷰 (실제 카메라는 촬영 시에만 열림)
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraText}>📸 카메라 프리뷰</Text>
            <Text style={styles.cameraSubText}>현재 위치의 모습이 여기에 표시됩니다</Text>
            <Text style={styles.cameraInstruction}>촬영 버튼을 눌러 실제 카메라를 열어보세요</Text>
          </View>
        )}
        
        {/* 격자선 오버레이 */}
        <View style={styles.gridOverlay}>
          {[...Array(3)].map((_, i) => (
            <View key={`h${i}`} style={[styles.gridLine, styles.horizontalLine, { top: `${33.33 * i}%` }]} />
          ))}
          {[...Array(3)].map((_, i) => (
            <View key={`v${i}`} style={[styles.gridLine, styles.verticalLine, { left: `${33.33 * i}%` }]} />
          ))}
        </View>

        {/* 과거 사진 오버레이 */}
        {currentMode === 'overlay' && selectedPhoto && (
          <View style={[styles.historicalOverlay, { opacity: overlayOpacity }]}>
            <Image
              source={{ uri: selectedPhoto.past_image_url }}
              style={[styles.historicalImage, { transform: [{ scale: zoomLevel }] }]}
              resizeMode="cover"
            />
            {/* 과거 사진에도 격자선 */}
            <View style={styles.gridOverlay}>
              {[...Array(3)].map((_, i) => (
                <View key={`h${i}`} style={[styles.gridLine, styles.horizontalLine, { top: `${33.33 * i}%` }]} />
              ))}
              {[...Array(3)].map((_, i) => (
                <View key={`v${i}`} style={[styles.gridLine, styles.verticalLine, { left: `${33.33 * i}%` }]} />
              ))}
            </View>
          </View>
        )}

        {/* 과거 사진만 보기 */}
        {currentMode === 'past' && selectedPhoto && (
          <View style={styles.historicalOnly}>
            <Image
              source={{ uri: selectedPhoto.past_image_url }}
              style={styles.historicalImage}
              resizeMode="cover"
            />
            <View style={styles.gridOverlay}>
              {[...Array(3)].map((_, i) => (
                <View key={`h${i}`} style={[styles.gridLine, styles.horizontalLine, { top: `${33.33 * i}%` }]} />
              ))}
              {[...Array(3)].map((_, i) => (
                <View key={`v${i}`} style={[styles.gridLine, styles.verticalLine, { left: `${33.33 * i}%` }]} />
              ))}
            </View>
          </View>
        )}
      </View>

      {/* 줌 컨트롤 */}
      <View style={styles.zoomControl}>
        <TouchableOpacity 
          style={[styles.zoomButton, zoomLevel === 0.5 && styles.zoomButtonActive]}
          onPress={() => handleZoomChange(0.5)}
        >
          <Text style={[styles.zoomText, zoomLevel === 0.5 && styles.zoomTextActive]}>-5</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.zoomButton, zoomLevel === 1 && styles.zoomButtonActive]}
          onPress={() => handleZoomChange(1)}
        >
          <Text style={[styles.zoomText, zoomLevel === 1 && styles.zoomTextActive]}>1X</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.zoomButton, zoomLevel === 3 && styles.zoomButtonActive]}
          onPress={() => handleZoomChange(3)}
        >
          <Text style={[styles.zoomText, zoomLevel === 3 && styles.zoomTextActive]}>3</Text>
        </TouchableOpacity>
      </View>

      {/* 하단 컨트롤 영역 */}
      <View style={styles.bottomControls}>
        {/* 모드 선택 */}
        <View style={styles.modeSelector}>
          <TouchableOpacity 
            style={[styles.modeButton, currentMode === 'past' && styles.modeButtonActive]}
            onPress={() => handleModeChange('past')}
          >
            <Text style={[styles.modeText, currentMode === 'past' && styles.modeTextActive]}>과거</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeButton, currentMode === 'overlay' && styles.modeButtonActive]}
            onPress={() => handleModeChange('overlay')}
          >
            <Text style={[styles.modeText, currentMode === 'overlay' && styles.modeTextActive]}>함께 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeButton, currentMode === 'current' && styles.modeButtonActive]}
            onPress={() => handleModeChange('current')}
          >
            <Text style={[styles.modeText, currentMode === 'current' && styles.modeTextActive]}>현재</Text>
          </TouchableOpacity>
        </View>

        {/* 촬영/저장 버튼 */}
        <View style={styles.actionButtons}>
          {!photoTaken ? (
            <TouchableOpacity style={styles.takePhotoButton} onPress={handleTakePhoto}>
              <Text style={styles.takePhotoButtonText}>촬영</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetakePhoto}>
              <Text style={styles.retakeButtonText}>재촬영</Text>
            </TouchableOpacity>
          )}
          
          {photoTaken && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveToGallery}>
              <Text style={styles.saveButtonText}>저장하기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraPreview: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cameraText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cameraSubText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  cameraInstruction: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  permissionButton: {
    backgroundColor: INCHEON_BLUE,
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  horizontalLine: {
    height: 1,
    width: '100%',
  },
  verticalLine: {
    width: 1,
    height: '100%',
  },
  historicalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historicalOnly: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  historicalImage: {
    width: '100%',
    height: '100%',
  },
  zoomControl: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  zoomButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomButtonActive: {
    backgroundColor: INCHEON_BLUE,
  },
  zoomText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  zoomTextActive: {
    color: 'white',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  modeButtonActive: {
    backgroundColor: INCHEON_BLUE,
  },
  modeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  modeTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 20,
  },
  takePhotoButton: {
    backgroundColor: INCHEON_BLUE,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    flex: 1,
    alignItems: 'center',
  },
  takePhotoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retakeButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    flex: 1,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    flex: 1,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CameraScreen;