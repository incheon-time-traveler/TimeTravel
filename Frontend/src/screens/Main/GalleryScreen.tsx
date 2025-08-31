import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  Dimensions, 
  TouchableOpacity, 
  Modal, 
  Alert 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CheckIcon from '../../components/ui/CheckIcon';
import PixelLockIcon from '../../components/ui/PixelLockIcon';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const MISSION_DATA = [
  { 
    id: 1, 
    title: '대불호텔',
    image: require('../../assets/icons/대불호텔.jpg'), 
    completed: true,
    hasStamp: true,
    stampUsed: false
  },
  { 
    id: 2, 
    title: '과거 찾기 미션 2', 
    image: 'https://cdn.ggilbo.com/news/photo/202210/953273_905995_3932.jpg', 
    completed: true,
    hasStamp: false,
    stampUsed: false
  },
  { 
    id: 3, 
    title: '과거 찾기 미션 3', 
    image: '', 
    completed: false,
    hasStamp: false,
    stampUsed: false
  },
  { 
    id: 4, 
    title: '과거 찾기 미션 4', 
    image: '', 
    completed: false,
    hasStamp: false,
    stampUsed: false
  },
  { 
    id: 5, 
    title: '과거 찾기 미션 5', 
    image: '', 
    completed: false,
    hasStamp: false,
    stampUsed: false
  },
  { 
    id: 6, 
    title: '과거 찾기 미션 6', 
    image: '', 
    completed: false,
    hasStamp: false,
    stampUsed: false
  },
];

const TOTAL_COURSE = 52;
const FOUND_COUNT = 8;

export default function GalleryScreen() {
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [missionData, setMissionData] = useState(MISSION_DATA);

  const handleImagePress = (item: any) => {
    if (item.completed && item.image) {
      setSelectedImage(item);
      setImageModalVisible(true);
    }
  };

  const handleStampPress = () => {
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
          onPress: () => {
            // 스탬프 사용 처리
            setMissionData(prev => 
              prev.map(item => 
                item.id === selectedImage.id 
                  ? { ...item, stampUsed: true }
                  : item
              )
            );
            setImageModalVisible(false);
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
            <Text style={styles.subtitle}>전체 코스 {TOTAL_COURSE}개 중 {FOUND_COUNT}개의 과거를 찾았어요</Text>
            <View style={styles.gridWrap}>
              {missionData.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => handleImagePress(item)}
                  activeOpacity={0.8}
                >
                  {item.completed && item.image ? (
                    <View style={styles.imageContainer}>
                      <Image
                        source={typeof item.image === 'string' ? { uri: item.image } : item.image}
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
                    source={typeof selectedImage?.image === 'string' ? { uri: selectedImage.image } : selectedImage?.image}
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