import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList, NativeSyntheticEvent, NativeScrollEvent, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../styles/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const pages = [
  {
    key: 'onboarding_1',
    image: require('../assets/images/onboarding/onboarding_1.png'),
    title: '\n환영합니다!',
    description: '인천시간여행과 함께\n더 몰입감 있는 여행을\n즐길 준비 되셨나요?'
  },
  {
    key: 'onboarding_2',
    image: require('../assets/images/onboarding/onboarding_2.png'),
    title: '',
    description: '로그인 후\n홈에서 추천을 받아보세요\n간단한 질문에 답하면\n알맞은 코스가 바로 생성돼요!'
  },
  {
    key: 'onboarding_3',
    image: require('../assets/images/onboarding/onboarding_3.png'),
    title: '',
    description: '코스를 생성하면\n진행률을 볼 수 있어요\n장소의 이름을 누르면\n상세 정보를 확인할 수 있어요'
  },
  {
    key: 'onboarding_4',
    image: require('../assets/images/onboarding/onboarding_4.png'),
    title: '',
    description: '진행 중인 코스는\n홈 화면에서도 확인할 수 있어요'
  },
  {
    key: 'onboarding_5',
    image: require('../assets/images/onboarding/onboarding_5.png'),
    title: '',
    description: '특정 장소에 도달하면\n미션이 자동으로 실행돼요\n미션을 수행하고\n스탬프를 수집해보세요!'
  },
  {
    key: 'onboarding_6',
    image: require('../assets/images/onboarding/onboarding_6.png'),
    title: '',
    description: '미션을 수행하고 받은\n스탬프는 갤러리에서 볼 수 있어요!\n\n이제 같이 출발 해볼까요?'
  },
];


type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const OnboardingScreen = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const flatListRef = React.useRef<FlatList>(null); // FlatList 참조 생성

  const handleSkip = async () => {
    await AsyncStorage.setItem('@viewedOnboarding', 'true');
      navigation.reset({
        index: 0,
        routes: [
          { name: 'RootAfterOnboarding',
            params: {
              screen: 'MainTabs',
              params: { screen: 'Home', params: { screen: 'HomeMain' } }
            }
          }
        ],
      });
  };



  // 다음 버튼 클릭 시 FlatList 스크롤
  const handleNext = async () => {
    if (currentPage < pages.length - 1) {
      flatListRef.current?.scrollToIndex({ animated: true, index: currentPage + 1 });
      // setCurrentPage(currentPage + 1); // onMomentumScrollEnd에서 처리하므로 주석 처리
    } else {
      await AsyncStorage.setItem('@viewedOnboarding', 'true');
        navigation.reset({
          index: 0,
          routes: [
            { name: 'RootAfterOnboarding',
              params: {
                screen: 'MainTabs',
                params: { screen: 'Home', params: { screen: 'HomeMain' } }
              }
            }
          ],
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
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.imageContainer}>
            <Image style={styles.image} source={item.image} />
          </View>
          <Text style={currentPage === 0 ? styles.description : styles.otherDescription}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
            itemVisiblePercentThreshold: 70 // 아이템이 50% 이상 보일 때 viewable로 간주
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
               {currentPage === 0
                 ? '어플 사용법 알아보기'
                 : currentPage === pages.length - 1
                   ? '시작하기'
                   : '다음'}
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
    right: 25,
    zIndex: 10, // 다른 요소 위에 보이도록 zIndex 추가
  },
  skipText: {
    color: INCHEON_GRAY,
    fontSize: 16,
  },
  // FlatList의 각 페이지 스타일
  pageContainer: {
    flex: 1,
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    height: height * 0.8,
    alignItems: 'center',
  },
  imageContainer: {
    width: width * 0.7, // 화면 비율 기준 고정
    height: height * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    marginBottom: 20
  },
  title: {
    ...TEXT_STYLES.subtitle,
    textAlign: 'center',
  },
  description: {
    ...TEXT_STYLES.heading,
    textAlign: 'center',
    lineHeight: 23,
  },
  otherDescription: {
    ...TEXT_STYLES.heading,
    textAlign: 'center',
    lineHeight: 23,
    marginTop:10,
  },
  // 페이지네이션과 다음 버튼을 담을 컨테이너
  bottomControlsContainer: {
    position: 'absolute', // 화면 하단에 고정
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    paddingBottom: 70, // 적절한 여백
    alignItems: 'center', // 내부 요소들 중앙 정렬
  },
  paginationContainer: {
    flexDirection: 'row',
    marginBottom: 30,
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
