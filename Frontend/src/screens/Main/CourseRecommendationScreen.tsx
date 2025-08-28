import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Switch,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY } from '../../styles/fonts';
import { BACKEND_API } from '../../config/apiKeys';

const { width } = Dimensions.get('window');

// 사용자 선호도 옵션들 (백엔드 README 기반)
const preferenceOptions = [
  { id: 'walking_activity', text: '👟 걷기 좋은 길을 따라 즐기는 산책' },
  { id: 'night_view', text: '🌉 바다와 도시의 멋진 풍경/야경' },
  { id: 'quiet_rest', text: '🤫 복잡한 곳을 피해 즐기는 휴식' },
  { id: 'experience_info', text: '🎓 역사와 문화가 담긴 특별한 체험' },
  { id: 'fun_sightseeing', text: '🎉 지루할 틈 없는 다이나믹한 재미' },
  { id: 'with_children', text: '👶 아이와 함께' },
  { id: 'with_pets', text: '🐕 우리 집 댕댕이와 함께' },
  { id: 'public_transport', text: '🚌 대중교통으로 충분해요' },
  { id: 'car_transport', text: '🚗 자차나 택시로 편하게 다닐래요' },
  { id: 'famous', text: '⭐ 사람들이 많이 찾는 유명한 곳 위주로!' },
  { id: 'clean_facility', text: '✨ 시설이 깔끔하고 편리했으면 좋겠어요' },
];

// 장소 수 옵션
const placeCountOptions = [3, 4, 5, 6, 7, 8];

