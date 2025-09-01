import React, { useState, useEffect } from 'react';
import { fetchUnlockedSpots, UnlockedSpot } from '../../services/routeService';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  Dimensions, 
  TouchableOpacity, 
  Modal, 
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import authService from '../../services/authService';
import { BACKEND_API } from '../../config/apiKeys';
import Ionicons from 'react-native-vector-icons/Ionicons';

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

// 기본 스탬프 이미지
const DEFAULT_STAMP = require('../../assets/stamps/jaemulpo.png');

// Types
type GalleryItem = {
  id: number;  // This will be the same as spot_id for simplicity
  title: string;
  past_image_url: string;
  completed: boolean;
  hasStamp: boolean;
  stampUsed: boolean;
  route_id: number;
  spot_id: number;
};

// Constants
const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 2; // 16px padding + 16px gap

// Colors
const COLORS = {
  primary: '#2C3E50',
  secondary: '#3498DB',
  background: '#F8F9FA',
  text: '#2C3E50',
  border: '#E0E0E0',
  white: '#FFFFFF',
  gray: '#95A5A6',
  success: '#2ECC71',
  error: '#E74C3C',
  incheonBlue: '#0066CC',
  incheonBlueLight: '#E6F0FA',
  incheonGray: '#95A5A6',
};

