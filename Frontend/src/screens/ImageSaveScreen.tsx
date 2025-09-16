import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { Canvas, Image, Skia, useCanvasRef } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../styles/fonts';
import { BACKEND_API } from '../config/apiKeys';

const { width, height } = Dimensions.get('window');

export default function ImageSaveScreen({ route, navigation }) {
  const {
    backgroundImageUri,
    overlayImageUri,
    displayWidth,
    displayHeight,
    x,
    y,
    opacity,
    selectedPhoto
  } = route.params;
	console.log(route.params)

  const skiaRef = useCanvasRef();
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [overlayImage, setOverlayImage] = useState(null);

  useEffect(() => {
    const loadImages = async () => {
      try {
        // 배경 이미지 로드
        if (backgroundImageUri) {
          const bgData = await Skia.Data.fromURI(backgroundImageUri);
          const bgImage = Skia.Image.MakeImageFromEncoded(bgData);
          setBackgroundImage(bgImage);
        }
        // 오버레이 이미지 로드
        if (overlayImageUri) {
          const ovData = await Skia.Data.fromURI(overlayImageUri);
          const ovImage = Skia.Image.MakeImageFromEncoded(ovData);
          setOverlayImage(ovImage);
        }
      } catch (e) {
        console.error("Skia 이미지 로드 실패:", e);
        Alert.alert("오류", "이미지를 불러오는 데 실패했습니다.");
      }
    };

    loadImages();
  }, [backgroundImageUri, overlayImageUri]); // URI가 바뀔 때만 다시 로드

  const handleSave = async () => {
    if (!skiaRef.current) return;
    try {
      const snapshot = skiaRef.current.makeImageSnapshot();
      const base64 = snapshot.encodeToBase64();
      const newPath = `${RNFS.DocumentDirectoryPath}/${Date.now()}.jpg`;
      await RNFS.writeFile(newPath, base64, 'base64');

      // 1. 로컬 저장 (기존 로직)
      const savedJSON = await AsyncStorage.getItem('saved_photos');
      const photosArray = savedJSON ? JSON.parse(savedJSON) : [];
      const newPhotoData = {
        path: newPath, // 실제 저장된 파일 경로
        missionInfo: { // MissionScreen에서 넘어온 과거 사진 정보
          id: selectedPhoto.id,
          spot_id: selectedPhoto.id, // spot_id로 사용
          title: selectedPhoto.name,
          route_id: selectedPhoto.route_id || 0, // route_id가 있다면 사용
        },
      };

      photosArray.push(newPhotoData);
      await AsyncStorage.setItem('saved_photos', JSON.stringify(photosArray));

      // 2. 백엔드 DB 저장
      try {
        const authToken = await AsyncStorage.getItem('access_token');
        console.log('[ImageSaveScreen] selectedPhoto 데이터:', selectedPhoto);
        console.log('[ImageSaveScreen] authToken 존재:', !!authToken);
        console.log('[ImageSaveScreen] selectedPhoto.route_id:', selectedPhoto.route_id);
        
        if (authToken && selectedPhoto.route_id) {
          console.log('[ImageSaveScreen] 백엔드에 사진 저장 시작');
          
          const response = await fetch(`${BACKEND_API.BASE_URL}/v1/photos/${selectedPhoto.route_id}/${selectedPhoto.id}/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              image_url: newPath, // 로컬 파일 경로
            }),
          });

          if (response.ok) {
            const savedPhotoData = await response.json();
            console.log('[ImageSaveScreen] 백엔드 사진 저장 성공:', savedPhotoData);
          } else {
            console.error('[ImageSaveScreen] 백엔드 사진 저장 실패:', response.status);
          }
        } else {
          console.log('[ImageSaveScreen] 인증 토큰 또는 route_id가 없어 백엔드 저장 건너뜀');
        }
      } catch (backendError) {
        console.error('[ImageSaveScreen] 백엔드 저장 오류:', backendError);
        // 백엔드 저장 실패해도 로컬 저장은 성공했으므로 계속 진행
      }

      Alert.alert('저장 완료', '사진이 앱에 보관되었습니다.', [
        { text: '확인', onPress: () => navigation.navigate('MainTabs', { screen: 'Gallery' }) }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '이미지 저장 중 문제가 발생했습니다.');
    }
  };

  const handleRetake = () => {
    console.log('다시 찍기 선택, 카메라 화면으로 돌아갑니다.');
    Alert.alert('다시 촬영하실래요?', '카메라로 돌아갑니다.', [
      { text: '확인', onPress: () => navigation.goBack() }
    ]);
  };

  if (!backgroundImage || !overlayImage) {
    return <View style={styles.loading}><Text>이미지 로딩 중...</Text></View>;
  }


  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas} ref={skiaRef}>
        <Image image={backgroundImage} fit="contain" x={0} y={0} width={width} height={height} color="white"/>
        <Image
          image={overlayImage}
          x={x}
          y={y}
          width={displayWidth}
          height={displayHeight}
          opacity={opacity}
          color="white"
        />
      </Canvas>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.actionButton, styles.retakeButton]} onPress={handleRetake}>
          <Text style={styles.buttonText}>다시 찍기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSave}>
          <Text style={styles.buttonText}>저장하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  canvas: { flex: 1, width: '100%' },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    flexDirection: 'row', // 버튼을 가로로 배치
    justifyContent: 'space-around', // 버튼 사이에 공간을 줌
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    flex: 1, // 공간을 균등하게 차지
    marginHorizontal: 10, // 버튼 사이의 간격
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: INCHEON_GRAY, // 요청하신 색상
  },
  saveButton: {
    backgroundColor: INCHEON_BLUE, // 저장 버튼 색상
  },
  buttonText: {
    ...TEXT_STYLES.button,
    color: 'white',
  },
});