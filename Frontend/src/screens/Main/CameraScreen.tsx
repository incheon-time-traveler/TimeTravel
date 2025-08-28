import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { INCHEON_BLUE, INCHEON_GRAY } from '../../styles/fonts';
import { Mission } from '../../types/mission';

const { width, height } = Dimensions.get('window');

interface CameraScreenProps {
  route: {
    params: {
      mission: Mission;
      selectedPhotoId: number;
    };
  };
  navigation: any;
}

const CameraScreen: React.FC<CameraScreenProps> = ({ route, navigation }) => {
  const { mission, selectedPhotoId } = route.params;
  const [photoTaken, setPhotoTaken] = useState(false);
  const [currentMode, setCurrentMode] = useState<'past' | 'overlay' | 'current'>('overlay');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);

  useEffect(() => {
    // 화면 진입 시 미션 완료 알림
    Alert.alert(
      '미션 완료! 🎉',
      `${mission.location.name}의 과거 사진을 성공적으로 선택했습니다!\n이제 현재 모습을 촬영해보세요.`,
      [{ text: '확인' }]
    );
  }, []);

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

  const handleTakePhoto = () => {
    setPhotoTaken(true);
    Alert.alert('사진 촬영 완료!', '과거와 현재가 합쳐진 사진이 촬영되었습니다.');
  };

  const handleRetakePhoto = () => {
    setPhotoTaken(false);
  };

  const handleSaveToGallery = () => {
    Alert.alert(
      '갤러리 저장',
      '과거와 현재가 합쳐진 사진이 갤러리에 저장되었습니다!',
      [
        {
          text: '확인',
          onPress: () => {
            navigation.navigate('MainTabs');
          }
        }
      ]
    );
  };

  const handleBackToMap = () => {
    navigation.navigate('Map');
  };

  const selectedPhoto = mission.historicalPhotos.find((p: any) => p.id === selectedPhotoId);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* 카메라 피드 (배경 이미지) */}
      <View style={styles.cameraFeed}>
        <Image
          source={require('../../assets/images/대불호텔.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        
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
              source={selectedPhoto.imageUrl as any}
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
              source={selectedPhoto.imageUrl as any}
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
  cameraFeed: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
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