import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import ViewShot from 'react-native-view-shot';
import Slider from '@react-native-community/slider';
import Ionicons from '@react-native-vector-icons/ionicons';

import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// 1. 실제로 사진이 찍힐 4:3 비율의 높이를 계산
const cameraHeight = screenWidth * (4 / 3);
// 2. 화면의 남는 세로 공간을 계산하여 위아래 검은 여백(레터박스)의 높이
const topBottomBarHeight = (screenHeight - cameraHeight) / 2;

interface PastImageData {
  id: number;
  name: string;
  past_image_url: string;
  address: string;
}

export default function CameraScreen({ route, navigation }: any) {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const viewShotRef = useRef<ViewShot>(null);
  const [hasPermission, setHasPermission] = useState(false); // 👈 권한 상태를 관리할 state

  // 원본 이미지 크기를 저장할 state 추가
  const [originalImgSize, setOriginalImgSize] = useState({ width: 0, height: 0 });
	const [overlayPhoto, setOverlayPhoto] = useState<PastImageData | null>(null);
  const [overlayScale, setOverlayScale] = useState(0.2);
	const [overlayOpacity, setOverlayOpacity] = useState(1); // 👈 투명도 state
  const [showControls, setShowControls] = useState(false); // 👈 컨트롤 패널 표시 여부 state
	const [isCapturing, setIsCapturing] = useState(false); // 👈 캡처 상태를 위한 state 추가
  useEffect(() => {
    // route.params에서 selectedPhoto 가져와서 state에 설정
    if (route.params?.selectedPhoto) {
      const photoData = route.params.selectedPhoto;
      console.log('[CameraScreen] MissionScreen에서 받은 사진:', photoData);
      setOverlayPhoto(photoData);


    if (photoData.past_image_url) {
      Image.getSize(photoData.past_image_url, (width, height) => {
        console.log('가져온 원본 이미지 크기:', { width, height });
        setOriginalImgSize({ width, height });
      }, (error) => {
        console.error('이미지 크기를 가져오는 데 실패했습니다:', error);
      });
    }
  }
    // 앱 시작 시 카메라 권한 요청
	  const requestPermission = async () => {
	    try {
	      const status = await Camera.getCameraPermissionStatus();
	      console.log('[CameraScreen] 카메라 권한 상태:', status);

	      if (status === 'granted') {
	        setHasPermission(true);
	      } else {
	        const newPermission = await Camera.requestCameraPermission();
	        console.log('[CameraScreen] 권한 요청 결과:', newPermission);

	        if (newPermission === 'granted') {
	          setHasPermission(true);
	        } else if (newPermission === 'denied') {
	          // 권한이 거부된 경우 설정으로 이동할 수 있는 옵션 제공
	          Alert.alert(
	            "카메라 권한 필요",
	            "시간여행 사진 촬영을 위해 카메라 권한이 필요합니다.\n설정에서 권한을 허용해주세요.",
	            [
	              { text: "취소", style: "cancel" },
	              { text: "설정으로 이동", onPress: () => Linking.openSettings() }
	            ]
	          );
	        } else {
	          Alert.alert("권한 필요", "카메라 권한을 허용해야 촬영할 수 있습니다.");
	        }
	      }
	    } catch (error) {
	      console.error('[CameraScreen] 권한 요청 오류:', error);
	      setHasPermission(false);
	    }
	  };
	  requestPermission();
  }, []);

  // 사진 촬영, 이동, 경로 저장을 모두 처리하는 함수
	const handleTakePhoto = async () => {
	  if (camera.current && overlayPhoto) {
	    try {
	      // 카메라로 촬영
	      const backgroundPhoto = await camera.current.takePhoto();
	      const backgroundImageUri = `file://${backgroundPhoto.path}`;

	      console.log('배경 사진 촬영 완료:', backgroundImageUri);

	      // 합성 위한 위치, 크기 계산
        const displayWidth = originalImgSize.width * overlayScale;
        const displayHeight = originalImgSize.height * overlayScale;
        const x = (screenWidth - displayWidth) / 2;
        const y = (screenHeight - displayHeight) / 2;
	      // 합성할 정보들을 모아서 다음 화면으로 전달
	      const paramsToNavigate = {
	        backgroundImageUri,
	        overlayImageUri: overlayPhoto.past_image_url,
	        displayWidth,
	        displayHeight,
	        x,
	        y,
	        opacity: overlayOpacity,
	        selectedPhoto: overlayPhoto,
	      };
	      console.log("ImageSaveScreen으로 보내는 파라미터:", paramsToNavigate);

	      navigation.navigate('ImageSaveScreen', paramsToNavigate);

	    } catch (e) {
	      console.error('사진 촬영 실패:', e);
	      Alert.alert('오류', '사진 촬영 중 문제가 발생했습니다.');
	    }
	  }
	};


  // 카메라 장치를 찾지 못했을 때
  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>카메라 장치를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  // 카메라 권한이 없을 때
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>카메라 권한이 필요합니다.</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            Alert.alert(
              "카메라 권한 필요",
              "시간여행 사진 촬영을 위해 카메라 권한이 필요합니다.",
              [
                { text: "취소", style: "cancel" },
                { text: "설정으로 이동", onPress: () => Linking.openSettings() }
              ]
            );
          }}
        >
          <Text style={styles.permissionButtonText}>권한 설정</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const displayWidth = originalImgSize.width * overlayScale;
  const displayHeight = originalImgSize.height * overlayScale;
  const x = (screenWidth - displayWidth) / 2;
  const y = (screenHeight - displayHeight) / 2;

