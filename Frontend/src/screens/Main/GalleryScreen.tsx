import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  Dimensions, 
  TouchableOpacity, 
  Modal, 
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@react-native-vector-icons/ionicons';
import CheckIcon from '../../components/ui/CheckIcon';
import PixelLockIcon from '../../components/ui/PixelLockIcon';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BACKEND_API } from '../../config/apiKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../../services/authService';

const { width, height } = Dimensions.get('window');

// 갤러리 데이터 타입
interface GalleryItem {
  id: number;
  title: string;
  image_url: string;
  past_image_url: string;
  completed: boolean;
  hasStamp: boolean;
  stampUsed: boolean;
  route_id: number;
  spot_id: number;
  isUnlockSpot?: boolean; // unlock_spots에서 온 데이터인지
  isUserPhoto?: boolean; // 사용자가 촬영한 사진인지
  created_at?: string; // 촬영 날짜
}


// 스탬프 이미지 매핑
const STAMP_IMAGES: { [key: string]: any } = {
  '강화백련사': require('../../assets/stamps/baekreon.png'),
  '부평도호부청사': require('../../assets/stamps/bupyeong_dohobu.png'),
  '부평향교': require('../../assets/stamps/bupyeong_hyanggyo.png'),
  '대불호텔전시관': require('../../assets/stamps/daebul.png'),
  '인천답동성당': require('../../assets/stamps/dapdong_cathedral.png'),
  '대한성공회강화성당': require('../../assets/stamps/ganghwa_cathedral.png'),
  '홍예문': require('../../assets/stamps/hongyemun.png'),
  '일본우선주식회사인천지점': require('../../assets/stamps/incheon_corporation.png'),
  '인천도호부관아': require('../../assets/stamps/incheon_dohobu.png'),
  '인천우체국': require('../../assets/stamps/incheon_post_office.png'),
  '제물포구락부': require('../../assets/stamps/jaemulpo.png'),
  '인천내동성공회성당': require('../../assets/stamps/naedong_cathedral.png'),
  '논현포대': require('../../assets/stamps/nonhyun.png'),
  '팔미도등대': require('../../assets/stamps/palmido.png'),
  '연미정정': require('../../assets/stamps/yeonmijung.png'),
  '용동큰우물': require('../../assets/stamps/yongdong_great_well.png'),
  // 다른 장소들도 필요에 따라 추가
};

const TOTAL_COURSE = 16; // 전체 코스 수 (API에서 가져올 수 있음)

