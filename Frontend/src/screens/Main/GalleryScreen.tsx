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
  ActivityIndicator
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

export default function GalleryScreen() {
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [galleryData, setGalleryData] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [foundCount, setFoundCount] = useState(0);

  const handleImagePress = (item: any) => {
    if (item.completed) {
      setSelectedImage(item);
      setImageModalVisible(true);
    }
  };

  // 갤러리 데이터 가져오기
  const fetchGalleryData = async () => {
    try {
      setIsLoading(true);
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        console.error('[GalleryScreen] 인증 토큰이 없습니다.');
        return;
      }

      // 1. 백엔드에서 unlock_spots 데이터 가져오기
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/unlock_spots/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      let backendItems: GalleryItem[] = [];
      if (response.ok) {
        const data = await response.json();
        console.log('[GalleryScreen] 백엔드 갤러리 데이터:', data);
        
        // 백엔드 데이터를 GalleryItem 형식으로 변환
        backendItems = data.map((item: any) => ({
          id: item.id,
          title: item.spot_name || `장소 ${item.spot_id}`,
          image_url: item.past_photo_url || '',
          past_image_url: item.past_photo_url || '',
          completed: !!item.past_photo_url,
          hasStamp: true,
          stampUsed: item.is_used || false,
          route_id: item.route_id,
          spot_id: item.route_spot_id,
        }));
      } else {
        console.error('[GalleryScreen] 백엔드 갤러리 데이터 가져오기 실패:', response.status);
      }

      // 2. 백엔드 데이터만 사용
      const allItems = backendItems;
      console.log('[GalleryScreen] 갤러리 데이터:', allItems);

      // 3. 빈 슬롯 생성 (고유한 ID 보장)
      const remainingSlots = TOTAL_COURSE - allItems.length;
      const maxExistingId = Math.max(...allItems.map(item => item.id), 0);
      const emptySlots = Array(remainingSlots).fill(null).map((_, index) => ({
        id: maxExistingId + index + 1000, // 기존 ID와 겹치지 않도록 큰 수 사용
        title: `장소 ${allItems.length + index + 1}`,
        image_url: '',
        past_image_url: '',
        completed: false,
        hasStamp: false,
        stampUsed: false,
        route_id: 0,
        spot_id: allItems.length + index + 1,
      }));

      setGalleryData(allItems.concat(emptySlots));
      setFoundCount(allItems.filter(item => item.completed).length);
    } catch (error) {
      console.error('[GalleryScreen] 갤러리 데이터 가져오기 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchGalleryData();
  }, []);

  // 화면이 포커스될 때마다 갤러리 데이터 새로고침
  useFocusEffect(
    React.useCallback(() => {
      console.log('[GalleryScreen] 화면 포커스됨 - 갤러리 데이터 새로고침');
      fetchGalleryData();
    }, [])
  );

  const handleStampPress = () => {
    if (!selectedImage) return;
    
    Alert.alert(
      '스탬프 사용',
      '스탬프를 사장님께 보여주세요!\n(사용 버튼을 직접 누르지 않도록 조심해주세요)',
      [
        {
          text: '돌아가기',
          style: 'cancel',
        },
        {
          text: '사용',
          onPress: async () => {
            try {
              const tokens = await authService.getTokens();
              if (!tokens?.access) {
                Alert.alert('오류', '로그인이 필요합니다.');
                return;
              }

              console.log('[GalleryScreen] 스탬프 사용:', selectedImage);

              const useStampUrl = `${BACKEND_API.BASE_URL}/v1/courses/use_stamp/`;
              const useStampPayload = { id: selectedImage.id, is_used: true };
              console.log('[Gallery] PATCH use_stamp URL:', useStampUrl);
              console.log('[Gallery] PATCH use_stamp Payload:', useStampPayload);
              
              const response = await fetch(useStampUrl, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${tokens.access}`,
                },
                body: JSON.stringify(useStampPayload),
              });

              if (response.ok) {
                // 로컬 상태 업데이트
                setGalleryData(prev => 
                  prev.map(item => 
                    item.id === selectedImage.id 
                      ? { ...item, stampUsed: true }
                      : item
                  )
                );
                setImageModalVisible(false);
                Alert.alert('스탬프 사용 완료!', '스탬프가 사용되었습니다.');
              } else {
                const errorText = await response.text();
                console.error('[GalleryScreen] 스탬프 사용 실패:', response.status, errorText);
                Alert.alert('오류', '스탬프 사용에 실패했습니다.');
              }
            } catch (error) {
              console.error('[GalleryScreen] 스탬프 사용 에러:', error);
              Alert.alert('오류', '스탬프 사용 중 오류가 발생했습니다.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderStamp = () => {
    if (!selectedImage?.hasStamp || selectedImage.stampUsed) {
      return null;
    }

    return (
      <View style={styles.modalStampContainer}>
        <Image 
          source={STAMP_IMAGES[selectedImage.title] || require('../../assets/stamps/jaemulpo.png')}
          style={styles.modalStampImage}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.useStampButton}
          onPress={handleStampPress}
        >
          <Text style={styles.useStampButtonText}>스탬프 사용하기</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>완료한 미션</Text>
            <View style={styles.underline} />
            <Text style={styles.subtitle}>전체 코스 {TOTAL_COURSE}개 중 {foundCount}개의 과거를 찾았어요</Text>
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
                      source={{ uri: item.past_image_url || 'https://via.placeholder.com/300' }} 
                      style={styles.photo} 
                      resizeMode="cover"
                      onLoad={() => console.log('[GalleryScreen] 이미지 로드 성공:', item.title, item.past_image_url)}
                      onError={(error) => console.log('[GalleryScreen] 이미지 로드 실패:', item.title, item.past_image_url, error)}
                    />
                    {!item.completed && (
                      <View style={styles.lockedOverlay}>
                        <Ionicons name="lock-closed" size={24} color="white" />
                        <Text style={styles.lockedText}>잠금</Text>
                      </View>
                    )}
                    {item.completed && item.hasStamp && !item.stampUsed && (
                      <View style={styles.stampOverlay}>
                        <Image 
                          source={STAMP_IMAGES[item.title] || require('../../assets/stamps/jaemulpo.png')} 
                          style={styles.stampImage} 
                          resizeMode="contain"
                        />
                        <View style={styles.stampBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="white" />
                        </View>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.missionTitle} numberOfLines={1}>{item.title}</Text>
                      {item.completed ? (
                        <CheckIcon />
                      ) : (
                        <PixelLockIcon />
                      )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

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
                  <Text style={styles.modalTitle}>{selectedImage?.title}</Text>
                  <TouchableOpacity
                    onPress={() => setImageModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <Text style={styles.modalCloseButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.imageModalContainer}>
                  <Image
                    source={{ uri: selectedImage?.image_url || 'https://via.placeholder.com/300' }}
                    style={styles.modalImage}
                    resizeMode="contain"
                    onLoad={() => console.log('[GalleryScreen] 모달 이미지 로드 성공:', selectedImage?.title, selectedImage?.image_url)}
                    onError={(error) => console.log('[GalleryScreen] 모달 이미지 로드 실패:', selectedImage?.title, selectedImage?.image_url, error)}
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
    width: '100%',
    height: '100%',
  },
  stampBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
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
    bottom: 20,
    right: 20,
    alignItems: 'center',
  },
  modalStampImage: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  useStampButton: {
    backgroundColor: INCHEON_BLUE,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  useStampButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
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
  modalTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE
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