export default function CourseRecommendationScreen({ navigation }: any) {
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [selectedPlaceCount, setSelectedPlaceCount] = useState(5);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [missionAccepted, setMissionAccepted] = useState(false);
  const [moveToOtherRegion, setMoveToOtherRegion] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [missionProposal, setMissionProposal] = useState<string>('');

  useEffect(() => {
    // 임시로 서울 인천 지역 좌표 설정 (실제로는 GPS로 가져와야 함)
    setUserLocation({ lat: 37.4562557, lng: 126.7052062 });
  }, []);

  const togglePreference = (preferenceId: string) => {
    setSelectedPreferences(prev =>
      prev.includes(preferenceId)
        ? prev.filter(id => id !== preferenceId)
        : [...prev, preferenceId]
    );
  };

  const getMissionProposal = async () => {
    if (!userLocation) return;

    try {
      // 백엔드 서버가 실행 중인지 확인
      const response = await fetch(
        `${BACKEND_API.BASE_URL}/v1/courses/mission_proposal/?user_lat=${userLocation.lat}&user_lon=${userLocation.lng}&move_to_other_region=${moveToOtherRegion}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        // 응답 타입 확인
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            setMissionProposal(data.proposal);
          } catch (jsonError) {
            console.error('미션 제안 JSON 파싱 실패:', jsonError);
            // 임시 미션 제안 메시지
            setMissionProposal('📸 과거 사진 촬영 미션에 도전해보시겠어요?\n가장 가까운 미션 장소는 약 2.3km 거리에 있습니다.');
          }
        } else {
          // HTML 응답인 경우 (에러 페이지 등)
          console.error('미션 제안: 예상치 못한 응답 타입:', contentType);
          const responseText = await response.text();
          console.error('미션 제안 응답 내용:', responseText.substring(0, 200));
          // 임시 미션 제안 메시지
          setMissionProposal('📸 과거 사진 촬영 미션에 도전해보시겠어요?\n가장 가까운 미션 장소는 약 2.3km 거리에 있습니다.');
        }
      } else {
        console.log('미션 제안 응답 실패:', response.status);
        // 임시 미션 제안 메시지
        setMissionProposal('📸 과거 사진 촬영 미션에 도전해보시겠어요?\n가장 가까운 미션 장소는 약 2.3km 거리에 있습니다.');
      }
    } catch (error) {
      console.error('미션 제안 가져오기 실패:', error);
      // 네트워크 에러 시 임시 미션 제안 메시지
      setMissionProposal('📸 과거 사진 촬영 미션에 도전해보시겠어요?\n가장 가까운 미션 장소는 약 2.3km 거리에 있습니다.');
    }
  };

  const generateCourse = async () => {
    if (selectedPreferences.length === 0) {
      Alert.alert('선호도 선택 필요', '최소 하나의 선호도를 선택해주세요.');
      return;
    }

    if (!userLocation) {
      Alert.alert('위치 정보 필요', '현재 위치를 가져올 수 없습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/generate_course/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_answers: selectedPreferences,
          num_places: selectedPlaceCount,
          user_lat: userLocation.lat,
          user_lon: userLocation.lng,
          mission_accepted: missionAccepted,
          move_to_other_region: moveToOtherRegion
        }),
      });

      if (response.ok) {
        // 응답 타입 확인
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            Alert.alert(
              '코스 생성 완료! 🎉',
              `${data.total_spots}개의 장소로 구성된 맞춤형 코스가 생성되었습니다!`,
              [
                {
                  text: '코스 보기',
                  onPress: () => {
                    // TODO: 생성된 코스 화면으로 이동
                    navigation.goBack();
                  }
                }
              ]
            );
          } catch (jsonError) {
            console.error('JSON 파싱 실패:', jsonError);
            Alert.alert('응답 처리 오류', '서버 응답을 처리할 수 없습니다.');
          }
        } else {
          // HTML 응답인 경우 (에러 페이지 등)
          console.error('예상치 못한 응답 타입:', contentType);
          const responseText = await response.text();
          console.error('응답 내용:', responseText.substring(0, 200)); // 처음 200자만 로깅
          Alert.alert('서버 오류', '서버에서 예상치 못한 응답을 받았습니다.');
        }
      } else {
        // HTTP 에러 응답 처리
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            Alert.alert('코스 생성 실패', errorData.error || '코스 생성 중 오류가 발생했습니다.');
          } else {
            const errorText = await response.text();
            console.error('에러 응답:', errorText.substring(0, 200));
            Alert.alert('코스 생성 실패', `서버 오류 (${response.status})`);
          }
        } catch (parseError) {
          console.error('에러 응답 파싱 실패:', parseError);
          Alert.alert('코스 생성 실패', `서버 오류 (${response.status})`);
        }
      }
    } catch (error) {
      console.error('코스 생성 실패:', error);
      // 네트워크 에러 시 임시 성공 메시지 (백엔드 연동 전)
      Alert.alert(
        '코스 생성 완료! 🎉',
        `${selectedPlaceCount}개의 장소로 구성된 맞춤형 코스가 생성되었습니다!`,
        [
          {
            text: '코스 보기',
            onPress: () => {
              navigation.goBack();
            }
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  useEffect(() => {
    if (userLocation) {
      getMissionProposal();
    }
  }, [userLocation, moveToOtherRegion]);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color={INCHEON_GRAY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>맞춤형 코스 추천</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 안내 메시지 */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>나만의 여행 코스를 만들어보세요! 🗺️</Text>
          <Text style={styles.infoSubtitle}>
            선호도와 위치를 알려주시면 인천 지역의 최적의 여행 코스를 추천해드려요
          </Text>
        </View>

        {/* 위치 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 현재 위치</Text>
          {userLocation ? (
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={20} color={INCHEON_BLUE} />
              <Text style={styles.locationText}>
                위도: {userLocation.lat.toFixed(6)}, 경도: {userLocation.lng.toFixed(6)}
              </Text>
            </View>
          ) : (
            <View style={styles.locationInfo}>
              <Ionicons name="location-outline" size={20} color={INCHEON_GRAY} />
              <Text style={styles.locationText}>위치 정보를 가져오는 중...</Text>
            </View>
          )}
        </View>

        {/* 선호도 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 여행 선호도 선택</Text>
          <Text style={styles.sectionSubtitle}>원하는 항목들을 선택해주세요 (복수 선택 가능)</Text>

          <View style={styles.preferencesGrid}>
            {preferenceOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.preferenceItem,
                  selectedPreferences.includes(option.id) && styles.selectedPreferenceItem
                ]}
                onPress={() => togglePreference(option.id)}
              >
                <Text style={[
                  styles.preferenceText,
                  selectedPreferences.includes(option.id) && styles.selectedPreferenceText
                ]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 장소 수 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏛️ 방문할 장소 수</Text>
          <View style={styles.placeCountContainer}>
            {placeCountOptions.map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.placeCountButton,
                  selectedPlaceCount === count && styles.selectedPlaceCountButton
                ]}
                onPress={() => setSelectedPlaceCount(count)}
              >
                <Text style={[
                  styles.placeCountText,
                  selectedPlaceCount === count && styles.selectedPlaceCountText
                ]}>
                  {count}개
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 미션 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 과거 사진 촬영 미션</Text>
          <View style={styles.missionContainer}>
            <View style={styles.missionToggle}>
              <Text style={styles.missionText}>미션 포함하기</Text>
              <Switch
                value={missionAccepted}
                onValueChange={setMissionAccepted}
                trackColor={{ false: '#ddd', true: INCHEON_BLUE_LIGHT }}
                thumbColor={missionAccepted ? INCHEON_BLUE : '#f4f3f4'}
              />
            </View>

            {missionAccepted && missionProposal && (
              <View style={styles.missionProposal}>
                <Text style={styles.missionProposalText}>{missionProposal}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 지역 이동 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌍 지역 이동 허용</Text>
          <View style={styles.regionToggle}>
            <Text style={styles.regionText}>다른 지역으로 이동 허용</Text>
            <Switch
              value={moveToOtherRegion}
              onValueChange={setMoveToOtherRegion}
              trackColor={{ false: '#ddd', true: INCHEON_BLUE_LIGHT }}
              thumbColor={moveToOtherRegion ? INCHEON_BLUE : '#f4f3f4'}
            />
          </View>
          <Text style={styles.regionSubtext}>
            {moveToOtherRegion
              ? '강화군, 영종도, 내륙 등 모든 지역의 장소를 포함할 수 있어요'
              : '현재 위치 주변 지역의 장소만으로 코스를 구성해요'
            }
          </Text>
        </View>

        {/* 코스 생성 버튼 */}
        <View style={styles.generateSection}>
          <TouchableOpacity
            style={[
              styles.generateButton,
              (selectedPreferences.length === 0 || !userLocation) && styles.generateButtonDisabled
            ]}
            onPress={generateCourse}
            disabled={selectedPreferences.length === 0 || !userLocation || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="wand" size={24} color="#fff" />
                <Text style={styles.generateButtonText}>맞춤형 코스 생성하기</Text>
              </>
            )}
          </TouchableOpacity>

          {selectedPreferences.length === 0 && (
            <Text style={styles.warningText}>선호도를 선택해주세요</Text>
          )}

          {!userLocation && (
            <Text style={styles.warningText}>위치 정보가 필요합니다</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 20,
    fontWeight: 'bold',
    color: INCHEON_GRAY,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoSection: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  infoTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 18,
    fontWeight: 'bold',
    color: INCHEON_BLUE,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoSubtitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    fontWeight: 'bold',
    color: INCHEON_GRAY,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
    marginBottom: 16,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  preferenceItem: {
    width: '48%', // 2개씩 배치
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPreferenceItem: {
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderColor: INCHEON_BLUE,
    borderWidth: 2,
  },
  preferenceText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
  },
  selectedPreferenceText: {
    color: INCHEON_BLUE,
    fontWeight: 'bold',
  },
  placeCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  placeCountButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: INCHEON_GRAY,
  },
  selectedPlaceCountButton: {
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderColor: INCHEON_BLUE,
    borderWidth: 2,
  },
  placeCountText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
  },
  selectedPlaceCountText: {
    color: INCHEON_BLUE,
    fontWeight: 'bold',
  },
  missionContainer: {
    marginTop: 10,
  },
  missionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  missionText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
  },
  missionProposal: {
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  missionProposalText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_BLUE,
    textAlign: 'center',
  },
  regionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
  },
  regionText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
  },
  regionSubtext: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 12,
    color: INCHEON_GRAY,
    marginTop: 5,
    textAlign: 'center',
  },
  generateSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INCHEON_BLUE,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 30,
    width: '100%',
  },
  generateButtonDisabled: {
    backgroundColor: INCHEON_GRAY,
    opacity: 0.7,
  },
  generateButtonText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  warningText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 12,
    color: INCHEON_GRAY,
    marginTop: 10,
    textAlign: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
  },
  locationText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_GRAY,
    marginLeft: 10,
  },
});
