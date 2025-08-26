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
    
    console.log('Navigation URL:', url); // 디버깅용 로그
    
    // 인증 성공 페이지 처리 (/auth/success)
    if (url.includes('/auth/success')) {
      try {
        const urlParams = new URL(url);
        const accessToken = urlParams.searchParams.get('access');
        
        console.log('Access Token from auth success page:', accessToken); // 디버깅용 로그
        
        if (accessToken) {
          // 토큰 저장 (refresh 토큰은 쿠키에서 관리되므로 빈 문자열)
          await authService.saveTokens({ access: accessToken, refresh: '' });
          
          // 성공 콜백 호출
          onLoginSuccess({
            accessToken,
            provider,
          });
          
          return;
        } else {
          console.error('No access token found in auth success page');
          onLoginError('액세스 토큰을 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('Auth success page token extraction error:', error);
        onLoginError('토큰 추출 중 오류가 발생했습니다.');
      }
    }
    
    // 카카오/구글 콜백 URL 감지 (디버깅용)
    if (url.includes('/callback/') && url.includes('code=')) {
      console.log('OAuth callback detected, waiting for backend processing...');
    }
    
    // 에러 처리
    if (url.includes('error') || url.includes('denied') || url.includes('redirect_uri_mismatch')) {
      console.error('OAuth error detected:', url);
      onLoginError('OAuth 인증 중 오류가 발생했습니다. 설정을 확인해주세요.');
    }
  };

  // WebView에서 postMessage 처리
  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Received message from WebView:', data);
      
      if (data.type === 'LOGIN_SUCCESS' && data.accessToken) {
        console.log('Processing login success message with token:', data.accessToken);
        
        // 토큰 저장
        await authService.saveTokens({ access: data.accessToken, refresh: '' });
        
        // 성공 콜백 호출
        onLoginSuccess({
          accessToken: data.accessToken,
          provider,
        });
        
        return;
      } else if (data.type === 'AUTO_RETURN') {
        console.log('Auto return message received');
        // 자동 반환 메시지 - 무시
      }
    } catch (error) {
      console.error('Error processing WebView message:', error);
    }
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setError('네트워크 오류가 발생했습니다.');
    setLoading(false);
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
        onMessage={handleMessage}
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