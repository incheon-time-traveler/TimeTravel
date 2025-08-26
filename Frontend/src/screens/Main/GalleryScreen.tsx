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
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY } from '../../styles/fonts';

const { width, height } = Dimensions.get('window');

const MISSION_DATA = [
  { 
    id: 1, 
    title: '대불호텔 미션', 
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
      '스템프 사용',
      '스템프를 사장님께 보여주세요!\n(본인이 사용 버튼을 누르지 않도록 조심)',
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
    if (!selectedImage?.hasStamp || selectedImage?.stampUsed) {
      return null;
    }

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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>현재까지 진행하신 미션 사진</Text>
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
                  {item.hasStamp && !item.stampUsed && (
                    <View style={styles.stampOverlay}>
                      <View style={styles.stamp}>
                        <Text style={styles.stampText}>대불호텔</Text>
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
                <View style={[styles.statusBadge, item.completed ? styles.badgeCompleted : styles.badgeLocked]}>
                  <Text style={[styles.badgeText, item.completed ? styles.badgeTextCompleted : styles.badgeTextLocked]}>
                    {item.completed ? '완료' : '잠금'}
                  </Text>
                </View>
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
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
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
  );
}

const CARD_SIZE = (width - 32 - 16) / 2; // 좌우 패딩+gap 고려

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 18,
    color: INCHEON_GRAY,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  underline: {
    height: 2,
    backgroundColor: INCHEON_BLUE,
    width: 120,
    alignSelf: 'center',
    marginBottom: 12,
    borderRadius: 2,
  },
  subtitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
    textAlign: 'center',
    marginBottom: 18,
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
    borderWidth: 2,
    borderColor: INCHEON_GRAY,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: INCHEON_GRAY,
    backgroundColor: '#fff',
  },
  missionTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 13,
    color: INCHEON_GRAY,
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
  stampText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
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
    borderColor: '#222',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#222',
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  modalTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 18,
    color: INCHEON_BLUE,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: INCHEON_BLUE,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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