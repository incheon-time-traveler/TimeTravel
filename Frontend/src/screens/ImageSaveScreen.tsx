import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Dimensions, Alert } from 'react-native';
import { Canvas, Image, Skia, useCanvasRef } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function ImageSaveScreen({ route, navigation }) {
  const {
    backgroundImageUri,
    overlayImageUri,
    displayWidth,
    displayHeight,
    x,
    y,
    opacity
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

      const savedJSON = await AsyncStorage.getItem('saved_photos');
      const photosArray = savedJSON ? JSON.parse(savedJSON) : [];
      photosArray.push(newPath);
      await AsyncStorage.setItem('saved_photos', JSON.stringify(photosArray));

      Alert.alert('저장 완료', '합성된 사진이 앱에 보관되었습니다.', [
        { text: '확인', onPress: () => navigation.navigate('MainTabs', { screen: 'Gallery' }) }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '이미지 저장 중 문제가 발생했습니다.');
    }
  };

  if (!backgroundImage || !overlayImage) {
    return <View style={styles.loading}><Text>이미지 로딩 중...</Text></View>;
  }


  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas} ref={skiaRef}>
        <Image image={backgroundImage} fit="contain" x={0} y={0} width={width} height={height} />
        <Image
          image={overlayImage}
          x={x}
          y={y}
          width={displayWidth}
          height={displayHeight}
          opacity={opacity}
        />
      </Canvas>
      <View style={styles.buttonContainer}>
        <Button title="저장하기" onPress={handleSave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  canvas: { flex: 1, width: '100%' },
  buttonContainer: { position: 'absolute', bottom: 50, width: '100%' },
});