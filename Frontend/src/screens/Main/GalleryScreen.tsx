import React, { useState, useEffect, useCallback } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CheckIcon from '../../components/ui/CheckIcon';
import PixelLockIcon from '../../components/ui/PixelLockIcon';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import authService from '../../services/authService';

const { width, height } = Dimensions.get('window');

// 갤러리 데이터 타입 정의
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
  isUserPhoto?: boolean;
}

// 스탬프 이미지 매핑 객체
const STAMP_IMAGES: { [key: string]: any } = {
  '백련사(강화)': require('../../assets/stamps/baekreon.png'),
  '부평도호부청사': require('../../assets/stamps/bupyeong_dohobu.png'),
  '부평향교': require('../../assets/stamps/bupyeong_hyanggyo.png'),
  '대불호텔전시관': require('../../assets/stamps/daebul.png'),
  '인천 답동성당': require('../../assets/stamps/dapdong_cathedral.png'),
  '대한성공회 강화성당': require('../../assets/stamps/ganghwa_cathedral.png'),
  '홍예문': require('../../assets/stamps/hongyemun.png'),
  '구 일본우선(郵船)주식회사 인천지점': require('../../assets/stamps/incheon_corporation.png'),
  '인천도호부관아': require('../../assets/stamps/incheon_dohobu.png'),
  '구 인천우체국': require('../../assets/stamps/incheon_post_office.png'),
  '제물포 구락부': require('../../assets/stamps/jaemulpo.png'),
  '인천내동성공회성당': require('../../assets/stamps/naedong_cathedral.png'),
  '논현포대': require('../../assets/stamps/nonhyun.png'),
  '팔미도 등대': require('../../assets/stamps/palmido.png'),
  '연미정': require('../../assets/stamps/yeonmijung.png'),
  '용동큰우물': require('../../assets/stamps/yongdong_great_well.png'),
};

const TOTAL_COURSE = Object.keys(STAMP_IMAGES).length;

