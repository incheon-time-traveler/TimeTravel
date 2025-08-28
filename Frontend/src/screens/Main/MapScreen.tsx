import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';



const { width, height } = Dimensions.get('window');

const MapScreen: React.FC = () => {





  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 카카오맵 WebView */}
      <WebView
        source={{
          uri: 'https://map.kakao.com/link/map/카카오맵,37.5665,126.9780'
        }}
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
      />
    </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // SafeAreaView가 화면 전체를 차지하도록 설정
    backgroundColor: '#f0f0f0', // SafeAreaView 자체의 배경색 (선택 사항)
  },
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
  map: {
    flex: 1,
    width: width,
    height: height,
  },
});

export default MapScreen;
