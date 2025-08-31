import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Text,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, WARNING, TEXT_STYLES } from '../../styles/fonts';
import PixelLockIcon from '../../components/ui/PixelLockIcon';
import CheckIcon from '../../components/ui/CheckIcon';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const TABS = [
  { key: 'progress', label: '진행 중' },
  { key: 'completed', label: '진행 완료' },
  { key: 'saved', label: '찜해 놓은' },
];

const coursePhotos = [
  { local: require('../../assets/icons/대불호텔.jpg'), locked: false },
  { local: null, locked: true },
  { local: null, locked: true },
  { local: null, locked: true },
];

// 진행완료된 코스 데이터
const completedCourses = [
  {
    id: 1,
    title: '인천 역사 탐방',
    description: '인천의 역사적 의미를 담은 코스',
    locations: ['대불호텔', '인천대공원', '월미도', '송도국제도시'],
    completedDate: '2024.01.15',
    totalPhotos: 4,
    photos: [
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
    ]
  },
  {
    id: 2,
    title: '인천 자연 탐방',
    description: '인천의 아름다운 자연을 만나는 코스',
    locations: ['인천대공원', '월미도', '송도국제도시'],
    completedDate: '2024.01.10',
    totalPhotos: 3,
    photos: [
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
    ]
  }
];

// 찜해놓은 코스 데이터
const savedCourses = [
  {
    id: 1,
    title: '인천 맛집 탐방',
    description: '인천의 유명한 맛집들을 찾아가는 코스',
    author: '여행러버',
    locations: ['인천항 맛집거리', '월미도 해산물', '송도 맛집'],
    savedDate: '2024.01.20',
    totalPhotos: 5,
    photos: [
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
    ]
  },
  {
    id: 2,
    title: '인천 야경 코스',
    description: '인천의 아름다운 야경을 감상하는 코스',
    author: '사진작가김',
    locations: ['송도국제도시', '월미도', '인천항'],
    savedDate: '2024.01.18',
    totalPhotos: 4,
    photos: [
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
      require('../../assets/icons/대불호텔.jpg'),
    ]
  }
];

const TripsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('progress');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseModalVisible, setCourseModalVisible] = useState(false);

  // 진행률 계산 (4개 장소 중 2개 완료 = 50%)
  const totalLocations = 4;
  const completedLocations = 2;
  const progressPercentage = (completedLocations / totalLocations) * 100;

  const renderProgressTab = () => (
    <ScrollView style={styles.content} contentContainerStyle={{paddingBottom: 32}} showsVerticalScrollIndicator={false}>
      {/* 제목 */}
      {/* <Text style={[styles.progressTitle, { fontFamily: 'NeoDunggeunmoPro-Regular' }]}>진행 중인 코스</Text>*/}

      {/* 진행률 섹션 */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>진행률</Text>
          <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
        </View>
        <Text style={styles.progressDetail}>
          {completedLocations} / {totalLocations} 완료
        </Text>
      </View>

      {/* 지도 영역 (이미지로 대체) */}
      <View style={styles.mapBox}>
        <Image source={require('../../assets/icons/Map_mockup.png')} style={styles.mapImg} resizeMode="cover" />
      </View>

      <View style={styles.cardContainer}>
      {/* 대불 호텔 카드 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <TouchableOpacity style={styles.hotelCard} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.hotelCardText}>대불 호텔</Text>
              </View>
              < CheckIcon />
            </TouchableOpacity>
          </View>

          {/* 인천대공원 코스 카드 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={styles.hotelCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.hotelCardText}>인천대공원</Text>
              </View>
              <TouchableOpacity
                style={[styles.prevNextBtn]}
                onPress={() => (navigation as any).navigate('Map', { startLocation: '현위치', endLocation: '인천대공원' })}
              >
                <Text style={styles.hotelCardArrow}>{'>'}</Text>
              </TouchableOpacity>
            </View>
          </View>
      </View>

      {/* 잠금 카드들 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={styles.lockedCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.lockedCardText}>인천의 중심</Text>
          </View>
          <PixelLockIcon />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={styles.lockedCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.lockedCardText}>인천의 역사적인 공간</Text>
          </View>
          <PixelLockIcon />
        </View>
      </View>

      {/* 사진 섹션 */}
      <Text style={[styles.photoSectionTitle, { fontFamily: 'NeoDunggeunmoPro-Regular' }]}>미션 완료</Text>
      <View style={styles.photoGrid}>
        {coursePhotos.map((photo, idx) => (
          <View key={idx} style={styles.photoSlot}>
            {photo.locked ? (
              <PixelLockIcon />
            ) : (
              <Image source={photo.local} style={styles.photo} resizeMode="cover" />
            )}
          </View>
        ))}
      </View>

      {/* 하단 버튼 */}
      <View style={styles.bottomRow}>
        <TouchableOpacity style={styles.quitBtn} activeOpacity={0.8}>
          <Text style={styles.quitBtnText}>코스 그만두기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderCompletedTab = () => (
    <ScrollView style={styles.content} contentContainerStyle={{paddingVertical: 16}} showsVerticalScrollIndicator={false}>
      {completedCourses.map((course) => (
        <TouchableOpacity
          key={course.id}
          style={styles.courseCard}
          onPress={() => {
            setSelectedCourse(course);
            setCourseModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.courseCardHeader}>
            <Text style={styles.courseCardTitle}>{course.title}</Text>
            <Text style={styles.courseCardDate}>{course.completedDate}</Text>
          </View>
          <Text style={styles.courseCardDescription}>{course.description}</Text>
          <View style={styles.courseCardLocations}>
            {course.locations.map((location, index) => (
              <Text key={index} style={styles.courseCardLocation}>
                {index + 1}. {location}
              </Text>
            ))}
          </View>
          <View style={styles.courseCardPhotos}>
            {course.photos.slice(0, 3).map((photo, index) => (
              <Image key={index} source={photo} style={styles.courseCardPhoto} resizeMode="cover" />
            ))}
            {course.photos.length > 3 && (
              <View style={styles.courseCardPhotoMore}>
                <Text style={styles.courseCardPhotoMoreText}>+{course.photos.length - 3}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSavedTab = () => (
    <ScrollView style={styles.content} contentContainerStyle={{paddingVertical: 16}} showsVerticalScrollIndicator={false}>
      {savedCourses.map((course) => (
        <TouchableOpacity
          key={course.id}
          style={styles.courseCard}
          onPress={() => {
            setSelectedCourse(course);
            setCourseModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.courseCardHeader}>
            <Text style={styles.courseCardTitle}>{course.title}</Text>
            <Text style={styles.courseCardAuthor}>by {course.author}</Text>
          </View>
          <Text style={styles.courseCardDescription}>{course.description}</Text>
          <View style={styles.courseCardLocations}>
            {course.locations.map((location, index) => (
              <Text key={index} style={styles.courseCardLocation}>
                {index + 1}. {location}
              </Text>
            ))}
          </View>
          <View style={styles.courseCardPhotos}>
            {course.photos.slice(0, 3).map((photo, index) => (
              <Image key={index} source={photo} style={styles.courseCardPhoto} resizeMode="cover" />
            ))}
            {course.photos.length > 3 && (
              <View style={styles.courseCardPhotoMore}>
                <Text style={styles.courseCardPhotoMoreText}>+{course.photos.length - 3}</Text>
              </View>
            )}
          </View>
          <Text style={styles.courseCardSavedDate}>찜한 날짜: {course.savedDate}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderCourseModal = () => (
    <Modal
      visible={courseModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{selectedCourse?.title}</Text>
          <TouchableOpacity onPress={() => setCourseModalVisible(false)} style={styles.modalCloseButton}>
            <Text style={styles.modalCloseButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalDescription}>{selectedCourse?.description}</Text>
          
          <Text style={styles.modalSectionTitle}>방문 장소</Text>
          {selectedCourse?.locations.map((location: string, index: number) => (
            <View key={index} style={styles.modalLocationItem}>
              <Text style={styles.modalLocationNumber}>{index + 1}</Text>
              <Text style={styles.modalLocationText}>{location}</Text>
            </View>
          ))}
          
          <Text style={styles.modalSectionTitle}>코스 사진</Text>
          <View style={styles.modalPhotoGrid}>
            {selectedCourse?.photos.map((photo: any, index: number) => (
              <Image key={index} source={photo} style={styles.modalPhoto} resizeMode="cover" />
            ))}
          </View>
          
          {selectedCourse?.author && (
            <Text style={styles.modalAuthor}>작성자: {selectedCourse.author}</Text>
          )}
          {selectedCourse?.completedDate && (
            <Text style={styles.modalDate}>완료 날짜: {selectedCourse.completedDate}</Text>
          )}
          {selectedCourse?.savedDate && (
            <Text style={styles.modalDate}>찜한 날짜: {selectedCourse.savedDate}</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f0f0' }} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          {/* 상단 탭 네비게이션 (세그먼트 컨트롤 스타일) */}
          <View style={styles.tabBarWrap}>
            {TABS.map((tab, idx) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabBtn,
                    isActive && styles.tabBtnActive,
                    idx === 0 && styles.tabBtnFirst,
                    idx === TABS.length - 1 && styles.tabBtnLast,
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.tabBtnText,
                    isActive ? styles.tabBtnTextActive : styles.tabBtnTextInactive,
                    { fontFamily: 'NeoDunggeunmoPro-Regular' }
                  ]}>{tab.label}</Text>
                  {isActive && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 탭별 콘텐츠 */}
          {activeTab === 'progress' && renderProgressTab()}
          {activeTab === 'completed' && renderCompletedTab()}
          {activeTab === 'saved' && renderSavedTab()}
        </View>
      </SafeAreaView>
      
      {/* 코스 상세 모달 */}
      {renderCourseModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 8,

  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
  },
  tabBarWrap: {
    flexDirection: 'row',
    borderRadius: 16,
    marginTop: 18,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginHorizontal: 2,
    position: 'relative',
  },
  tabBtnActive: {},
  tabBtnFirst: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  tabBtnLast: {
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  tabBtnText: {
    marginBottom: 3,
    fontSize: 16,
    textAlign: 'center',
  },
  tabBtnTextActive: {
    color: INCHEON_BLUE,
  },
  tabBtnTextInactive: {
    color: INCHEON_GRAY,
  },
  tabUnderline: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 4,
    height: 4,
    backgroundColor: INCHEON_BLUE,
    borderRadius: 2,
  },
  // 진행률 섹션 스타일
  progressSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE,
  },
  progressPercentage: {
    ...TEXT_STYLES.body,
    color: INCHEON_BLUE,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: INCHEON_BLUE,
    borderRadius: 4,
  },
  progressDetail: {
    fontSize: 14,
    color: INCHEON_GRAY,
    textAlign: 'center',
  },
  mapBox: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    overflow: 'hidden',
  },
  mapImg: {
    width: width - 40,
    height: 180,
    borderRadius: 0,
  },
  cardContainer: {
    marginTop: 16
  },
  hotelCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 10,
    borderRadius: 10,
  },
  hotelCardText: {
    ...TEXT_STYLES.body,
  },
  hotelCardArrow: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 18,
    color: INCHEON_GRAY,
  },
  prevNextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  prevNextBtn: {
    flex: 1,
    paddingVertical: 0,
    alignItems: 'center',
    flex: undefined,
    paddingVertical: 8,
    paddingHorizontal: 14
  },
  prevNextBtnText: {
    ...TEXT_STYLES.button,
    color: '#000'
  },
  lockedCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 10,
    borderRadius: 10,
  },
  lockedCardText: {
    ...TEXT_STYLES.body,
  },
  lockIconPixel: {
    textShadowColor: '#fff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  photoSectionTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE,
    marginVertical: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  photoSlot: {
    width: (width - 48) / 2,
    height: 90,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    position: 'relative',
  },
  quitBtn: {
    flex: 1,
    borderColor: WARNING,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  quitBtnText: {
    ...TEXT_STYLES.button,
    color: WARNING,
  },
  pixelLockIcon: {
    width: 28,
    height: 28,
    marginLeft: 4,
    marginRight: 4,
  },
  // 확인 필요
  pixelStepNum: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 38,
    color: INCHEON_GRAY,
    marginRight: 5,
    minWidth: 36,
    textAlign: 'center',
  },
  pixelStepNumActive: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 38,
    marginRight: 5,
    color: INCHEON_BLUE,
    textAlign: 'center',
  },
  // 새로운 코스 카드 스타일
  courseCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
  },
  courseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseCardTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE,
  },
  courseCardDate: {
    ...TEXT_STYLES.small
  },
  courseCardAuthor: {
    ...TEXT_STYLES.small
  },
  courseCardDescription: {
    ...TEXT_STYLES.body,
    marginBottom: 12,
    lineHeight: 22,
  },
  courseCardLocations: {
    marginBottom: 12,
  },
  courseCardLocation: {
    ...TEXT_STYLES.small,
    marginBottom: 4,
  },
  courseCardPhotos: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  courseCardPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  courseCardPhotoMore: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: INCHEON_BLUE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseCardPhotoMoreText: {
    ...TEXT_STYLES.small,
    color: INCHEON_BLUE,
  },
  courseCardSavedDate: {
    ...TEXT_STYLES.small,
    textAlign: 'right'
  },
  // 모달 스타일
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',

  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 10,
    paddingTop: 32,
    paddingBottom: 16,
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  modalTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE
  },
  modalCloseButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    ...TEXT_STYLES.body,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    ...TEXT_STYLES.body,
    lineHeight: 24,
    marginBottom: 20,
  },
  modalSectionTitle: {
    ...TEXT_STYLES.heading,
    color: INCHEON_BLUE,
    marginBottom: 12,
    marginTop: 20,
  },
  modalLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalLocationNumber: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_BLUE,
    fontWeight: 'bold',
    marginRight: 8,
    width: 20,
  },
  modalLocationText: {
    ...TEXT_STYLES.body,
  },
  modalPhotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  modalPhoto: {
    width: (width - 80) / 3,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalAuthor: {
    ...TEXT_STYLES.small,
    marginBottom: 8,
  },
  modalDate: {
    ...TEXT_STYLES.small,
    marginBottom: 8,
  },
});

export default TripsScreen; 