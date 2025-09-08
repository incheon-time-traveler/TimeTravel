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
import ViewShot from 'react-native-view-shot';
import { INCHEON_BLUE, INCHEON_GRAY } from '../../styles/fonts';
import { Mission } from '../../types/mission';
import { BACKEND_API } from '../../config/apiKeys';
import authService from '../../services/authService';
import { completeMission } from '../../data/missions';

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
  const [compositePhoto, setCompositePhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // ViewShot ref for capturing composite image
  const viewShotRef = useRef<ViewShot>(null);

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
          
          // 합성 이미지 생성
          setTimeout(async () => {
            console.log('[CameraScreen] 합성 이미지 생성 시작...');
            const compositeUri = await generateCompositeImage();
            if (compositeUri) {
              console.log('[CameraScreen] 합성 이미지 생성 성공:', compositeUri);
              console.log('[CameraScreen] 합성 이미지 URL 길이:', compositeUri.length);
            } else {
              console.warn('[CameraScreen] 합성 이미지 생성 실패');
            }
          }, 1000); // 1초 후 합성 이미지 생성
          
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
    setCompositePhoto(null);
  };

  // 합성 이미지 생성 함수
  const generateCompositeImage = async () => {
    try {
      if (!viewShotRef.current) {
        console.error('[CameraScreen] ViewShot ref가 없습니다.');
        return null;
      }

      console.log('[CameraScreen] 합성 이미지 생성 시작...');
      
      // ViewShot에서 fileName 옵션을 제거하고 기본 파일명 사용
      const uri = await viewShotRef.current.capture({
        format: "jpg",
        quality: 0.8
      });
      
      console.log('[CameraScreen] 합성 이미지 생성 완료:', uri);
      console.log('[CameraScreen] 합성 이미지 URL 길이:', uri.length);
      
      // 파일명을 수동으로 정리
      let cleanUri = uri;
      if (uri && uri.includes('composite_')) {
        // composite_로 시작하는 파일명을 찾아서 정리
        const match = uri.match(/composite_\d+\.jpg/);
        if (match) {
          const cleanFileName = match[0];
          cleanUri = uri.replace(/composite_\d+\.jpg.*\.jpg$/, cleanFileName);
          console.log('[CameraScreen] 파일명 정리:', {
            original: uri,
            cleaned: cleanUri
          });
        }
      }
      
      setCompositePhoto(cleanUri);
      return cleanUri;
    } catch (error) {
      console.error('[CameraScreen] 합성 이미지 생성 실패:', error);
      return null;
    }
  };

  const handleSaveToGallery = async () => {
    // 중복 저장 방지
    if (isSaving) {
      console.log('[CameraScreen] 이미 저장 중입니다.');
      return;
    }

    try {
      setIsSaving(true);
      
      // 인증 토큰 가져오기
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      // 사진이 있는지 확인
      if (!currentPhoto) {
        Alert.alert('오류', '촬영된 사진이 없습니다.');
        return;
      }

      // 합성 이미지가 있으면 우선 사용, 없으면 원본 사진 사용
      // selectedPhoto.past_image_url은 절대 사용하지 않음!
      let photoToSave;
      if (compositePhoto && compositePhoto.trim() !== '' && compositePhoto.startsWith('file://')) {
        photoToSave = compositePhoto;
        console.log('[CameraScreen] 합성 이미지 사용:', compositePhoto);
      } else if (currentPhoto && currentPhoto.trim() !== '' && currentPhoto.startsWith('file://')) {
        photoToSave = currentPhoto;
        console.log('[CameraScreen] 원본 사진 사용:', currentPhoto);
      } else {
        Alert.alert('오류', '저장할 수 있는 사진이 없습니다.');
        return;
      }
      
      console.log('[CameraScreen] 사진 저장 시작:', {
        originalPhoto: currentPhoto,
        compositePhoto: compositePhoto,
        photoToSave: photoToSave,
        photoLength: photoToSave ? photoToSave.length : 0,
        missionId: mission.id,
        isComposite: !!compositePhoto,
        selectedPhoto: selectedPhoto?.past_image_url
      });

      // 미션에서 가져온 실제 route_id와 spot_id 사용
      const routeId = mission.routeId || 1; // 미션의 routeId 사용
      const spotId = mission.id; // mission.id는 spot_id
      
      console.log('[CameraScreen] 저장할 ID 정보:', {
        missionId: mission.id,
        routeId: routeId,
        spotId: spotId,
        missionTitle: mission.title
      });

      // 사진 URL 유효성 검증
      if (!photoToSave || photoToSave.trim() === '') {
        Alert.alert('오류', '저장할 사진이 없습니다.');
        return;
      }

      // 사진 URL 길이 확인 및 처리 (DB 제약조건: 100자)
      let processedPhotoUrl = photoToSave;
      
      if (photoToSave.length > 100) {
        console.warn('[CameraScreen] 사진 URL이 100자를 초과합니다:', photoToSave.length);
        
        // 로컬 파일 경로인 경우 파일명만 추출하여 단축
        if (photoToSave.startsWith('file://')) {
          const fileName = photoToSave.split('/').pop() || 'composite_photo.jpg';
          processedPhotoUrl = `file://${fileName}`;
          console.log('[CameraScreen] URL 단축:', {
            original: photoToSave,
            processed: processedPhotoUrl,
            originalLength: photoToSave.length,
            processedLength: processedPhotoUrl.length
          });
        } else {
          // 다른 URL인 경우 처음 97자 + '...'로 단축
          processedPhotoUrl = photoToSave.substring(0, 97) + '...';
          console.log('[CameraScreen] URL 단축:', {
            original: photoToSave,
            processed: processedPhotoUrl,
            originalLength: photoToSave.length,
            processedLength: processedPhotoUrl.length
          });
        }
        
        // 여전히 100자를 초과하면 에러
        if (processedPhotoUrl.length > 100) {
          Alert.alert(
            'URL 길이 초과',
            '사진 URL이 너무 깁니다. 다른 사진을 촬영해주세요.',
            [{ text: '확인' }]
          );
          return;
        }
      }

      // API 요청 데이터 구성
      const requestData = {
        image_url: processedPhotoUrl,
        route_id: routeId,
        spot_id: spotId
      };
      
      const apiUrl = `${BACKEND_API.BASE_URL}/v1/photos/${routeId}/${spotId}/`;
      
      console.log('[CameraScreen] API 요청 상세:', {
        url: apiUrl,
        requestData: requestData,
        processedPhotoUrl: processedPhotoUrl,
        processedPhotoUrlLength: processedPhotoUrl.length,
        routeId: routeId,
        spotId: spotId
      });
      
      console.log('[CameraScreen] 최종 API 요청:', {
        url: apiUrl,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access?.substring(0, 20)}...`,
          'Content-Type': 'application/json',
        },
        body: requestData
      });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log('[CameraScreen] API 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      console.log('[CameraScreen] 응답:', {
        status: response.status,
        ok: response.ok
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('[CameraScreen] 저장 성공:', responseData);
        
        // 미션 완료 처리는 갤러리에서 자동으로 처리됨 (사진 저장 시 자동 완료)
        console.log('[CameraScreen] 사진 저장 완료 - 미션 완료는 갤러리에서 자동 처리');
        
        Alert.alert(
          '저장 완료! 🎉',
          '사진이 갤러리에 저장되고 미션이 완료되었습니다!',
          [
            {
              text: '갤러리 보기',
              onPress: () => {
                navigation.navigate('MainTabs', { screen: 'Gallery' });
              }
            },
            {
              text: '홈으로',
              onPress: () => {
                navigation.navigate('MainTabs', { screen: 'Home' });
              }
            }
          ]
        );
      } else {
        const errorText = await response.text();
        console.error('[CameraScreen] 저장 실패:', {
          status: response.status,
          error: errorText
        });
        Alert.alert('오류', `저장에 실패했습니다. (${response.status})`);
      }
    } catch (error) {
      console.error('[CameraScreen] 저장 에러:', error);
      Alert.alert('오류', '저장 중 오류가 발생했습니다: ' + (error?.message || '알 수 없는 오류'));
    } finally {
      setIsSaving(false);
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
      
      {/* 카메라 프리뷰 영역 - ViewShot으로 감싸서 합성 이미지 캡처 가능 */}
      <ViewShot
        ref={viewShotRef}
        options={{ 
          format: "jpg", 
          quality: 0.8
        }}
        style={styles.cameraPreview}
      >
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
      </ViewShot>

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
            <TouchableOpacity 
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
              onPress={handleSaveToGallery}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? '저장 중...' : '저장하기'}
              </Text>
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
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
});

export default CameraScreen;