export default function GalleryScreen({ navigation }: any) {
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [galleryData, setGalleryData] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [foundCount, setFoundCount] = useState(0);

  const handleImagePress = (item: any) => {
    if (item.completed) {
      console.log('[GalleryScreen] 사진 클릭:', {
        title: item.title,
        spot_id: item.spot_id,
        route_id: item.route_id,
        image_url: item.image_url
      });
      setSelectedImage(item);
      setImageModalVisible(true);
    }
  };

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

	const checkLoginStatus = async (): Promise<boolean> => { // 👈 반환 타입을 boolean으로 명시
    try {
      const tokens = await authService.getTokens();
      const user = await authService.getUser();

      if (tokens?.access && user) {
        setIsLoggedIn(true);
        setUserProfile(user);
        console.log('[GalleryScreen] 로그인된 상태:', user.nickname);
        return true; // 👈 로그인 성공 시 true 반환
      } else {
        setIsLoggedIn(false);
        setUserProfile(null);
        console.log('[GalleryScreen] 로그아웃된 상태');
        return false; // 👈 로그아웃 상태 시 false 반환
      }
    } catch (error) {
      console.error('로그인 상태 확인 실패:', error);
      setIsLoggedIn(false);
      setUserProfile(null);
      return false; // 👈 에러 발생 시 false 반환
    }
  };


  const handleLoginPress = () => {
    navigation.navigate('Profile');
  };

	// 데이터를 불러오는 전체 과정을 책임지는 함수를 새로 생성
	const initializeScreen = async () => {
	  setIsLoading(true); // 로딩 시작
	  const loggedIn = await checkLoginStatus(); // 1. 먼저 로그인 상태를 확인

	  if (loggedIn) {
	    // 2. 로그인이 되어 있다면, 로컬 사진을 불러옴
	    await loadLocalPhotos();
	  } else {
	    // 3. 로그인이 안 되어 있다면, 갤러리를 비우고 로딩을 끝냅니다.
	    setGalleryData([]);
	    setFoundCount(0);
	    setIsLoading(false);
	  }
	};

	useEffect(() => {
    initializeScreen();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log('[GalleryScreen] 화면 포커스됨 - 데이터 새로고침');
      initializeScreen();
    }, [])
  );

  // 로그인 안내 모달 컴포넌트
  const renderLoginModal = () => (
    <Modal
      visible={!isLoggedIn}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={false}
    >
      {/* 배경 클릭 감지 */}
      <TouchableWithoutFeedback onPress={() => setIsLoggedIn(true)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBackground}>
          <View style={styles.loginModalContent}>
            <View style={styles.loginModalIcon}>
              <Ionicons name="lock-closed" size={32} color={INCHEON_BLUE} />
            </View>
            <Text style={styles.loginModalTitle}>과거 사진 모음집</Text>
            <Text style={styles.loginModalSubtitle}>
              로그인하면 과거 사진과 함께{`\n`}
              특별한 스탬프도 수집할 수 있어요!
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLoginPress}
              activeOpacity={0.9}
            >
              <Text style={styles.loginButtonText}>로그인하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // 갤러리 데이터 가져오기: 기존의 fetchGalleryData 함수를 이 함수로 교체
	const loadLocalPhotos = async () => {
	  try {
	    setIsLoading(true);

	    // 1. AsyncStorage에서 저장된 사진 경로 목록을 가져옵니다.
	    const savedPhotosJSON = await AsyncStorage.getItem('saved_photos');

	    if (savedPhotosJSON) {
	      // 2. JSON 문자열을 실제 배열로 변환합니다.
	      const photoPaths = JSON.parse(savedPhotosJSON);
	      console.log('[GalleryScreen] 로컬에서 불러온 사진 경로:', photoPaths);

	      // 3. 파일 경로 배열을 GalleryItem 객체 배열로 변환합니다.
	      const localGalleryData = photoPaths.map((path, index) => ({
	        id: index, // 간단하게 인덱스를 ID로 사용
	        title: `장소 ${index + 1}`,
				  image_url: `file://${path}`,
				  past_image_url: `file://${path}`,
	        completed: true,
	        hasStamp: true, // 스탬프는 일단 있다고 가정하거나, 별도 로직 추가
	        stampUsed: false,
	        route_id: 0, // 로컬 데이터이므로 0 또는 다른 값으로 설정
	        spot_id: index,
	        isUserPhoto: true,
	      }));
				console.log("갤러리에 표시될 최종 데이터:", localGalleryData); // 👈 이 로그를 추가!

	      // 상태 업데이트
	      setGalleryData(localGalleryData.reverse()); // 최신 사진이 위로 오도록 배열 뒤집기
	      setFoundCount(localGalleryData.length);

	    } else {
	      // 저장된 사진이 없을 경우
	      console.log('[GalleryScreen] 저장된 로컬 사진이 없습니다.');
	      setGalleryData([]);
	      setFoundCount(0);
	    }
	  } catch (error) {
	    console.error('[GalleryScreen] 로컬 사진 불러오기 실패:', error);
	    Alert.alert('오류', '사진을 불러오는 중 문제가 발생했습니다.');
	  } finally {
	    setIsLoading(false);
	  }
	};

	// 테스트 함수
	const handleCheckRawStorage = async () => {
    try {
      const rawData = await AsyncStorage.getItem('saved_photos');
      console.log("AsyncStorage에 저장된 실제 값:", rawData);
      Alert.alert("저장된 실제 값", rawData || "값이 없음 (null)");
    } catch (e) {
      console.error("AsyncStorage 읽기 에러:", e);
      Alert.alert("오류", "AsyncStorage를 읽는 데 실패했습니다.");
    }
  };

	useEffect(() => {
	  // checkLoginStatus(); // 로그인 로직은 잠시 보류
	  loadLocalPhotos();
	}, []);

	useFocusEffect(
	  React.useCallback(() => {
	    // checkLoginStatus();
	    console.log('[GalleryScreen] 화면 포커스됨 - 로컬 갤러리 새로고침');
	    loadLocalPhotos();
	  }, [])
	);


  const handleStampPress = () => {
    if (!selectedImage) return;

    Alert.alert(
      '아직은 스탬프 사용이 어렵습니다.',
      '추후 제휴 서비스 추가 예정입니다. 다음 업데이트를 기다려주세요. 감사합니다.',
      [
        {
          text: '돌아가기',
          style: 'cancel',
        },
      ]
    );
  };

  const renderStamp = () => {
    if (!selectedImage) return null;

    const stampSource = STAMP_IMAGES[selectedImage.title] || require('../../assets/stamps/jaemulpo.png');

    if (selectedImage.stampUsed) {
      return (
        <View style={styles.modalStampContainer}>
          <Image
            source={stampSource}
            style={styles.modalStampImage}
            resizeMode="contain"
          />
          <View style={styles.modalStampImageUsed}>
            <Text style={styles.modalStampImageUsedText}>사용 완료</Text>
          </View>
        </View>
      );
    }

    if (selectedImage.hasStamp) {
      return (
        <View style={styles.modalStampContainer}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleStampPress}>
            <Image
              source={stampSource}
              style={styles.modalStampImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.checkButton} onPress={handleCheckRawStorage}>
          <Text>RAW 데이터 확인</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>완료한 미션</Text>
          <View style={styles.underline} />
          {isLoggedIn ? (
            <Text style={styles.subtitle}>전체 코스 {TOTAL_COURSE}개 중 {foundCount}개의 과거를 찾았어요</Text>
          ) : (
            <Text style={styles.subtitle}>로그인해 과거 모습을 찾아보세요.</Text>
          )}
          
          {/* 로딩 상태 표시 */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={INCHEON_BLUE} />
              <Text style={styles.loadingText}>갤러리를 불러오는 중...</Text>
            </View>
          ) : (
            <View style={styles.gridWrap}>
              {galleryData.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => handleImagePress(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: item.image_url || Image.resolveAssetSource(require('../../assets/images/대동여지도.jpg'))?.uri || '' }}
                      style={styles.photo}
                      resizeMode="cover"
                      onLoad={() => console.log('[GalleryScreen] 이미지 로드 성공:', item.title, item.image_url)}
                    />
                    {!item.completed && (
                      <View style={styles.lockedOverlay}>
                        <Ionicons name="lock-closed" size={24} color="white" />
                        <Text style={styles.lockedText}>잠금</Text>
                      </View>
                    )}
                    {item.completed && item.hasStamp && (
                      <View style={styles.stampOverlay}>
                        <Image
                          source={STAMP_IMAGES[item.title] || require('../../assets/stamps/jaemulpo.png')}
                          style={styles.stampImage}
                          resizeMode="contain"
                        />
                        {item.stampUsed && (
                          <View style={styles.stampImageUsed}>
                            <Text style={styles.stampImageUsedText}><CheckIcon /></Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.missionTitle} numberOfLines={1}>{item.title}</Text>
                      {item.completed ? (
                        <View style={styles.stampBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="white" />
                        </View>
                      ) : (
                        <PixelLockIcon />
                      )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

          {/* 로그인 안내 모달 */}
          {renderLoginModal()}

          {/* 사진 확대 모달 */}
          <Modal
            visible={imageModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setImageModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>{selectedImage?.title}</Text>

                  </View>
                  <TouchableOpacity
                    onPress={() => setImageModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <Text style={styles.modalCloseButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.imageModalContainer}>
                  <Image
                    source={{ uri: selectedImage?.image_url || Image.resolveAssetSource(require('../../assets/images/대동여지도.jpg'))?.uri || '' }}
                    style={styles.modalImage}
                    resizeMode="contain"
                    onLoad={() => console.log('[GalleryScreen] 모달 이미지 로드 성공:', selectedImage?.title, selectedImage?.image_url)}
                  />

                  {renderStamp()}
                </View>
              </View>
            </View>
          </Modal>
        </View>
    </SafeAreaView>

  );
}

const CARD_SIZE = (width - 32 - 16) / 2; // 좌우 패딩+gap 고려

const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // SafeAreaView가 화면 전체를 차지하도록 설정
    backgroundColor: '#f0f0f0', // SafeAreaView 자체의 배경색 (선택 사항)
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  // 모달 오버레이 스타일
  modalBackground: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    maxWidth: 400,
  },
  loginModalContent: {
    padding: 32,
    alignItems: 'center',
  },
  loginModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(20, 80, 158, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginModalTitle: {
    ...TEXT_STYLES.heading,
    color: INCHEON_BLUE,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginModalSubtitle: {
    ...TEXT_STYLES.body,
    color: '#555',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: INCHEON_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonText: {
    ...TEXT_STYLES.button,
    color: 'white',
    fontWeight: '600',
  },
  bottomArea: {
    height: 70,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    ...TEXT_STYLES.subtitle,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  underline: {
    height: 3,
    backgroundColor: INCHEON_BLUE,
    width: 140,
    alignSelf: 'center',
    marginBottom: 16,
    borderRadius: 2,
  },
  subtitle: {
    ...TEXT_STYLES.heading,
    color: INCHEON_GRAY,
    textAlign: 'center',
    marginBottom: 32,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE + 38,
    backgroundColor: '#fafafa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: CARD_SIZE,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  lockedText: {
    color: 'white',
    marginTop: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  cardFooter: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  missionTitle: {
    ...TEXT_STYLES.body,
    flex: 1,
    marginRight: 6,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCompleted: {
    backgroundColor: INCHEON_BLUE,
  },
  badgeLocked: {
    backgroundColor: INCHEON_GRAY,
  },
  badgeText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  badgeTextCompleted: {
    color: '#fff',
  },
  badgeTextLocked: {
    color: '#fff',
  },
  // 스탬프 스타일
  stampOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    zIndex: 2,
  },
  stampImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    marginBottom: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    transform: [{ rotate: '15deg' }],
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stampImageUsed: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      marginBottom: 10,
      borderRadius: 100,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
  },
  stampImageUsedText: {
    ...TEXT_STYLES.small,
    color: '#e0e0e0',
  },
  // 사용자 촬영 사진 오버레이 스타일
  userPhotoOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  userPhotoText: {
    ...TEXT_STYLES.small,
    color: 'white',
    marginLeft: 4,
    fontSize: 10,
  },
  stampBadge: {
    backgroundColor: '#FF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  // 모달 내 스탬프 스타일
  modalStampContainer: {
    position: 'absolute',
    top: 160,
    right: 0,
    width: 100,
    height: 100,
    alignItems: 'center',
  },
  modalStampImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    transform: [{ rotate: '20deg' }],

  },
  modalStampImageUsed: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
    },
    modalStampImageUsedText: {
      ...TEXT_STYLES.button,
      transform: [{ rotate: '15deg' }],
      color: '#fff'
    },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width - 40,
    height: height - 100,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE
  },
  modalSubtitle: {
    ...TEXT_STYLES.small,
    color: '#666',
    marginTop: 4,
  },
  modalCloseButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    ...TEXT_STYLES.body,
  },
  imageModalContainer: {
    flex: 1,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  // 로딩 스타일
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    minHeight: height * 0.6,
  },
  loadingText: {
    ...TEXT_STYLES.body,
    fontFamily: 'NeoDunggeunmoPro-Regular',
    color: INCHEON_GRAY,
    marginTop: 16,
    textAlign: 'center',
  },
});