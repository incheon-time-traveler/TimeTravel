import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import authService from '../../services/authService';

interface SocialLoginWebViewProps {
  provider: 'google' | 'kakao';
  loginUrl: string;
  onLoginSuccess: (userData: any) => void;
  onLoginError: (error: string) => void;
  onClose: () => void;
}

const SocialLoginWebView: React.FC<SocialLoginWebViewProps> = ({
  provider,
  loginUrl,
  onLoginSuccess,
  onLoginError,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    console.log('[SocialLoginWebView] Navigated URL:', url);
    
    // 로그인 성공 시 URL에서 토큰 추출
    if (url.includes('login-success')) {
      try {
        const urlParams = new URL(url);
        const accessToken = urlParams.searchParams.get('access');
        console.log('[SocialLoginWebView] Parsed access token:', accessToken);
        
        if (accessToken) {
          // 토큰 저장
          await authService.saveTokens({ access: accessToken, refresh: '' });
          console.log('[SocialLoginWebView] saveTokens() success');
          // 저장 검증
          const stored = await authService.getTokens();
          console.log('[SocialLoginWebView][Verify] retrieved access prefix:', stored?.access?.slice(0, 12) + '...');
          
          // 성공 콜백 호출
          onLoginSuccess({
            accessToken,
            provider,
          });
          
          return;
        } else {
          console.log('[SocialLoginWebView] No access token found in URL');
        }
      } catch (error) {
        console.error('[SocialLoginWebView] Token extraction error:', error);
        onLoginError('토큰 추출 중 오류가 발생했습니다.');
      }
    }
    
    // 에러 처리
    if (url.includes('error') || url.includes('denied')) {
      console.warn('[SocialLoginWebView] Login cancelled or error URL detected:', url);
      onLoginError('로그인이 취소되었습니다.');
    }
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
    console.log('[SocialLoginWebView] Load start - provider:', provider, 'loginUrl:', loginUrl);
  };

  const handleLoadEnd = () => {
    setLoading(false);
    console.log('[SocialLoginWebView] Load end');
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setError('네트워크 오류가 발생했습니다.');
    setLoading(false);
    console.error('[SocialLoginWebView] WebView error:', nativeEvent);
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setError(null)}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {provider === 'google' ? '구글' : '카카오'} 로그인 중...
          </Text>
        </View>
      )}
      
      <WebView
        source={{ uri: loginUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
      />
      
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>취소</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1001,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SocialLoginWebView; 