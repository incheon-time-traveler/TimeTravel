import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Onboarding1 from '../assets/onboarding1';
import Onboarding2 from '../assets/onboarding2';

const { width, height } = Dimensions.get('window');

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const OnboardingScreen = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const navigation = useNavigation<OnboardingScreenNavigationProp>();

  const handleNext = async () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      // Mark onboarding as completed and navigate to main app
      await AsyncStorage.setItem('@viewedOnboarding', 'true');
      navigation.replace('Main');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('@viewedOnboarding', 'true');
    navigation.replace('Main');
  };

  const pages = [
    {
      title: '여행의 추억을 간직하세요',
      description: '당신의 여정을 아름답게 기록하고 추억을 간직하세요.',
      component: <Onboarding1 />,
    },
    {
      title: '지도에서 추억을 찾아보세요',
      description: '지도에서 여행한 장소를 확인하고 추억을 다시 떠올려보세요.',
      component: <Onboarding2 />
    },
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <View style={styles.imageContainer}>
          {pages[currentPage].component}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{pages[currentPage].title}</Text>
          <Text style={styles.description}>{pages[currentPage].description}</Text>
        </View>
        
        <View style={styles.paginationContainer}>
          {pages.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.paginationDot, 
                index === currentPage && styles.paginationDotActive
              ]} 
            />
          ))}
        </View>
        
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentPage === pages.length - 1 ? '시작하기' : '다음'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  skipText: {
    color: '#999',
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 80,
  },
  image: {
    width: width * 0.8,
    height: height * 0.4,
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#000',
  },
  nextButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;