export default function GalleryScreen({ navigation }: any) {
  const [galleryData, setGalleryData] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [foundCount, setFoundCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // --- Core Logic ---

  const checkLoginStatus = async (): Promise<any | null> => {
    try {
      const tokens = await authService.getTokens();
      const user = await authService.getUser();
      if (tokens?.access && user) {
        setIsLoggedIn(true);
        setUserProfile(user);
        return user;
      } else {
        setIsLoggedIn(false);
        setUserProfile(null);
        return null;
      }
    } catch (error) {
      console.error('로그인 상태 확인 실패:', error);
      setIsLoggedIn(false);
      setUserProfile(null);
      return null;
    }
  };

  const loadLocalPhotos = async (userId: number, currentMissions: GalleryItem[]) => {
    try {
      const userPhotosKey = `saved_photos_${userId}`;
      const savedPhotosJSON = await AsyncStorage.getItem(userPhotosKey);
      const userPhotos = savedPhotosJSON ? JSON.parse(savedPhotosJSON) : [];

      const mergedData = currentMissions.map(mission => {
        const userPhoto = userPhotos.find((p: any) => p.missionInfo.title === mission.title);
        if (userPhoto) {
          return {
            ...mission,
            completed: true,
            hasStamp: true,
            image_url: `file://${userPhoto.path}`,
            past_image_url: `file://${userPhoto.path}`,
            isUserPhoto: true,
            spot_id: userPhoto.missionInfo.spot_id,
            route_id: userPhoto.missionInfo.route_id,
          };
        }
        return mission;
      });

      const completedCount = mergedData.filter(item => item.completed).length;
      setGalleryData(mergedData);
      setFoundCount(completedCount);
    } catch (error) {
      console.error(`[GalleryScreen] 사용자(${userId}) 로컬 사진 불러오기 실패:`, error);
      setGalleryData(currentMissions); // 실패 시 기본 미션 목록 유지
    }
  };

  const initializeScreen = async () => {
    setIsLoading(true);

    const allMissions: GalleryItem[] = Object.keys(STAMP_IMAGES).map((key, index) => ({
      id: index + 1,
      title: key,
      completed: false,
      hasStamp: false,
      stampUsed: false,
      route_id: 0,
      spot_id: 0,
      image_url: '',
      past_image_url: '',
    }));

    const user = await checkLoginStatus();

    if (user && user.id) {
      await loadLocalPhotos(user.id, allMissions);
    } else {
      setGalleryData(allMissions);
      setFoundCount(0);
    }

    setIsLoading(false);
  };

  // --- Lifecycle Hooks ---
  useFocusEffect(
    useCallback(() => {
      console.log('[GalleryScreen] 화면 포커스됨 - 데이터 새로고침');
      initializeScreen();
    }, [])
  );

  // --- Event Handlers & Render Functions (이하 생략 없이 모두 포함) ---

  const handleImagePress = (item: GalleryItem) => {
    if (item.completed) {
      setSelectedImage(item);
      setImageModalVisible(true);
    } else if (!isLoggedIn) {
      setIsLoggedIn(false);
    }
  };

  const handleLoginPress = () => {
    navigation.navigate('Profile');
  };

  const handleStampPress = () => {
    Alert.alert('아직은 스탬프 사용이 어렵습니다.', '추후 업데이트를 기다려주세요.');
  };

  const renderLoginModal = () => (
    <Modal visible={!isLoggedIn} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBackground}>
          <View style={styles.loginModalContent}>
            <View style={styles.loginModalIcon}><Ionicons name="lock-closed" size={32} color={INCHEON_BLUE} /></View>
            <Text style={styles.loginModalTitle}>과거 사진 모음집</Text>
            <Text style={styles.loginModalSubtitle}>로그인하면 과거 사진과 함께{`\n`}특별한 스탬프도 수집할 수 있어요!</Text>
            <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress} activeOpacity={0.9}>
              <Text style={styles.loginButtonText}>로그인하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderStamp = () => {
    if (!selectedImage) return null;
    const stampSource = STAMP_IMAGES[selectedImage.title] || require('../../assets/stamps/jaemulpo.png');
    return (
      <View style={styles.modalStampContainer}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleStampPress}>
          <Image source={stampSource} style={styles.modalStampImage} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {foundCount === TOTAL_COURSE ? (
            <Text style={styles.title}>축하합니다!</Text>
          ) : (
            <Text style={styles.title}>완료한 미션</Text>
          )}
          <View style={styles.underline} />
          {isLoggedIn ? (
            foundCount === TOTAL_COURSE ? (
              <Text style={styles.subtitle}>모든 장소의 과거를 찾았어요 🥳</Text>
            ) : (
              <Text style={styles.subtitle}>전체 코스 {TOTAL_COURSE}개 중 {foundCount}개의 과거를 찾았어요</Text>
            )
          ) : (
            <Text style={styles.subtitle}>로그인해 과거 모습을 찾아보세요.</Text>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={INCHEON_BLUE} />
            </View>
          ) : (
            <View style={styles.gridWrap}>
              {galleryData.map((item) => (
                <TouchableOpacity key={item.id} style={styles.card} onPress={() => handleImagePress(item)} activeOpacity={0.8}>
                  <View style={styles.imageContainer}>
                    <Image
                      source={item.completed ? { uri: item.image_url } : require('../../assets/images/대동여지도.jpg')}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                    {!item.completed && (
                      <View style={styles.lockedOverlay}>
                        <Ionicons name="lock-closed" size={24} color="white" />
                        <Text style={styles.lockedText}>잠금</Text>
                      </View>
                    )}
                    {item.completed && item.hasStamp && (
                      <View style={styles.stampOverlay}>
                        <Image source={STAMP_IMAGES[item.title] || require('../../assets/stamps/jaemulpo.png')} style={styles.stampImage} resizeMode="contain" />
                      </View>
                    )}
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.missionTitle} numberOfLines={1}>{item.title}</Text>
                    {item.completed ? (
                      <View style={styles.stampBadge}><Ionicons name="checkmark-circle" size={16} color="white" /></View>
                    ) : (
                      <PixelLockIcon />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {renderLoginModal()}

        <Modal visible={imageModalVisible} transparent animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}><Text style={styles.modalTitle}>{selectedImage?.title}</Text></View>
                <TouchableOpacity onPress={() => setImageModalVisible(false)} style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.imageModalContainer}>
                <Image source={{ uri: selectedImage?.image_url }} style={styles.modalImage} resizeMode="contain" />
                {renderStamp()}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// Styles
const CARD_SIZE = (width - 32 - 16) / 2;
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f0f0' },
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  modalBackground: { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: 'white', maxWidth: 400 },
  loginModalContent: { padding: 32, alignItems: 'center' },
  loginModalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(20, 80, 158, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  loginModalTitle: { ...TEXT_STYLES.heading, color: INCHEON_BLUE, marginBottom: 12, textAlign: 'center' },
  loginModalSubtitle: { ...TEXT_STYLES.body, color: '#555', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  loginButton: { backgroundColor: INCHEON_BLUE, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center', shadowColor: INCHEON_BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  loginButtonText: { ...TEXT_STYLES.button, color: 'white', fontWeight: '600' },
  title: { ...TEXT_STYLES.subtitle, textAlign: 'center', marginTop: 24, marginBottom: 4 },
  underline: { height: 3, backgroundColor: INCHEON_BLUE, width: 140, alignSelf: 'center', marginBottom: 16, borderRadius: 2 },
  subtitle: { ...TEXT_STYLES.heading, color: INCHEON_GRAY, textAlign: 'center', marginBottom: 32 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  card: { width: CARD_SIZE, height: CARD_SIZE + 38, backgroundColor: '#fafafa', borderRadius: 14, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 12, overflow: 'hidden', alignItems: 'center' },
  imageContainer: { width: '100%', height: CARD_SIZE, position: 'relative' },
  photo: { width: '100%', height: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  lockedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  lockedText: { color: 'white', marginTop: 8, fontWeight: '600', fontSize: 14 },
  cardFooter: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  missionTitle: { ...TEXT_STYLES.body, flex: 1, marginRight: 6 },
  stampBadge: { backgroundColor: '#FF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  stampOverlay: { position: 'absolute', top: 8, right: 8, width: 40, height: 40, zIndex: 2 },
  stampImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: [{ rotate: '15deg' }] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: width - 40, height: height - 100, backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, borderColor: '#e0e0e0', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: INCHEON_BLUE_LIGHT },
  modalTitleContainer: { flex: 1 },
  modalTitle: { ...TEXT_STYLES.subtitle, color: INCHEON_BLUE },
  modalCloseButton: { paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  modalCloseButtonText: { ...TEXT_STYLES.body },
  imageModalContainer: { flex: 1, position: 'relative' },
  modalImage: { width: '100%', height: '100%' },
  modalStampContainer: { position: 'absolute', top: 160, right: 0, width: 100, height: 100, alignItems: 'center' },
  modalStampImage: { position: 'absolute', top: 0, left: 0, width: 100, height: 100, transform: [{ rotate: '20deg' }] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, minHeight: height * 0.6 },
  loadingText: { ...TEXT_STYLES.body, fontFamily: 'NeoDunggeunmoPro-Regular', color: INCHEON_GRAY, marginTop: 16, textAlign: 'center' },
  emptyGalleryContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: height * 0.5 },
  emptyGalleryText: { ...TEXT_STYLES.heading, color: INCHEON_GRAY, marginBottom: 8 },
  emptyGallerySubText: { ...TEXT_STYLES.body, color: '#aaa', textAlign: 'center' },
});