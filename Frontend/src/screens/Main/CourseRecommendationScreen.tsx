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
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import { BACKEND_API } from '../../config/apiKeys';
import authService from '../../services/authService';

const { width } = Dimensions.get('window');

// 사용자 선호도 옵션들 (새로운 4단계 구조)
const preferenceOptions = {
  travelType: [
    { id: 'walking_activity', text: '걷기 좋은 길을 따라 즐기는 산책' },
    { id: 'night_view', text: '바다와 도시의 멋진 풍경/야경' },
    { id: 'quiet_rest', text: '복잡한 곳을 피해 즐기는 휴식' },
    { id: 'experience_info', text: '역사와 문화가 담긴 특별한 체험' },
    { id: 'fun_sightseeing', text: '지루할 틈 없는 다이나믹한 재미' },
  ],
  companion: [
    { id: 'with_children', text: '아이와 함께' },
    { id: 'with_lover', text: '연인과 함께' },
    { id: 'with_friends', text: '친구와 함께' },
    { id: 'with_family', text: '가족과 함께' },
    { id: 'with_pets', text: '반려동물과 함께' },
  ],
  transportation: [
    { id: 'public_transport', text: '대중교통으로' },
    { id: 'car_transport', text: '자차나 택시로' },
  ],
  additional: [
    { id: 'famous', text: '사람들이 많이 찾는 유명한 곳 위주로' },
    { id: 'clean_facility', text: '시설이 깔끔하고 편리했으면 좋겠어요' },
  ]
};

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
      console.log('[CourseRecommendationScreen] 미션 제안 요청 시작');
      
      // 로그인 상태 확인 및 토큰 가져오기
      const tokens = await authService.getTokens();
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      // 토큰이 있으면 Authorization 헤더 추가
      if (tokens?.access) {
        headers['Authorization'] = `Bearer ${tokens.access}`;
      }
      
      const response = await fetch(
        `${BACKEND_API.BASE_URL}/v1/courses/mission_proposal/?user_lat=${userLocation.lat}&user_lon=${userLocation.lng}&move_to_other_region=${moveToOtherRegion}`,
        {
          method: 'GET',
          headers,
        }
      );

      console.log('[CourseRecommendationScreen] 미션 제안 응답:', response.status, response.statusText);

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            console.log('[CourseRecommendationScreen] 미션 제안 데이터:', data);
            
            if (data.proposal) {
              setMissionProposal(data.proposal);
            } else {
              setMissionProposal('📸 과거 사진 촬영 미션을 확인할 수 없습니다.');
            }
          } catch (jsonError) {
            console.error('[CourseRecommendationScreen] 미션 제안 JSON 파싱 실패:', jsonError);
            setMissionProposal('📸 미션 제안을 처리할 수 없습니다.');
          }
        } else {
          console.error('[CourseRecommendationScreen] 미션 제안: 예상치 못한 응답 타입:', contentType);
          const responseText = await response.text();
          console.error('[CourseRecommendationScreen] 미션 제안 응답 내용:', responseText.substring(0, 200));
          setMissionProposal('📸 미션 제안을 가져올 수 없습니다.');
        }
      } else {
        console.log('[CourseRecommendationScreen] 미션 제안 응답 실패:', response.status, response.statusText);
        
        // 에러 응답 상세 정보 확인
        try {
          const errorData = await response.json();
          console.error('[CourseRecommendationScreen] 미션 제안 에러:', errorData);
          setMissionProposal(`📸 미션 제안 실패: ${errorData.detail || errorData.error || '알 수 없는 오류'}`);
        } catch (parseError) {
          setMissionProposal(`📸 미션 제안 실패 (HTTP ${response.status})`);
        }
      }
    } catch (error) {
      console.error('[CourseRecommendationScreen] 미션 제안 가져오기 실패:', error);
      setMissionProposal('📸 네트워크 오류로 미션 제안을 가져올 수 없습니다.');
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
      console.log('[CourseRecommendationScreen] 코스 생성 요청 시작');
      console.log('[CourseRecommendationScreen] 선택된 선호도:', selectedPreferences);

      // 백엔드가 지원하는 선호도만 전송 (모델 필드 기준)
      const SUPPORTED_PREFERENCES = [
        'walking_activity',
        'night_view',
        'quiet_rest',
        'experience_info',
        'fun_sightseeing',
        'with_children',
        'with_pets',
        'public_transport',
        'car_transport',
        'famous',
        'clean_facility',
      ];
      const filteredPreferences = selectedPreferences.filter((p) => SUPPORTED_PREFERENCES.includes(p));
      if (filteredPreferences.length === 0) {
        Alert.alert('선호도 재선택 필요', '현재 선택한 항목은 아직 지원되지 않습니다. 다른 항목을 선택해주세요.');
        setIsLoading(false);
        return;
      }

      console.log('[CourseRecommendationScreen] 전송할 선호도(필터링):', filteredPreferences);
      console.log('[CourseRecommendationScreen] 장소 수:', selectedPlaceCount);
      console.log('[CourseRecommendationScreen] 사용자 위치:', userLocation);
      console.log('[CourseRecommendationScreen] 미션 포함:', missionAccepted);
      console.log('[CourseRecommendationScreen] 지역 이동 허용:', moveToOtherRegion);

      const requestBody = {
        user_answers: filteredPreferences,
        num_places: selectedPlaceCount,
        user_lat: userLocation.lat,
        user_lon: userLocation.lng,
        mission_accepted: missionAccepted,
        move_to_other_region: moveToOtherRegion
      };

      console.log('[CourseRecommendationScreen] 요청 본문:', requestBody);

      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/generate_course/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[CourseRecommendationScreen] 코스 생성 응답:', response.status, response.statusText);

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json();
            console.log('[CourseRecommendationScreen] 코스 생성 성공 데이터:', data);
            
            // 성공적인 코스 생성
            if (data.success && data.course_spots) {
              const totalSpots = data.total_spots || data.course_spots.length;
              
              Alert.alert(
                '코스 생성 완료! 🎉',
                `${totalSpots}개의 장소로 구성된 코스가 생성되었습니다!`,
                [
                  {
                    text: '조건 바꾸기',
                    style: 'cancel'
                  },
                  {
                    text: '코스 보기',
                    onPress: () => {
                      // 생성된 코스 상세 화면으로 이동
                      console.log('[CourseRecommendationScreen] 생성된 코스:', data.course_spots);
                      navigation.navigate('CourseDetail', { courseData: data });
                    }
                  }
                ]
              );
            } else {
              Alert.alert('코스 생성 실패', '코스 생성은 완료되었지만 데이터 형식이 올바르지 않습니다.');
            }
          } catch (jsonError) {
            console.error('[CourseRecommendationScreen] JSON 파싱 실패:', jsonError);
            Alert.alert('응답 처리 오류', '서버 응답을 처리할 수 없습니다.');
          }
        } else {
          console.error('[CourseRecommendationScreen] 예상치 못한 응답 타입:', contentType);
          const responseText = await response.text();
          console.error('[CourseRecommendationScreen] 응답 내용:', responseText.substring(0, 200));
          Alert.alert('서버 오류', '서버에서 예상치 못한 응답을 받았습니다.');
        }
      } else {
        console.log('[CourseRecommendationScreen] 코스 생성 HTTP 에러:', response.status, response.statusText);
        
        // HTTP 에러 응답 처리
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('[CourseRecommendationScreen] 코스 생성 에러 데이터:', errorData);
            Alert.alert('코스 생성 실패', errorData.error || errorData.detail || '코스 생성 중 오류가 발생했습니다.');
          } else {
            const errorText = await response.text();
            console.error('[CourseRecommendationScreen] 에러 응답 텍스트:', errorText.substring(0, 200));
            Alert.alert('코스 생성 실패', `서버 오류 (HTTP ${response.status})`);
          }
        } catch (parseError) {
          console.error('[CourseRecommendationScreen] 에러 응답 파싱 실패:', parseError);
          Alert.alert('코스 생성 실패', `서버 오류 (HTTP ${response.status})`);
        }
      }
    } catch (error) {
      console.error('[CourseRecommendationScreen] 코스 생성 네트워크 에러:', error);
      Alert.alert('네트워크 오류', '서버와의 연결을 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 사용자 코스 저장 함수
  const saveUserCourse = async (courseData: any) => {
    try {
      console.log('[CourseRecommendationScreen] 사용자 코스 저장 시작');
      
      // 로그인 상태 확인
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('로그인 필요', '코스를 저장하려면 로그인이 필요합니다.');
        return;
      }

      // 사용자 코스 저장 API 호출
      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/generate_user_course/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access}`,
        },
        body: JSON.stringify({
          route_id: courseData.route_id || courseData.id, // 백엔드 응답에 따라 조정
          course_data: courseData, // 전체 코스 데이터도 함께 저장
        }),
      });

      console.log('[CourseRecommendationScreen] 사용자 코스 저장 응답:', response.status, response.statusText);

      if (response.ok) {
        const saveResult = await response.json();
        console.log('[CourseRecommendationScreen] 사용자 코스 저장 성공:', saveResult);
        
        Alert.alert(
          '코스 저장 완료! 🎉',
          '생성된 코스가 내 코스 목록에 저장되었습니다.',
          [
            {
              text: '내 코스 보기',
              onPress: () => {
                // TODO: 내 코스 목록 화면으로 이동
                navigation.goBack();
              }
            },
            {
              text: '홈으로',
              style: 'cancel',
              onPress: () => {
                navigation.navigate('MainTabs');
              }
            }
          ]
        );
      } else {
        console.log('[CourseRecommendationScreen] 사용자 코스 저장 실패:', response.status, response.statusText);
        
        try {
          const errorData = await response.json();
          console.error('[CourseRecommendationScreen] 사용자 코스 저장 에러:', errorData);
          Alert.alert('코스 저장 실패', errorData.error || errorData.detail || '코스 저장 중 오류가 발생했습니다.');
        } catch (parseError) {
          Alert.alert('코스 저장 실패', `서버 오류 (HTTP ${response.status})`);
        }
      }
    } catch (error) {
      console.error('[CourseRecommendationScreen] 사용자 코스 저장 네트워크 에러:', error);
      Alert.alert('네트워크 오류', '코스 저장 중 연결 오류가 발생했습니다.');
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
            최소 한 개 이상의 질문에 답변하면 최적의 여행 코스를 추천해드려요
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

          {/* 1단계: 어떤 여행을 원하시나요? */}
          <View style={styles.preferenceStep}>
            <Text style={styles.preferenceStepTitle}>1. 어떤 여행을 원하시나요?</Text>
            <View style={styles.preferencesGrid}>
              {preferenceOptions.travelType.map((option) => (
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

          {/* 2단계: 누구와 함께 하나요? */}
          <View style={styles.preferenceStep}>
            <Text style={styles.preferenceStepTitle}>2. 누구와 함께 하나요?</Text>
            <View style={styles.preferencesGrid}>
              {preferenceOptions.companion.map((option) => (
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

          {/* 3단계: 어떻게 이동하나요? */}
          <View style={styles.preferenceStep}>
            <Text style={styles.preferenceStepTitle}>3. 어떻게 이동하나요?</Text>
            <View style={styles.preferencesGrid}>
              {preferenceOptions.transportation.map((option) => (
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

          {/* 4단계: 그밖에 고려 사항이 있나요? */}
          <View style={styles.preferenceStep}>
            <Text style={styles.preferenceStepTitle}>4. 그밖에 고려 사항이 있나요?</Text>
            <View style={styles.preferencesGrid}>
              {preferenceOptions.additional.map((option) => (
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
            <Text style={styles.regionSubtext}>
              {missionAccepted
                // missionAccepted가 true일 때
                ? (missionProposal && (
                    <View style={styles.missionProposal}>
                      <Text style={styles.missionProposalText}>{missionProposal}</Text>
                    </View>
                  ))
                // missionAccepted가 false일 때
                : '과거를 숨기고 있는 장소들을 제외하고 코스를 구성해요'
              }
            </Text>
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


          </View>
        </View>

        {/* 지역 이동 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌍 지역 이동 허용</Text>
            <Text style={styles.regionSubtext}>
              {moveToOtherRegion
                ? '강화군, 영종도, 내륙 등 모든 지역을 포함할 수 있어요'
                : '현재 위치 주변 지역의 장소만으로 코스를 구성해요'
              }
            </Text>
          <View style={styles.regionToggle}>
            <Text style={styles.regionText}>다른 지역으로 이동 허용</Text>
            <Switch
              value={moveToOtherRegion}
              onValueChange={setMoveToOtherRegion}
              trackColor={{ false: '#ddd', true: INCHEON_BLUE_LIGHT }}
              thumbColor={moveToOtherRegion ? INCHEON_BLUE : '#f4f3f4'}
            />
          </View>

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
    ...TEXT_STYLES.subtitle,
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
    ...TEXT_STYLES.heading,
    color: INCHEON_BLUE,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoSubtitle: {
    ...TEXT_STYLES.body,
    color: INCHEON_GRAY,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    ...TEXT_STYLES.heading,
    color: INCHEON_GRAY,
    marginBottom: 8,
  },
  sectionSubtitle: {
    ...TEXT_STYLES.small,
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
    ...TEXT_STYLES.small,
    color: INCHEON_GRAY,
  },
  selectedPreferenceText: {
    ...TEXT_STYLES.small,
    color: INCHEON_BLUE,
    fontWeight: 'bold',
  },
  placeCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    gap: 8,
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
    ...TEXT_STYLES.small,
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
    ...TEXT_STYLES.small,
    color: INCHEON_GRAY,
  },
  missionProposal: {
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  missionProposalText: {
    ...TEXT_STYLES.small,
    color: INCHEON_BLUE,
    padding: 8,
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
    ...TEXT_STYLES.body,
  },
  regionSubtext: {
    ...TEXT_STYLES.small,
    marginVertical: 5,
    textAlign: 'center',
  },
  generateSection: {
    marginBottom: 52,
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
    marginBottom: 50,
  },
  generateButtonDisabled: {
    ...TEXT_STYLES.button,
    backgroundColor: INCHEON_GRAY,
    opacity: 0.7,
  },
  generateButtonText: {
    ...TEXT_STYLES.button,
    color: '#fff',
    marginLeft: 10,
  },
  warningText: {
    ...TEXT_STYLES.small,
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
    ...TEXT_STYLES.small,
    color: INCHEON_GRAY,
    marginLeft: 10,
  },
  preferenceStep: {
    marginBottom: 20,
  },
  preferenceStepTitle: {
    ...TEXT_STYLES.button,
    color: INCHEON_BLUE,
    marginBottom: 10,
    paddingLeft: 5,
  },
});
