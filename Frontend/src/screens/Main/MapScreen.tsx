import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { generateMapHtml, getCurrentLocation, requestLocationPermission } from '../../services/mapService';
import { INCHEON_BLUE, INCHEON_GRAY } from '../../styles/fonts';
import MissionNotification from '../../components/MissionNotification';
import HistoricalPhotoSelector from '../../components/HistoricalPhotoSelector';
import { Mission } from '../../types/mission';
import { findMissionByLocation, missions } from '../../data/missions';

const { width, height } = Dimensions.get('window');

const MapScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapHtml, setMapHtml] = useState<string>('');
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [showMissionNotification, setShowMissionNotification] = useState(false);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [locationCheckInterval, setLocationCheckInterval] = useState<NodeJS.Timeout | null>(null);

  // 미션 위치 데이터를 지도용 형식으로 변환
  const missionLocations = missions.map(mission => ({
    id: mission.location.id,
    name: mission.location.name,
    lat: mission.location.lat,
    lng: mission.location.lng,
    order: mission.location.order,
  }));

  useEffect(() => {
    initializeMap();
    startLocationMonitoring();
    return () => {
      if (locationCheckInterval) {
        clearInterval(locationCheckInterval);
      }
    };
  }, []);

  const initializeMap = () => {
    const html = generateMapHtml(missionLocations, showRouteModal, routeData, currentLocation || undefined);
    setMapHtml(html);
  };

  const startLocationMonitoring = () => {
    // 10초마다 위치를 확인하여 미션 감지
    const interval = setInterval(async () => {
      if (currentLocation) {
        checkForMissions(currentLocation.lat, currentLocation.lng);
      }
    }, 10000); // 10초마다 체크

    setLocationCheckInterval(interval);
  };

  const checkForMissions = (lat: number, lng: number) => {
    const nearbyMission = findMissionByLocation(lat, lng);
    
    if (nearbyMission && !showMissionNotification && !showPhotoSelector) {
      console.log('미션 감지:', nearbyMission.location.name);
      setCurrentMission(nearbyMission);
      setShowMissionNotification(true);
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('위치 권한 필요', '현재 위치를 가져오기 위해 위치 권한이 필요합니다.');
        return;
      }

      const location = await getCurrentLocation();
      setCurrentLocation(location);
      
      // 위치 업데이트 후 미션 체크
      checkForMissions(location.lat, location.lng);
      
      // 지도 HTML 업데이트
      const html = generateMapHtml(missionLocations, showRouteModal, routeData, location);
      setMapHtml(html);
      
      console.log('현재 위치 업데이트:', location);
    } catch (error) {
      console.error('현재 위치 가져오기 오류:', error);
      Alert.alert('오류', '현재 위치를 가져올 수 없습니다.');
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView 메시지 수신:', data);
      
      if (data.type === 'requestCurrentLocation') {
        handleGetCurrentLocation();
      } else if (data.type === 'mapReady') {
        console.log('지도가 준비되었습니다.');
      } else if (data.type === 'error') {
        console.error('WebView 오류:', data.message);
        Alert.alert('지도 오류', data.message);
      }
    } catch (error) {
      console.error('WebView 메시지 파싱 오류:', error);
    }
  };

  const handleStartMission = (mission: Mission) => {
    setShowMissionNotification(false);
    setCurrentMission(mission);
    setShowPhotoSelector(true);
  };

  const handlePhotoSelected = (mission: Mission, photoId: number) => {
    setShowPhotoSelector(false);
    
    // 미션 완료 처리
    mission.completed = true;
    mission.selectedPhotoId = photoId;
    
    Alert.alert(
      '미션 완료! 🎉',
      `${mission.location.name}의 과거 사진을 성공적으로 선택했습니다!`,
      [
        {
          text: '확인',
          onPress: () => {
            // 갤러리에 사진 추가 등의 처리
            console.log('미션 완료:', mission.id, '선택된 사진:', photoId);
          }
        }
      ]
    );
  };

  const handleRouteSearch = () => {
    if (!currentLocation) {
      Alert.alert('오류', '현재 위치를 먼저 가져와주세요.');
      return;
    }
    setShowRouteModal(true);
  };

  // 개발용: 미션 테스트 함수들
  const testMission1 = () => {
    const mission = missions.find(m => m.id === 1);
    if (mission) {
      setCurrentMission(mission);
      setShowMissionNotification(true);
    }
  };

  const testMission2 = () => {
    const mission = missions.find(m => m.id === 2);
    if (mission) {
      setCurrentMission(mission);
      setShowMissionNotification(true);
    }
  };

  const testMission3 = () => {
    const mission = missions.find(m => m.id === 3);
    if (mission) {
      setCurrentMission(mission);
      setShowMissionNotification(true);
    }
  };

  const testMission4 = () => {
    const mission = missions.find(m => m.id === 4);
    if (mission) {
      setCurrentMission(mission);
      setShowMissionNotification(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>지도</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleGetCurrentLocation}>
            <Text style={styles.buttonText}>현재 위치</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleRouteSearch}>
            <Text style={styles.buttonText}>길찾기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 개발용 테스트 버튼들 */}
      <View style={styles.testContainer}>
        <Text style={styles.testTitle}>🧪 개발용 미션 테스트</Text>
        <View style={styles.testButtonContainer}>
          <TouchableOpacity style={styles.testButton} onPress={testMission1}>
            <Text style={styles.testButtonText}>대불호텔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testButton} onPress={testMission2}>
            <Text style={styles.testButtonText}>인천대공원</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testButton} onPress={testMission3}>
            <Text style={styles.testButtonText}>월미도</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testButton} onPress={testMission4}>
            <Text style={styles.testButtonText}>송도국제도시</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          source={{ html: mapHtml }}
          style={styles.map}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={false}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView 오류:', nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP 오류:', nativeEvent);
          }}
        />
      </View>

      {/* 미션 알림 */}
      <MissionNotification
        visible={showMissionNotification}
        mission={currentMission}
        onClose={() => setShowMissionNotification(false)}
        onStartMission={handleStartMission}
      />

      {/* 과거 사진 선택 */}
      <HistoricalPhotoSelector
        visible={showPhotoSelector}
        mission={currentMission}
        onClose={() => setShowPhotoSelector(false)}
        onPhotoSelected={handlePhotoSelected}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: INCHEON_BLUE,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    backgroundColor: INCHEON_BLUE,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  testContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  testTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: INCHEON_BLUE,
    marginBottom: 10,
  },
  testButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 10,
  },
  testButton: {
    backgroundColor: INCHEON_BLUE,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MapScreen; 