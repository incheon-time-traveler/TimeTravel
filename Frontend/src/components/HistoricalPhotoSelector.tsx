import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Mission, HistoricalPhoto } from '../types/mission';
import { INCHEON_BLUE, INCHEON_GRAY } from '../styles/fonts';
import { BACKEND_API } from '../config/apiKeys';
import authService from '../services/authService';

interface HistoricalPhotoSelectorProps {
  visible: boolean;
  mission: Mission | null;
  onClose: () => void;
  onPhotoSelected: (mission: Mission, photoId: number) => void;
  navigation?: any; // 네비게이션 추가
}

const HistoricalPhotoSelector: React.FC<HistoricalPhotoSelectorProps> = ({
  visible,
  mission,
  onClose,
  onPhotoSelected,
  navigation,
}) => {
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handlePhotoSelect = async (photoId: number) => {
    setSelectedPhotoId(photoId);
    
    // 정답은 항상 첫 번째 사진 (photoId === 1)
    const correct = photoId === 1;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    // 2초 후 피드백 숨기고 결과 처리
    setTimeout(async () => {
      setShowFeedback(false);
      if (correct) {
        // 정답인 경우 - 미션 완료 처리 후 갤러리로 이동
        if (mission && navigation) {
          try {
            // 미션 완료 처리 (use_stamp API 호출)
            const tokens = await authService.getTokens();
            if (tokens?.access) {
              // 현재 진행중인 코스에서 해당 spot의 UserRouteSpot ID 찾기
              const userCourseResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/user_routes/`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${tokens.access}`,
                },
              });

              if (userCourseResponse.ok) {
                const userCourses = await userCourseResponse.json();
                if (userCourses.length > 0) {
                  const currentCourse = userCourses[0];
                  const currentSpot = currentCourse.spots.find((spot: any) => spot.id === mission.id);
                  
                  if (currentSpot) {
                    // use_stamp API 호출하여 미션 완료 처리
                    const stampResponse = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/use_stamp/`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${tokens.access}`,
                      },
                      body: JSON.stringify({
                        id: currentSpot.user_route_spot_id, // UserRouteSpot ID
                        is_used: true
                      }),
                    });

                    if (stampResponse.ok) {
                      console.log('[HistoricalPhotoSelector] 미션 완료 처리 성공');
                    } else {
                      console.error('[HistoricalPhotoSelector] 미션 완료 처리 실패:', stampResponse.status);
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('[HistoricalPhotoSelector] 미션 완료 처리 오류:', error);
          }

          console.log('[HistoricalPhotoSelector] 미션 완료! 갤러리로 이동');
          navigation.navigate('Gallery');
          onClose(); // 모달 닫기
        }
      } else {
        // 오답인 경우 - 다시 선택할 수 있도록
        setSelectedPhotoId(null);
        setIsCorrect(null);
      }
    }, 2000);
  };

  const handleCancel = () => {
    setSelectedPhotoId(null);
    setIsCorrect(null);
    setShowFeedback(false);
    onClose();
  };

  if (!mission) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>미션장소 사진 보여주기</Text>
          </View>

          {/* 질문 박스 */}
          <View style={styles.questionBox}>
            <Text style={styles.questionText}>
              어떤 사진이 현재 장소의 과거 사진일까요?
            </Text>
          </View>

          {/* 사진 그리드 */}
          <View style={styles.photoGrid}>
            {mission.historicalPhotos.map((photo, index) => (
              <TouchableOpacity
                key={photo.id}
                style={[
                  styles.photoCard,
                  selectedPhotoId === photo.id && styles.selectedPhotoCard,
                  selectedPhotoId === photo.id && isCorrect && styles.correctPhotoCard,
                  selectedPhotoId === photo.id && !isCorrect && styles.incorrectPhotoCard,
                ]}
                onPress={() => handlePhotoSelect(photo.id)}
                disabled={showFeedback}
              >
                <Image
                  source={typeof photo.imageUrl === 'string' ? { uri: photo.imageUrl } : photo.imageUrl}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* 피드백 메시지 */}
          {showFeedback && (
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackText}>
                {isCorrect ? '정답입니다!' : '오답입니다! 다시 선택해주세요!'}
              </Text>
            </View>
          )}

          {/* 정답인 경우 카메라 버튼 */}
          {isCorrect && !showFeedback && (
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => {
                if (mission && selectedPhotoId) {
                  onPhotoSelected(mission, selectedPhotoId);
                }
              }}
            >
              <Text style={styles.cameraButtonText}>카메라로 넘어가기</Text>
            </TouchableOpacity>
          )}

          {/* 하단 채팅봇 바 */}
          <View style={styles.chatbotBar}>
            <Text style={styles.chatbotText}>ChatBot</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    backgroundColor: '#5C5D60',
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  questionBox: {
    backgroundColor: '#5C5D60',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  questionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between',
  },
  photoCard: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  selectedPhotoCard: {
    borderColor: INCHEON_BLUE,
  },
  correctPhotoCard: {
    borderColor: '#4CAF50',
    borderWidth: 4,
  },
  incorrectPhotoCard: {
    borderColor: '#FF5722',
    borderWidth: 4,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  feedbackBox: {
    backgroundColor: '#5C5D60',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  cameraButton: {
    backgroundColor: INCHEON_BLUE,
    margin: 15,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  cameraButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatbotBar: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'flex-end',
  },
  chatbotText: {
    fontSize: 14,
    color: INCHEON_GRAY,
  },
});

export default HistoricalPhotoSelector; 