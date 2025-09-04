import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface RouteParams {
  destination: string;
  destinationLat?: number;
  destinationLng?: number;
  type?: 'place' | 'map';
  placeId?: string;
  searchQuery?: string;
}

const MapScreen: React.FC = () => {
  const route = useRoute();
  const [mapUrl, setMapUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = route.params as RouteParams;
    console.log('[MapScreen] 받은 파라미터:', params);
    console.log('[MapScreen] destination:', params?.destination);
    console.log('[MapScreen] type:', params?.type);
    console.log('[MapScreen] placeId:', params?.placeId);

    let url = '';

    if (params?.destination) {
      const destName = encodeURIComponent(params.destination);
      
      if (params.type === 'place' && params.placeId) {
        // 카카오맵 장소 ID가 있는 경우 - 장소 상세 정보 페이지로 직접 이동
        url = `https://place.map.kakao.com/${params.placeId}`;
        console.log('[MapScreen] 카카오맵 장소 상세 정보 URL:', url);
      } else if (params.destinationLat && params.destinationLng) {
        // 좌표가 있는 경우: WebView에서 직접 지도 표시
        url = `https://map.kakao.com/link/map/${destName},${params.destinationLat},${params.destinationLng}`;
        console.log('[MapScreen] 목적지 지도 링크(URL):', url);
      } else {
        // 좌표가 없으면 검색 결과 지도로 표시
        url = `https://map.kakao.com/link/map/${destName}`;
        console.log('[MapScreen] 검색 지도 링크(URL):', url);
      }
    } else {
      // 기본 인천 지도
      url = 'https://map.kakao.com/link/map/인천,37.4563,126.7052';
      console.log('[MapScreen] 기본 지도 URL:', url);
    }

    setMapUrl(url);
    setIsLoading(false);
  }, [route.params]);



  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // SafeAreaView가 화면 전체를 차지하도록 설정
    backgroundColor: '#f0f0f0', // SafeAreaView 자체의 배경색 (선택 사항)
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
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