import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
// import * as WebBrowser from 'expo-web-browser';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import { ChatMessage, ChatBotResponse } from '../../types/chat';
import { ChatbotService } from '../../services/chatbotService';
import AuthService from '../../services/authService'

const { width, height } = Dimensions.get('window');

interface ChatScreenProps {
  visible: boolean;
  onClose: () => void;
  navigation: NavigationProp<any>;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ visible, onClose, navigation }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: '안녕! 인천 시간 여행 재밌게 즐기는 중이야? 궁금한 거 있으면 물어봐!',
      isUser: false,
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // const [userId] = useState(() => ChatbotService.generateUserId());    // 이 부분 진짜 userID 또는 nickname 사용할 수 있도록
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      // 위치 정보 가져오기
      getCurrentLocation();
    }
  }, [visible, messages]);

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        console.log('[ChatScreen] 현재 위치:', latitude, longitude);
      },
      (error) => {
        console.error('[ChatScreen] 위치 정보 가져오기 실패:', error);
        // 기본 위치 설정 (인천)
        setUserLocation({ lat: 37.4563, lng: 126.7052 });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      // 백엔드 API 호출
      const user = await AuthService.getUser();
      const response = await ChatbotService.chatWithBot({
        user_question: currentInput,
        user_id: user?.id.toString() || '',
        lat: userLocation?.lat || undefined,
        lng: userLocation?.lng || undefined,
        user_nickname: user?.nickname || '',
        user_gender: user?.gender || '',
        user_age_group: user?.age || '',
      });

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response.ai_answer,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('챗봇 응답 오류:', error);
      
      // 오류 메시지 표시
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
      
      Alert.alert('오류', '챗봇과의 대화 중 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
  };



  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };



  // 카카오맵 URL에서 장소 정보 추출
  const parseKakaoMapUrl = (url: string) => {
    // 카카오맵 URL 패턴들
    const patterns = [
      // place.map.kakao.com/숫자 패턴 (장소 상세 정보)
      /place\.map\.kakao\.com\/(\d+)/,
      // map.kakao.com/link/map/장소명,위도,경도 패턴
      /map\.kakao\.com\/link\/map\/([^,]+),([0-9.-]+),([0-9.-]+)/,
      // map.kakao.com/link/map/장소명 패턴
      /map\.kakao\.com\/link\/map\/([^,]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        if (pattern === patterns[0]) {
          // place.map.kakao.com/숫자 패턴 - 장소 상세 정보로 이동
          return {
            type: 'place',
            placeId: match[1],
            destination: '카카오맵 장소',
            searchQuery: '카카오맵 장소', // 검색용 쿼리
          };
        } else if (pattern === patterns[1]) {
          // map.kakao.com/link/map/장소명,위도,경도 패턴
          return {
            type: 'map',
            destination: decodeURIComponent(match[1]),
            destinationLat: parseFloat(match[2]),
            destinationLng: parseFloat(match[3]),
            searchQuery: decodeURIComponent(match[1]), // 검색용 쿼리
          };
        } else if (pattern === patterns[2]) {
          // map.kakao.com/link/map/장소명 패턴
          return {
            type: 'map',
            destination: decodeURIComponent(match[1]),
            searchQuery: decodeURIComponent(match[1]), // 검색용 쿼리
          };
        }
      }
    }
    
    return null;
  };

  const handleLinkPress = async (url: string) => {
    try {
      // URL 유효성 검사
      if (!url || url.trim() === '') {
        Alert.alert('오류', '유효하지 않은 링크입니다.');
        return;
      }

      // 카카오맵 URL인지 확인
      const kakaoMapInfo = parseKakaoMapUrl(url);
      
      if (kakaoMapInfo) {
        // 챗봇 닫기
        onClose();
        
        // navigation 객체가 존재하는지 확인
        if (navigation && navigation.navigate) {
          // 맵으로 이동
          navigation.navigate('Map', {
            screen: 'MapMain',
            params: kakaoMapInfo
          });
        } else {
          console.error('[ChatScreen] navigation 객체가 없습니다:', navigation);
          Alert.alert('오류', '네비게이션을 사용할 수 없습니다. 앱을 다시 시작해주세요.');
        }
        return;
      }

      // URL 형식 검사
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(url)) {
        Alert.alert('오류', `잘못된 URL 형식입니다: ${url}`);
        return;
      }

      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('오류', '이 링크를 열 수 없습니다.');
      }
    } catch (error) {
      Alert.alert('오류', `링크 열기 실패: ${error?.message || '알 수 없는 오류'}`);
    }
  };

  const renderFormattedText = (text: string) => {
    // **텍스트** 패턴과 [텍스트](URL) 패턴을 모두 처리
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // **텍스트** 패턴인 경우 bold 스타일 적용
        const boldText = part.slice(2, -2); // ** 제거
        return (
          <Text key={index} style={{ fontWeight: 'bold' }}>
            {boldText}
          </Text>
        );
      } else if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        // [텍스트](URL) 패턴인 경우 하이퍼링크로 처리
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          const linkText = match[1];
          const url = match[2];
          
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleLinkPress(url)}
              activeOpacity={0.7}
            >
              <Text
                style={{ 
                  color: '#007AFF', 
                  textDecorationLine: 'underline',
                  fontWeight: 'bold'
                }}
              >
                {linkText}
              </Text>
            </TouchableOpacity>
          );
        }
      }
      return part;
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>시간 여행 도우미</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 메시지 영역 */}
        <KeyboardAvoidingView 
          style={styles.messageContainer} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View key={message.id} style={[
                styles.messageBubble,
                message.isUser ? styles.userMessage : styles.botMessage
              ]}>
                <Text style={[
                  styles.messageText,
                  message.isUser ? styles.userMessageText : styles.botMessageText
                ]}>
                  {message.isUser ? message.text : renderFormattedText(message.text)}
                </Text>
                <Text style={message.isUser ? styles.userTimestamp : styles.timestamp}>
                  {formatTime(message.timestamp)}
                </Text>
              </View>
            ))}
            {isLoading && (
              <View style={[styles.messageBubble, styles.botMessage]}>
                <Text style={[styles.messageText, styles.botMessageText]}>
                  생각 중입니다...
                </Text>
                <Text style={styles.timestamp}>
                  {formatTime(new Date())}
                </Text>
              </View>
            )}
          </ScrollView>
        {/* 추천 질문 */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>추천 질문</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['관광지 주변 맛집&카페', '맛집&카페 후기', '인천 차이나타운에서 월미도까지 가는 법'].map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionButton, isLoading && styles.suggestionButtonDisabled]}
                onPress={() => handleSuggestionPress(suggestion)}
                disabled={isLoading}
              >
                <Text style={[styles.suggestionText, isLoading && styles.suggestionTextDisabled]}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
          {/* 입력 영역 */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="메시지를 입력하세요..."
              placeholderTextColor={INCHEON_GRAY}
              multiline
              maxLength={200}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton, 
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Text style={styles.sendButtonText}>
                {isLoading ? '전송 중...' : '전송'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

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
    paddingVertical: 15,
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  headerTitle: {
    ...TEXT_STYLES.subtitle,
    color: INCHEON_BLUE,
  },

  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: INCHEON_BLUE,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageContainer: {
    flex: 1,
    marginBottom: 8,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,

  },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: INCHEON_BLUE,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  botMessageText: {
    ...TEXT_STYLES.body
  },
  timestamp: {
    ...TEXT_STYLES.small,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    ...TEXT_STYLES.small,
    marginTop: 4,
    alignSelf: 'flex-end',
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  textInput: {
    ...TEXT_STYLES.body,
    flex: 1,
    borderWidth: 2,
    borderColor: '#d0d0d0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sendButtonDisabled: {
    backgroundColor: INCHEON_GRAY,
  },
  sendButtonText: {
    ...TEXT_STYLES.button,
    color: '#fff',
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  suggestionsTitle: {
    ...TEXT_STYLES.heading,
    fontWeight: "bold",
    color: INCHEON_BLUE,
    marginBottom: 12,
  },
  suggestionButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  suggestionText: {
    ...TEXT_STYLES.body,
  },
  suggestionButtonDisabled: {
    opacity: 0.7,
  },
  suggestionTextDisabled: {
    color: INCHEON_GRAY,
    opacity: 0.5,
  },
});

export default ChatScreen; 