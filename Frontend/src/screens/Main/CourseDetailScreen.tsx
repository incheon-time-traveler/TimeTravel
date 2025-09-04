import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import { BACKEND_API } from '../../config/apiKeys';
import authService from '../../services/authService';
import { RouteProp, NavigationProp } from '@react-navigation/native';

interface CourseSpot {
  id: number;
  title: string;
  lat: number;
  lng: number;
  order: number;
  is_mission: boolean;
  past_image_url?: string;
  distance_from_previous: number;
}

type RootStackParamList = {
  CourseDetail: {
    courseData: {
      course_spots: CourseSpot[];
      mode: string;
      total_spots: number;
      proposal?: string;
      route_id?: number;
      id?: number;
    };
  };
  MainTabs: undefined;
};

type CourseDetailScreenNavigationProp = NavigationProp<RootStackParamList, 'CourseDetail'>;
type CourseDetailScreenRouteProp = RouteProp<RootStackParamList, 'CourseDetail'>;

interface CourseDetailScreenProps {
  navigation: CourseDetailScreenNavigationProp;
  route: CourseDetailScreenRouteProp;
}

export default function CourseDetailScreen({ navigation, route }: CourseDetailScreenProps) {
  const { courseData } = route.params;
  const [isSaving, setIsSaving] = useState(false);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleStartCourse = async () => {
    try {
      setIsSaving(true);
      console.log('[CourseDetailScreen] 코스 시작 - 사용자 코스로 저장 시작');
      console.log('[CourseDetailScreen] 전체 courseData:', JSON.stringify(courseData, null, 2));
      
      // 로그인 상태 확인
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('로그인 필요', '코스를 시작하려면 로그인이 필요합니다.');
        return;
      }

      // route_id 확인
      const routeId = courseData.route_id || courseData.id;
      console.log('[CourseDetailScreen] courseData.route_id:', courseData.route_id);
      console.log('[CourseDetailScreen] courseData.id:', courseData.id);
      console.log('[CourseDetailScreen] 최종 routeId:', routeId);
      
      if (!routeId) {
        Alert.alert('코스 정보 오류', '코스 ID를 찾을 수 없습니다.');
        return;
      }

      console.log('[CourseDetailScreen] 전송할 route_id:', routeId);

      // 사용자 코스 저장 API 호출
      const requestBody = {
        route_id: routeId,
        course_data: courseData,
      };
      console.log('[CourseDetailScreen] 전송할 requestBody:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/courses/generate_user_course/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[CourseDetailScreen] 사용자 코스 저장 응답:', response.status, response.statusText);

      if (response.ok) {
        const saveResult = await response.json();
        console.log('[CourseDetailScreen] 사용자 코스 저장 성공:', saveResult);
        
        Alert.alert(
          '코스 시작 완료! 🎉',
          '코스가 내 코스 목록에 저장되었습니다. 이제 홈에서 진행중인 코스를 확인할 수 있습니다!',
          [
            {
              text: '홈으로',
              onPress: () => {
                navigation.navigate('MainTabs');
              }
            }
          ]
        );
      } else {
        console.log('[CourseDetailScreen] 사용자 코스 저장 실패:', response.status, response.statusText);
        
        try {
          const errorData = await response.json();
          console.error('[CourseDetailScreen] 사용자 코스 저장 에러:', errorData);
          Alert.alert('코스 시작 실패', errorData.error || errorData.detail || '코스 시작 중 오류가 발생했습니다.');
        } catch (parseError) {
          Alert.alert('코스 시작 실패', `서버 오류 (HTTP ${response.status})`);
        }
      }
    } catch (error) {
      console.error('[CourseDetailScreen] 사용자 코스 저장 네트워크 에러:', error);
      Alert.alert('네트워크 오류', '코스 시작 중 연결 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color={INCHEON_GRAY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>생성된 코스 상세</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 코스 요약 정보 */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>🎯 코스 요약</Text>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryText}>• 총 {courseData.total_spots}개 장소</Text>
            <Text style={styles.summaryText}>
              • {courseData.mode === '엄격 모드'
                  ? '모든 조건을 만족 하는 장소로 코스를 구성했습니다.'
                  : '모든 조건을 만족 하는 경우가 없어 일부를 제외했습니다.'
              }
            </Text>
          </View>
        </View>

        {/* 코스 스팟 목록 */}
        <View style={styles.spotsSection}>
          <Text style={styles.sectionTitle}>📍 방문할 장소들</Text>
          {courseData.course_spots.map((spot, index) => (
            <View key={spot.id} style={styles.spotCard}>
              <View style={styles.spotHeader}>
                <View style={styles.spotOrder}>
                  <Text style={styles.spotOrderText}>{spot.order}</Text>
                </View>
                <View style={styles.spotInfo}>
                  <Text style={styles.spotTitle}>{spot.title}</Text>
                  <View style={styles.spotDetails}>
                    {spot.distance_from_previous > 0 && (
                      <Text style={styles.spotDetailText}>
                        🚶‍♂️ 이전 장소로부터 {spot.distance_from_previous}km
                      </Text>
                    )}
                  </View>
                </View>
                {spot.is_mission && (
                  <View style={styles.missionBadge}>
                    <Ionicons name="camera" size={16} color="#fff" />
                    <Text style={styles.missionBadgeText}>미션</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* 코스 시작 버튼 */}
        <View style={styles.startSection}>
          <TouchableOpacity
            style={[styles.startButton, isSaving && styles.startButtonDisabled]}
            onPress={handleStartCourse}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.startButtonText}>코스 진행하기</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.startDescription}>
            이 코스를 내 코스 목록에 저장하고 여행을 시작합니다!
          </Text>
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
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summarySection: {
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
		...TEXT_STYLES.heading,
    color: INCHEON_BLUE,
    marginBottom: 12,
  },
  summaryInfo: {
    gap: 8,
  },
  summaryText: {
		...TEXT_STYLES.body,
    color: INCHEON_GRAY,
  },
  sectionTitle: {
		...TEXT_STYLES.heading,
    color: INCHEON_GRAY,
    marginBottom: 16,
  },
  spotCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: INCHEON_BLUE,
  },
  spotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  spotOrder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: INCHEON_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  spotOrderText: {
    ...TEXT_STYLES.button,
    color: '#fff',
  },
  spotInfo: {
    flex: 1,
  },
  spotTitle: {
    ...TEXT_STYLES.button,
    color: INCHEON_GRAY,
    marginBottom: 8,
  },
  spotDetails: {
    gap: 4,
  },
  spotDetailText: {
    ...TEXT_STYLES.small,

  },
  missionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6b6b',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  missionBadgeText: {
    ...TEXT_STYLES.button,
    color: '#fff',
  },
  startSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INCHEON_BLUE,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    marginBottom: 12,
  },
  startButtonDisabled: {
    opacity: 0.7,
  },
  startButtonText: {
    ...TEXT_STYLES.heading,
    color: '#fff',
    marginLeft: 10,
  },
  startDescription: {
    ...TEXT_STYLES.small,
    color: INCHEON_GRAY,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 50,
  },
});
