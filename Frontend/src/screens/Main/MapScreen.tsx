import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { INCHEON_BLUE, INCHEON_GRAY } from '../../styles/fonts';

const { width, height } = Dimensions.get('window');

interface RouteParams {
  destination: string;
  destinationLat?: number;
  destinationLng?: number;
}

const MapScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [mapUrl, setMapUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = route.params as RouteParams;
    console.log('[MapScreen] 받은 파라미터:', params);
    
    let url = '';
    
    if (params?.destination) {
      if (params.destinationLat && params.destinationLng) {
        // 좌표가 있는 경우: 현재위치에서 목적지까지
        url = `https://map.kakao.com/link/route/현재위치,${params.destinationLat},${params.destinationLng}`;
        console.log('[MapScreen] 좌표 기반 길찾기 URL:', url);
      } else {
        // 좌표가 없는 경우: 검색어로 길찾기
        url = `https://map.kakao.com/link/route/현재위치,${encodeURIComponent(params.destination)}`;
        console.log('[MapScreen] 검색어 기반 길찾기 URL:', url);
      }
    } else {
      // 기본 인천 지도
      url = 'https://map.kakao.com/link/map/인천,37.4563,126.7052';
      console.log('[MapScreen] 기본 지도 URL:', url);
    }
    
    setMapUrl(url);
    setIsLoading(false);
  }, [route.params]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // WebView 새로고침을 위해 URL 재설정
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {(route.params as RouteParams)?.destination 
            ? `${(route.params as RouteParams).destination} 길찾기` 
            : '지도'
          }
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 카카오맵 WebView */}
      {mapUrl && (
        <WebView
          source={{ uri: mapUrl }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={false}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          allowsBackForwardNavigationGestures={false}
          cacheEnabled={false}
          incognito={false}
          androidLayerType="hardware"
          onLoadStart={() => {
            console.log('[MapScreen] 지도 로딩 시작');
            setIsLoading(true);
          }}
          onLoadEnd={() => {
            console.log('[MapScreen] 지도 로딩 완료');
            setIsLoading(false);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[MapScreen] WebView 에러:', nativeEvent);
            setIsLoading(false);
          }}
        />
      )}

      {/* 로딩 인디케이터 */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: INCHEON_BLUE,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 4,
    shadowColor: INCHEON_BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  refreshButton: {
    padding: 8,
  },
  map: {
    flex: 1,
    width: width,
    height: height,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
});

export default MapScreen;
