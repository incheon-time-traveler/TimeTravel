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

const TOTAL_COURSE = 52; // 전체 코스 수 (API에서 가져올 수 있음)

export default function GalleryScreen() {
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [galleryData, setGalleryData] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [foundCount, setFoundCount] = useState(0);

  const handleImagePress = (item: any) => {
    if (item.completed && item.image) {
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

      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/photos/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[GalleryScreen] 갤러리 데이터:', data);
        
        // GalleryItem 형식으로 변환
        const galleryItems: GalleryItem[] = data.map((item: any) => ({
          id: item.id,
          title: `스팟 ${item.spot_id}`, // spot_name이 없으므로 spot_id 사용
          image_url: item.image_url || '',
          past_image_url: '', // past_image_url은 별도로 저장되지 않음
          completed: !!item.image_url,
          hasStamp: true, // 모든 완료된 미션에 스탬프 부여
          stampUsed: item.is_used || false, // 백엔드 필드명에 맞춤
          route_id: item.route_id,
          spot_id: item.spot_id
        }));
        
        setGalleryData(galleryItems);
        setFoundCount(galleryItems.filter(item => item.completed).length);
      } else {
        console.error('[GalleryScreen] 갤러리 데이터 가져오기 실패:', response.status);
      }
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
              // 스탬프 사용 API 호출
              const tokens = await authService.getTokens();
              if (!tokens?.access) {
                Alert.alert('오류', '로그인이 필요합니다.');
                return;
              }

              const response = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/use_stamp/${selectedImage.id}/`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${tokens.access}`,
                },
                body: JSON.stringify({
                  is_used: true
                }),
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
    if (!selectedImage?.hasStamp) {
      return null;
    }

    if (selectedImage?.stampUsed) {
      // 사용 완료된 스탬프
      return (
        <View style={styles.stampContainer}>
          <View style={[styles.stamp, styles.stampUsed]}>
            <Text style={[styles.stampText, styles.stampUsedText]}>사용완료</Text>
          </View>
        </View>
      );
    }

    // 사용 가능한 스탬프
    return (
      <TouchableOpacity
        style={styles.stampContainer}
        onPress={handleStampPress}
        activeOpacity={0.8}
      >
        <View style={styles.stamp}>
          <Text style={styles.stampText}>대불호텔</Text>
        </View>
      </TouchableOpacity>
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
                  {item.completed && item.image_url ? (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                      {item.hasStamp && (
                        <View style={styles.stampOverlay}>
                          <View style={[styles.stamp, item.stampUsed && styles.stampUsed]}>
                            <Text style={[styles.stampText, item.stampUsed && styles.stampUsedText]}>
                              {item.stampUsed ? '사용완료' : '대불호텔'}
                            </Text>

                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.lockedBox}>
                      <Ionicons name="image-outline" size={32} color="#bbb" />
                    </View>
                  )}
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
                    source={{ uri: selectedImage?.image_url }}
                    style={styles.modalImage}
                    resizeMode="contain"
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
  lockedBox: {
    width: '100%',
    height: CARD_SIZE,
    backgroundColor: INCHEON_BLUE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
    top: 10,
    right: 10,
  },
  stampContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  stamp: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  stampUsed: {
    backgroundColor: INCHEON_GRAY, // 회색으로 변경
  },
  stampText: {
    ...TEXT_STYLES.button,
    color: '#fff',
    textAlign: 'center',
  },
  stampUsedText: {
    fontSize: 12, // 텍스트가 길어서 폰트 크기 조정
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