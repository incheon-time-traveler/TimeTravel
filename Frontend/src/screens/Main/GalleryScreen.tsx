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
import Ionicons from 'react-native-vector-icons/Ionicons';
import CheckIcon from '../../components/ui/CheckIcon';
import PixelLockIcon from '../../components/ui/PixelLockIcon';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BACKEND_API } from '../../config/apiKeys';
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

  const checkLoginStatus = async () => {
      try {
        // 토큰과 사용자 정보 모두 확인
        const tokens = await authService.getTokens();
        const user = await authService.getUser();

        if (tokens?.access && user) {
          // 토큰이 있고 사용자 정보가 있으면 로그인된 상태
          setIsLoggedIn(true);
          setUserProfile(user);
          console.log('[HomeScreen] 로그인된 상태:', user.nickname);

        } else {
          // 토큰이나 사용자 정보가 없으면 로그아웃된 상태
          setIsLoggedIn(false);
          setUserProfile(null);
          console.log('[HomeScreen] 로그아웃된 상태');
        }
      } catch (error) {
        console.error('로그인 상태 확인 실패:', error);
        setIsLoggedIn(false);
        setUserProfile(null);
      }
    };


  const handleLoginPress = () => {
    navigation.navigate('Profile');
  };


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

  // 갤러리 데이터 가져오기
  const fetchGalleryData = async () => {
    try {
      setIsLoading(true);
      const tokens = await authService.getTokens();
      let photosResponse;
      let spotsResponse;
      
      if (tokens?.access) {
        // 1. 백엔드에서 사용자가 촬영한 사진들 가져오기
        console.log('[GalleryScreen] photos API 호출 시작:', `${BACKEND_API.BASE_URL}/v1/photos/`);
        photosResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/photos/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.access}`,
          },
        });
        console.log('[GalleryScreen] photos API 응답:', photosResponse.status, photosResponse.statusText);

        // 2. 백엔드에서 spots 정보 가져오기 (spot_id로 이름 조회용)
        spotsResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokens.access}`,
          },
        });
      }

      let photosItems: GalleryItem[] = [];
      let spotsData: any[] = [];

      // photos 데이터 처리
      if (photosResponse && photosResponse.ok) {
        const data = await photosResponse.json();
        console.log('[GalleryScreen] 사용자 촬영 사진 데이터:', data);
        console.log('[GalleryScreen] photos API 응답 상태:', photosResponse.status);
        console.log('[GalleryScreen] photos API 응답 헤더:', photosResponse.headers);
        
        if (data && data.length > 0) {
          console.log('[GalleryScreen] 원본 photos 데이터 상세:', data);
          photosItems = data.map((item: any) => {
            const mappedItem = {
              id: item.id + 10000, // unlock_spots와 ID 충돌 방지
              title: `촬영한 사진 ${item.id}`,
              image_url: item.image_url || '',
              past_image_url: item.image_url || '', // 촬영한 사진을 past_image_url로도 사용
              completed: true,
              hasStamp: false,
              stampUsed: false,
              route_id: item.route_id,
              spot_id: item.spot_id,
              isUserPhoto: true, // 사용자가 촬영한 사진임을 표시
              created_at: item.created_at,
            };
            console.log('[GalleryScreen] 매핑된 아이템:', mappedItem);
            return mappedItem;
          });
          console.log('[GalleryScreen] 처리된 photosItems:', photosItems);
        } else {
          console.log('[GalleryScreen] 사용자 촬영 사진이 없습니다.');
        }
        console.log('[GalleryScreen] 사용자 촬영 사진 데이터 세팅 성공');
      } else {
        console.error('[GalleryScreen] photos API 호출 실패:', photosResponse?.status, photosResponse?.statusText);
      }

      // spots 데이터 처리
      if (spotsResponse && spotsResponse.ok) {
        const data = await spotsResponse.json();
        console.log('[GalleryScreen] spots 데이터:', data);
        spotsData = data;
        console.log('[GalleryScreen] spots 데이터 세팅 성공');
      }

      // 3. 데이터 통합 - 사용자 촬영 사진을 기준으로 갤러리 구성
      const mergedItems: GalleryItem[] = [];
      
      console.log('[GalleryScreen] photosItems 길이:', photosItems.length);
      console.log('[GalleryScreen] photosItems 데이터:', photosItems);
      console.log('[GalleryScreen] spotsData 길이:', spotsData.length);
      
      // 사용자 촬영 사진이 있으면 바로 갤러리에 표시
      if (photosItems && photosItems.length > 0) {
        console.log('[GalleryScreen] 사용자 촬영 사진을 갤러리에 표시');
        
        photosItems.forEach((photo, index) => {
          console.log(`[GalleryScreen] 처리 중인 photo ${index + 1}:`, {
            spot_id: photo.spot_id,
            route_id: photo.route_id,
            image_url: photo.image_url,
            title: photo.title
          });
          
          // spots 데이터에서 이름 조회 (없으면 기본값 사용)
          let spotName = `촬영한 사진 ${photo.spot_id}`;
          if (spotsData && spotsData.length > 0) {
            const spotInfo = spotsData.find(spot => spot.id === photo.spot_id);
            if (spotInfo && spotInfo.name) {
              spotName = spotInfo.name;
            }
          }
          
          console.log(`[GalleryScreen] spot_id ${photo.spot_id} - 최종 이름:`, spotName);
          
          const galleryItem = {
            ...photo,
            title: spotName,
            hasStamp: true,
            stampUsed: false,
          };
          
          console.log(`[GalleryScreen] 갤러리 아이템 생성:`, galleryItem);
          mergedItems.push(galleryItem);
        });
      } else {
        console.log('[GalleryScreen] 사용자 촬영 사진이 없습니다.');
      }
      
      console.log('[GalleryScreen] 통합된 갤러리 데이터:', mergedItems);
      console.log('[GalleryScreen] 최종 mergedItems.length:', mergedItems.length);
      const allItems = mergedItems;

      // 4. 빈 슬롯 생성 (고유한 ID 보장) - 사용자 촬영 사진이 있는 경우만 표시
      const remainingSlots = TOTAL_COURSE - allItems.length || 0;
      const emptySlots = Array(remainingSlots).fill(null).map((_, index) => ({
        id: index + 2000, // 기존 ID와 겹치지 않도록 큰 수 사용
        title: `장소 ${allItems.length + index + 1}`,
        image_url: '', // 과거 이미지 사용하지 않음
        past_image_url: '', // 과거 이미지 사용하지 않음
        completed: false,
        hasStamp: false,
        stampUsed: false,
        route_id: 0,
        spot_id: allItems.length + index + 1,
      }));

      const finalGalleryData = allItems.concat(emptySlots);
      const finalFoundCount = allItems.filter(item => item.completed).length;
      
      console.log('[GalleryScreen] 최종 갤러리 데이터:', finalGalleryData);
      console.log('[GalleryScreen] 최종 갤러리 데이터 길이:', finalGalleryData.length);
      console.log('[GalleryScreen] 최종 찾은 사진 개수:', finalFoundCount);
      
      setGalleryData(finalGalleryData);
      setFoundCount(finalFoundCount);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    checkLoginStatus();
    fetchGalleryData();
  }, []);

  // 화면이 포커스될 때마다 갤러리 데이터 새로고침
  useFocusEffect(
    React.useCallback(() => {
      checkLoginStatus();
      console.log('[GalleryScreen] 화면 포커스됨 - 갤러리 데이터 새로고침');
      fetchGalleryData();
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
//         {
//           text: '사용',
//           onPress: async () => {
//             try {
//               const tokens = await authService.getTokens();
//               if (!tokens?.access) {
//                 Alert.alert('오류', '로그인이 필요합니다.');
//                 return;
//               }
//
//               console.log('[GalleryScreen] 스탬프 사용:', selectedImage);
//
//               const useStampUrl = `${BACKEND_API.BASE_URL}/v1/courses/use_stamp/`;
//               const useStampPayload = { id: selectedImage.id, is_used: true };
//               console.log('[Gallery] PATCH use_stamp URL:', useStampUrl);
//               console.log('[Gallery] PATCH use_stamp Payload:', useStampPayload);
//
//               const response = await fetch(useStampUrl, {
//                 method: 'PATCH',
//                 headers: {
//                   'Content-Type': 'application/json',
//                   'Authorization': `Bearer ${tokens.access}`,
//                 },
//                 body: JSON.stringify(useStampPayload),
//               });
//
//               if (response.ok) {
//                 // 갤러리 데이터 새로고침
//                 await fetchGalleryData();
//                 setImageModalVisible(false);
//                 Alert.alert('스탬프 사용 완료!', '스탬프가 사용되었습니다.');
//               } else {
//                 const errorText = await response.text();
//                 console.error('[GalleryScreen] 스탬프 사용 실패:', response.status, errorText);
//                 Alert.alert('오류', '스탬프 사용에 실패했습니다.');
//               }
//             } catch (error) {
//               console.error('[GalleryScreen] 스탬프 사용 에러:', error);
//               Alert.alert('오류', '스탬프 사용 중 오류가 발생했습니다.');
//             }
//           },
//           style: 'destructive',
//         },
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
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>완료한 미션</Text>
          <View style={styles.underline} />
          {isLoggedIn ? (
            <Text style={styles.subtitle}>전체 코스 {TOTAL_COURSE}개 중 {foundCount}개의 과거를 찾았어요</Text>
          ) : (
            <Text style={styles.subtitle}>로그인해 과거 모습을 찾아보세요.</Text>
          )}
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
                    {item.completed && item.isUserPhoto && (
                      <View style={styles.userPhotoOverlay}>
                        <Ionicons name="camera" size={20} color="white" />
                        <Text style={styles.userPhotoText}>내가 촬영</Text>
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
                    <Text style={styles.modalSubtitle}>
                      Spot ID: {selectedImage?.spot_id} | Route ID: {selectedImage?.route_id}
                    </Text>
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
});