const GalleryScreen = () => {
  // State
  const [galleryData, setGalleryData] = useState<GalleryItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Types for selected image
  type SelectedImage = {
    id: number;
    url: string;
    stampUsed: boolean;
  };

  // Load gallery data
  useEffect(() => {
    console.log('[GalleryScreen] Load gallery data')
    const loadGalleryData = async () => {
      try {
        setLoading(true);
        const unlockedSpots = await fetchUnlockedSpots();
        console.log('[GalleryScreen] unlockedSpots:', unlockedSpots);
      // unlockedSpots : 
      //   [
      //     {
      //         "id": 17,
      //         "order": 1,
      //         "unlock_at": "2025-09-01T10:11:51.717785Z",
      //         "created_at": "2025-08-31T10:11:51.723785Z",
      //         "route_id": 6,
      //         "route_spot_id": 1,
      //         "past_photo_url": "https://iharchive.ifac.or.kr/thumb/2022/12/MCMSFIP19414",
      //         "spot_name": "인천도호부관아"
      //     }
      // ]
        // Create unlocked spots from API response
        const unlockedItems: GalleryItem[] = unlockedSpots.map((spot: any) => ({
          id: spot.route_spot_id,
          title: spot.spot_name || `장소 ${spot.route_spot_id}`,
          past_image_url: spot.past_photo_url || '',
          completed: true,
          hasStamp: true,
          stampUsed: Math.random() > 0.5, // Randomly set stamp used for demo
          route_id: spot.route_id || 0,
          spot_id: spot.route_spot_id
        }));

        // Create empty slots for remaining spots (up to 16)
        const remainingSlots = 16 - unlockedItems.length;
        const emptySlots = Array(remainingSlots).fill(null).map((_, index) => ({
          id: unlockedItems.length + index + 1,
          title: `장소 ${unlockedItems.length + index + 1}`,
          past_image_url: '',
          completed: false,
          hasStamp: false,
          stampUsed: false,
          route_id: 0,
          spot_id: unlockedItems.length + index + 1
        }));

        // Combine unlocked items and empty slots
        const data = [...unlockedItems, ...emptySlots].slice(0, 16);
        
        setGalleryData(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load gallery data:', err);
        setError('갤러리 데이터를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };
    
    loadGalleryData();
  }, []);

  // Handle image press
  const handleImagePress = (item: GalleryItem) => {
    if (item.completed && item.past_image_url) {
      setSelectedImage({
        id: item.id,
        url: item.past_image_url,
        stampUsed: item.stampUsed
      });
    }
  };

  // Handle stamp press
  const handleStampPress = async () => {
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

              const response = await fetch(`${BACKEND_API.BASE_URL}/v1/photos/${selectedImage.id}/`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${tokens.access}`,
                },
                body: JSON.stringify({
                  stamp_used: true
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
                setSelectedImage(null);
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

  // Render gallery item
  const renderItem = ({ item }: { item: GalleryItem }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => handleImagePress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: item.past_image_url || 'https://via.placeholder.com/300' }} 
          style={styles.image} 
          resizeMode="cover"
        />
        
        {item.completed && item.hasStamp && (
          <Image 
            source={STAMP_IMAGES[item.title] || DEFAULT_STAMP} 
            style={styles.stampImage} 
            resizeMode="contain"
          />
        )}
        
        {!item.completed && (
          <View style={styles.lockedOverlay}>
            <Ionicons name="lock-closed" size={24} color="white" />
            <Text style={styles.lockedText}>잠금</Text>
          </View>
        )}
        
        {item.completed && item.hasStamp && !item.stampUsed && (
          <View style={styles.stampBadge}>
            <Ionicons name="checkmark-circle" size={20} color="white" />
          </View>
        )}
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={[
          styles.statusBadge, 
          item.completed ? styles.statusCompleted : styles.statusLocked
        ]}>
          <Text style={[
            styles.statusText,
            item.completed ? styles.statusTextCompleted : styles.statusTextLocked
          ]}>
            {item.completed ? '완료' : '미완료'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Loading State
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.incheonBlue} />
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            // Retry loading data
            const loadData = async () => {
              try {
                const unlockedSpots = await fetchUnlockedSpots();
                
                // Create unlocked spots from API response
                const unlockedItems: GalleryItem[] = unlockedSpots.map((spot) => ({
                  id: spot.route_spot_id,
                  title: `장소 ${spot.route_spot_id}`,
                  past_image_url: spot.past_photo_url || '',
                  completed: true,
                  hasStamp: true,
                  stampUsed: Math.random() > 0.5,
                  route_id: spot.route_id,
                  spot_id: spot.route_spot_id
                }));

                // Create empty slots for remaining spots (up to 16)
                const remainingSlots = 16 - unlockedItems.length;
                const emptySlots = Array(remainingSlots).fill(null).map((_, index) => ({
                  id: unlockedItems.length + index + 1,
                  title: `장소 ${unlockedItems.length + index + 1}`,
                  past_image_url: '',
                  completed: false,
                  hasStamp: false,
                  stampUsed: false,
                  route_id: 0,
                  spot_id: unlockedItems.length + index + 1
                }));

                // Combine unlocked items and empty slots
                const data = [...unlockedItems, ...emptySlots].slice(0, 16);
                
                setGalleryData(data);
                setLoading(false);
              } catch (err) {
                console.error('Failed to retry loading gallery data:', err);
                setError('데이터를 불러오는 중 오류가 발생했습니다.');
                setLoading(false);
              }
            };
            loadData();
          }}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>나의 갤러리</Text>
        <Text style={styles.headerSubtitle}>
          방문한 장소의 추억을 확인해보세요
        </Text>
      </View>
      
      <FlatList
        data={galleryData}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.galleryGrid}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Image Preview Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>사진 상세 보기</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Image 
              source={{ uri: selectedImage?.url || '' }} 
              style={styles.modalImage}
              resizeMode="contain"
            />
            {selectedImage && !selectedImage.stampUsed && (
              <TouchableOpacity 
                style={styles.useStampButton}
                onPress={handleStampPress}
              >
                <Text style={styles.useStampButtonText}>스탬프 사용하기</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  
  // Typography
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  
  // Gallery Grid
  galleryGrid: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  
  // Gallery Card
  card: {
    width: CARD_SIZE,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: CARD_SIZE,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  stampImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    zIndex: 2,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    color: COLORS.white,
    marginTop: 8,
    fontWeight: '600',
  },
  stampBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.success,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusCompleted: {
    backgroundColor: COLORS.incheonBlueLight,
  },
  statusLocked: {
    backgroundColor: COLORS.border,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextCompleted: {
    color: COLORS.incheonBlue,
  },
  statusTextLocked: {
    color: COLORS.gray,
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginVertical: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.incheonBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.incheonBlue,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 20,
  },
  useStampButton: {
    backgroundColor: COLORS.incheonBlue,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  useStampButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GalleryScreen;
