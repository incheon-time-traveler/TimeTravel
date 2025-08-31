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
        const photoUri = response.assets[0].uri;
        if (photoUri) {
          setCurrentPhoto(photoUri);
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
  };

  const handleSaveToGallery = async () => {
    try {
      // 인증 토큰 가져오기
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      // 갤러리에 사진 저장 API 호출 (백엔드 URL 패턴에 맞춤)
      console.log('[CameraScreen] API 호출:', {
        url: `${BACKEND_API.BASE_URL}/v1/photos/${mission.id}/${selectedPhoto.id}`,
        missionId: mission.id,
        selectedPhotoId: selectedPhoto.id
      });
      
      // FormData 사용 (ImageField 처리용)
      const formData = new FormData();
      if (currentPhoto) {
        formData.append('image_url', {
          uri: currentPhoto,
          type: 'image/jpeg',
          name: 'photo.jpg'
        } as any);
      }
      
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/photos/${mission.id}/${selectedPhoto.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
          // FormData 사용 시 Content-Type은 자동으로 설정됨
        },
        body: formData,
      });

      if (response.ok) {
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
        console.error('[CameraScreen] 갤러리 저장 실패:', response.status);
        Alert.alert('오류', '갤러리 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('[CameraScreen] 갤러리 저장 에러:', error);
      Alert.alert('오류', '갤러리 저장 중 오류가 발생했습니다.');
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