// CameraScreen.tsx 파일에서 return 문부터 styles까지 아래 코드로 통째로 교체하세요.

return (
  <ViewShot ref={viewShotRef} style={{ flex: 1 }} options={{ format: 'jpg', quality: 0.9 }}>
    <TouchableWithoutFeedback onPress={() => {
       if (showControls) {
         setShowControls(false);
       }
     }}>

      <View style={styles.fullScreenContainer}>

        {/* 상단 검은색 바 */}
        <View style={styles.topBottomBar} />

         {/* 카메라와 오버레이를 담을 4:3 비율의 중앙 컨테이너 */}
         <View style={styles.cameraContainer}>
           <Camera
             ref={camera}
             style={styles.camera}
             device={device}
             isActive={hasPermission}
             photo={true}
             enableZoomGesture={false}
             enableFpsGraph={false}
           />

          {overlayPhoto && originalImgSize.width > 0 && (
            <Image
              source={{ uri: overlayPhoto.past_image_url }}
              style={{
                position: 'absolute',
                width: displayWidth,
                height: displayHeight,
                opacity: overlayOpacity,
              }}
              resizeMode="contain"
            />
          )}
        </View>

        {/* 하단 검은색 바와 컨트롤 UI */}
        <View style={styles.bottomBar}>
          {!isCapturing && (
            <View style={styles.bottomControlsContainer}>

              {/* 컨트롤 패널 */}
              {showControls && (
                <TouchableWithoutFeedback>
                  <View style={styles.controlsPanel}>
                    {/* 투명도 조절 슬라이더 */}
                    <View style={styles.sliderRow}>
                      <Text style={styles.sliderLabel}>투명도</Text>
                      <Slider
                        style={styles.slider}
                        minimumValue={0.2}
                        maximumValue={1}
                        value={overlayOpacity}
                        onValueChange={setOverlayOpacity}
                        minimumTrackTintColor="#FFFFFF"
                        maximumTrackTintColor="#AAAAAA"
                        thumbTintColor="#FFFFFF"
                      />
                    </View>
                    {/* 크기 조절 슬라이더 */}
                    <View style={styles.sliderRow}>
                      <Text style={styles.sliderLabel}>크기</Text>
                      <Slider
                        style={styles.slider}
                        minimumValue={0.2}
                        maximumValue={1.5}
                        value={overlayScale}
                        onValueChange={setOverlayScale}
                        minimumTrackTintColor="#FFFFFF"
                        maximumTrackTintColor="#AAAAAA"
                        thumbTintColor="#FFFFFF"
                      />
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              )}

              {/* '조절' 버튼 (패널이 닫혀 있을 때만 보임) */}
              {!showControls && (
                <TouchableOpacity
                  style={styles.controlsToggleButton}
                  onPress={() => setShowControls(true)}
                >
                  <Ionicons name="options" size={24} color="white" />
                  <Text style={styles.controlsToggleButtonText}>조절</Text>
                </TouchableOpacity>
              )}

              {/* 촬영 버튼 */}
              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleTakePhoto}
              />
            </View>
          )}
        </View>
      </View>

     </TouchableWithoutFeedback>
   </ViewShot>
 );
}

const styles = StyleSheet.create({
 fullScreenContainer: {
   flex: 1,
   backgroundColor: 'black',
 },
 topBottomBar: {
   height: topBottomBarHeight,
   width: '100%',
   backgroundColor: 'black',
 },
 bottomBar: {
   height: topBottomBarHeight,
   width: '100%',
   backgroundColor: 'black',
   justifyContent: 'center',
   alignItems: 'center',
 },
  cameraContainer: {
    width: screenWidth,
    height: cameraHeight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // 카메라 영역을 명확히 제한
  },
  camera: {
    width: '100%',
    height: '100%',
  },
 bottomControlsContainer: {
   position: 'absolute',
   width: '100%',
   alignItems: 'center',
   marginBottom: 200
 },
 controlsPanel: {
   backgroundColor: 'rgba(0, 0, 0, 0.6)',
   borderRadius: 15,
   paddingVertical: 10,
   paddingHorizontal: 20,
   marginBottom: 20,
   width: '85%',
 },
 sliderRow: {
   flexDirection: 'row',
   alignItems: 'center',
   marginVertical: 5,
 },
 sliderLabel: {
   color: 'white',
   fontSize: 14,
   fontWeight: '600',
   width: 60,
 },
 slider: {
   flex: 1,
 },
 controlsToggleButton: {
   flexDirection: 'row',
   alignItems: 'center',
   backgroundColor: 'rgba(0, 0, 0, 0.5)',
   paddingVertical: 8,
   paddingHorizontal: 15,
   borderRadius: 20,
   marginBottom: 20,
 },
 controlsToggleButtonText: {
   color: 'white',
   fontSize: 16,
   fontWeight: 'bold',
   marginLeft: 8,
 },
 captureButton: {
   width: 70,
   height: 70,
   borderRadius: 35,
   backgroundColor: 'white',
   borderWidth: 5,
   borderColor: '#E0E0E0',
 },
});