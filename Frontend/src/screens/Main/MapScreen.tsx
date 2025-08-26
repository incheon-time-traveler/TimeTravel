import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';



const { width, height } = Dimensions.get('window');

const MapScreen: React.FC = () => {





  return (
    <View style={styles.container}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
    width: width,
    height: height,
  },
});

export default MapScreen;
