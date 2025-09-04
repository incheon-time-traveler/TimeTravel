import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingImage1 from '../assets/images/Onboarding_1';
import OnboardingImage2 from '../assets/images/Onboarding_2';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../styles/fonts';


const { width, height } = Dimensions.get('window');

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const OnboardingScreen = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const flatListRef = React.useRef<FlatList>(null); // FlatList 참조 생성

  const handleSkip = async () => {
    await AsyncStorage.setItem('@viewedOnboarding', 'true');
    navigation.navigate('RootAfterOnboarding', {
      screen: 'MainTabs',
      params: { screen: 'Home', params: { screen: 'HomeMain' } }
    });
  };

  const pages = [
    {
      key: 'page1',
      title: '인천 타임머신에 오신 것을 환영합니다!',
      description: '과거와 현재를 사진으로 연결하는\n 특별한 여행을 시작해보세요.',
      component: <OnboardingImage1 />,
    },
    {
      key: 'page2',
      title: '미션을 통해 여행에 몰입해 보세요!',
      description: '특정 장소의 스탬프를 획득해서\n 모든 미션을 클리어 해보세요.',
      component: <OnboardingImage2 />
    },
  ];

  // 다음 버튼 클릭 시 FlatList 스크롤
  const handleNext = async () => {
    if (currentPage < pages.length - 1) {
      flatListRef.current?.scrollToIndex({ animated: true, index: currentPage + 1 });
      // setCurrentPage(currentPage + 1); // onMomentumScrollEnd에서 처리하므로 주석 처리
    } else {
      await AsyncStorage.setItem('@viewedOnboarding', 'true');
      navigation.navigate('Root', {
        screen: 'MainTabs',
        params: { screen: 'Home', params: { screen: 'HomeMain' }}
      });
    }
  };

  // 스와이프 시 현재 페이지 업데이트
  const onViewableItemsChanged = ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentPage(viewableItems[0].index);
    }
  };

  // iOS에서 스크롤이 끝났을 때 호출 (Android는 onViewableItemsChanged로 충분할 수 있음)
  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageNum = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentPage(pageNum);
  };

  const renderItem = ({ item }: { item: typeof pages[0] }) => {
    return (
      <View style={styles.pageContainer}>
        <View style={styles.imageContainer}>
          {item.component}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>

          <FlatList
            ref={flatListRef} // 참조 연결
            data={pages}
            renderItem={renderItem}
            horizontal // 가로 스크롤 활성화
            pagingEnabled // 페이지 단위로 스크롤
            showsHorizontalScrollIndicator={false} // 스크롤바 숨기기
            keyExtractor={(item) => item.key!}
            onViewableItemsChanged={onViewableItemsChanged} // 화면에 보이는 아이템 변경 시 호출
            viewabilityConfig={{
              itemVisiblePercentThreshold: 50 // 아이템이 50% 이상 보일 때 viewable로 간주
            }}
            onMomentumScrollEnd={onMomentumScrollEnd} // 스크롤 애니메이션이 끝났을 때 호출 (iOS에서 더 정확한 페이지 감지)
            // contentContainerStyle={{ alignItems: 'center' }} // 각 페이지 콘텐츠를 중앙 정렬하고 싶다면
          />

          <View style={styles.bottomControlsContainer}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // SafeAreaView가 화면 전체를 차지하도록 설정
    backgroundColor: '#f0f0f0', // SafeAreaView 자체의 배경색 (선택 사항)
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10, // 다른 요소 위에 보이도록 zIndex 추가
  },
  skipText: {
    color: '#999',
    fontSize: 16,
  },
  // FlatList의 각 페이지 스타일
  pageContainer: {
    width: width, // 화면 너비에 맞게 설정
    flex: 1, // 페이지가 화면 전체를 차지하도록
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30, // 기존 contentContainer의 패딩을 여기로 이동
  },
  imageContainer: {
    width: '100%',
    height: 300, // 필요에 따라 조절
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 110,
  },
  title: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 24,
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
  // 페이지네이션과 다음 버튼을 담을 컨테이너
  bottomControlsContainer: {
    position: 'absolute', // 화면 하단에 고정
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    paddingBottom: 100, // 적절한 여백
    alignItems: 'center', // 내부 요소들 중앙 정렬
  },
  paginationContainer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dddddd',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  nextButton: {
    backgroundColor: INCHEON_BLUE,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    ...TEXT_STYLES.button,
    color: '#fff',
  }
});


export default OnboardingScreen;
