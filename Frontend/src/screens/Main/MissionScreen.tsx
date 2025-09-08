import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BACKEND_API } from '../../config/apiKeys';
import { completeMission } from '../../data/missions';
import authService from '../../services/authService';

const { width } = Dimensions.get('window');

// 과거사진 데이터 타입
interface PastImageData {
  id: number;
  name: string;
  past_image_url: string;
  address: string;
}

// 미션 데이터 타입
interface MissionData {
  id: number;
  location: {
    id: number;
    name: string;
    lat: number;
    lng: number;
  };
}

interface MissionScreenProps {
  route: {
    params: {
      mission: MissionData;
    };
  };
  navigation: any;
}

export default function MissionScreen({ route, navigation }: MissionScreenProps) {
  const { mission } = route.params;
  const [pastImages, setPastImages] = useState<PastImageData[]>([]);
  const [selectedImages, setSelectedImages] = useState<PastImageData[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<PastImageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);

  useEffect(() => {
    fetchPastImages();
  }, []);

  // 백엔드 API에서 past_image_url이 있는 스팟들 가져오기
  const fetchPastImages = async () => {
    try {
      setIsLoading(true);
      console.log('[MissionScreen] 과거사진 데이터 가져오기 시작');
      
      // 인증 토큰 가져오기
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/spots/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[MissionScreen] 전체 스팟 데이터:', data);

        // past_image_url이 있는 스팟들만 필터링
        const spotsWithPastImage = data.filter((spot: any) => 
          spot.past_image_url && spot.past_image_url.trim() !== ''
        );

        console.log('[MissionScreen] 과거사진이 있는 스팟들:', spotsWithPastImage);

        // PastImageData 형식으로 변환
        const pastImagesData: PastImageData[] = spotsWithPastImage.map((spot: any) => ({
          id: spot.id,
          name: spot.name || spot.title || `스팟 ${spot.id}`,
          past_image_url: spot.past_image_url,
          address: spot.address || spot.name || '주소 정보 없음'
        }));

        console.log('[MissionScreen] 변환된 과거사진 데이터:', pastImagesData);
        setPastImages(pastImagesData);
        
        // 데이터 로드 완료 (알림 없이)
        console.log(`[MissionScreen] ${spotsWithPastImage.length}개의 과거사진이 있는 스팟을 찾았습니다.`);
        
      } else {
        console.error('[MissionScreen] 과거사진 데이터 가져오기 실패:', response.status);
        Alert.alert('오류', '과거사진 데이터를 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('[MissionScreen] 과거사진 데이터 가져오기 에러:', error);
      Alert.alert('오류', '과거사진 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 미션 시작
  const startMission = () => {
    if (pastImages.length < 4) {
      Alert.alert('오류', '과거사진이 충분하지 않습니다.');
      return;
    }

    // 정답 이미지 찾기 (현재 미션 위치의 과거사진)
    const correctImage = pastImages.find(img => 
      img.name === mission.location.name || 
      img.name.includes(mission.location.name) ||
      mission.location.name.includes(img.name)
    );
    
    if (!correctImage) {
      Alert.alert('오류', '정답 이미지를 찾을 수 없습니다.');
      return;
    }
    
    // 정답 이미지를 제외한 나머지 이미지들
    const otherImages = pastImages.filter(img => img.id !== correctImage.id);
    
    // 3개의 오답 이미지 랜덤 선택
    const shuffledOthers = [...otherImages].sort(() => Math.random() - 0.5);
    const threeWrongAnswers = shuffledOthers.slice(0, 3);
    
    // 4개 이미지 구성: 정답 1개 + 오답 3개
    const selectedFour = [correctImage, ...threeWrongAnswers];
    
    // 4개 이미지 순서 랜덤 섞기
    const shuffledFour = [...selectedFour].sort(() => Math.random() - 0.5);
    
    setSelectedImages(shuffledFour);
    setCorrectAnswer(correctImage);
    setGameStarted(true);
    
    console.log('[MissionScreen] 미션 시작:', {
      correctAnswer: correctImage,
      selectedImages: shuffledFour,
      correctAnswerIndex: shuffledFour.findIndex(img => img.id === correctImage.id)
    });
  };

  // 답안 선택
  const selectAnswer = async (imageId: number) => {
    if (gameCompleted) return;
    
    setSelectedAnswer(imageId);
    
    const isCorrect = imageId === correctAnswer?.id;
    
    if (isCorrect) {
      setGameCompleted(true);
      
      // 정답 선택 시 카메라로 이동할지 선택
      Alert.alert(
        '정답입니다! 🎉',
        '과거 사진을 성공적으로 선택했습니다!\n이제 현재 모습을 촬영해보세요.',
        [
          {
            text: '나중에',
            onPress: async () => {
              // 미션 완료 처리 후 갤러리로 이동
              const success = await completeMission(mission.id);
              if (success) {
                navigation.navigate('MainTabs', { screen: 'Gallery' });
              }
            }
          },
          {
            text: '카메라로 이동',
            onPress: () => {
              // 카메라 화면으로 이동
              const selectedPhoto = selectedImages.find(img => img.id === imageId);
              if (selectedPhoto) {
                navigation.navigate('Camera', {
                  mission: mission,
                  selectedPhotoId: selectedPhoto.id,
                  selectedPhoto: selectedPhoto
                });
              }
            }
          }
        ]
      );
    } else {
      Alert.alert(
        '❌ 틀렸습니다',
        '다시 한번 생각해보세요!',
        [{ text: '다시 시도', onPress: () => setSelectedAnswer(null) }]
      );
    }
  };

  // 미션 재시작
  const restartMission = () => {
    setGameStarted(false);
    setSelectedAnswer(null);
    setGameCompleted(false);
    setSelectedImages([]);
    setCorrectAnswer(null);
  };

  if (isLoading) {
    return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={INCHEON_BLUE} />
        <Text style={styles.loadingText}>과거사진을 가져오는 중...</Text>
      </View>
    </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>🎯 {mission.location.name} 찾기</Text>
          </View>

          {!gameStarted ? (
            /* 미션 시작 화면 */
            <View style={styles.startSection}>
              <View style={styles.missionInfo}>
                <Text style={styles.missionInfoTitle}>📍 미션 장소</Text>
                <Text style={styles.missionInfoText}>{mission.location.name}</Text>

                <Text style={styles.missionInfoTitle}>🎯 미션 목표</Text>
                <Text style={styles.missionInfoText}>
                  {mission.location.name}의 과거 모습을 찾아주세요!
                </Text>

                <Text style={styles.missionInfoTitle}>📸 게임 방법</Text>
                <Text style={styles.missionInfoText}>
                  4개의 과거 사진 중에서 이곳의 과거일 것 같은 사진을 선택하면 돼요.
                </Text>
              </View>

              <TouchableOpacity style={styles.startButton} onPress={startMission}>
                <Text style={styles.startButtonText}>미션 시작하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* 게임 화면 */
            <View style={styles.gameSection}>
              <Text style={styles.gameTitle}>4개 중 정답을 선택하세요!</Text>

              <View style={styles.imagesGrid}>
                {selectedImages.map((image, index) => (
                  <TouchableOpacity
                    key={image.id}
                    style={[
                      styles.imageContainer,
                      selectedAnswer === image.id && styles.selectedImage,
                      gameCompleted && image.id === correctAnswer?.id && styles.correctImage
                    ]}
                    onPress={() => selectAnswer(image.id)}
                    disabled={gameCompleted}
                  >
                    <Image
                      source={{ uri: image.past_image_url }}
                      style={styles.image}
                      resizeMode="cover"
                    />

                    {/* 선택 표시 */}
                    {selectedAnswer === image.id && (
                      <View style={styles.selectionIndicator}>
                        <Text style={styles.selectionText}>
                          {image.id === correctAnswer?.id ? '⭕' : '❌'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {gameCompleted && (
                <View style={styles.completionSection}>
                  <Text style={styles.completionText}>
                    🎉 미션을 완료했습니다!
                  </Text>
                  <TouchableOpacity style={styles.restartButton} onPress={restartMission}>
                    <Text style={styles.restartButtonText}>다시 도전하기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    ...TEXT_STYLES.body,
    marginTop: 16,
    color: INCHEON_GRAY,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    ...TEXT_STYLES.heading,
    fontSize: 24,
    color: INCHEON_BLUE,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...TEXT_STYLES.body,
    color: INCHEON_GRAY,
    textAlign: 'center',
  },
  startSection: {
    alignItems: 'center',
  },
  missionInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    width: '100%',
  },
  missionInfoTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE,
    marginBottom: 8,
    marginTop: 16,
  },
  missionInfoText: {
    ...TEXT_STYLES.body,
    color: INCHEON_GRAY,
    marginBottom: 16,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 40,
    shadowColor: INCHEON_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    ...TEXT_STYLES.button,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  gameSection: {
    alignItems: 'center',
  },
  gameTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE,
    marginBottom: 24,
    textAlign: 'center',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  imageContainer: {
    width: (width - 60) / 2,
    height: (width - 60) / 2,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  selectedImage: {
    borderWidth: 3,
    borderColor: INCHEON_BLUE,
  },
  correctImage: {
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  imageName: {
    ...TEXT_STYLES.body,
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  completionSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  completionText: {
    ...TEXT_STYLES.subtitle,
    color: '#4CAF50',
    marginBottom: 20,
    textAlign: 'center',
  },
  restartButton: {
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  restartButtonText: {
    ...TEXT_STYLES.button,
    color: '#fff',
    fontWeight: '600',
  },
});
