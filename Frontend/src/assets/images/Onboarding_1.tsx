// src/assets/images/Onboarding_1.tsx (또는 별도의 컴포넌트 파일, 예를 들어 src/components/OnboardingImage1.tsx)
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const CIRCLE_DIAMETER = 300;

const OnboardingImage1 = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../images/Onboarding_1.png')} // 실제 이미지 파일 경로
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { // 이미지를 감싸는 컨테이너 스타일 (선택 사항, 레이아웃 조절용)
    width: CIRCLE_DIAMETER,
    height: CIRCLE_DIAMETER,
    borderRadius: CIRCLE_DIAMETER / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%', // 컨테이너에 맞춤
    height: '100%', // 컨테이너에 맞춤
  },
});

export default OnboardingImage1; // export 이름 변경 (선택 사항)