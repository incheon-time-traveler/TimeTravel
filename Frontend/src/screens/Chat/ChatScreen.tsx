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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY } from '../../styles/fonts';
import { ChatMessage, ChatBotResponse } from '../../types/chat';

const { width, height } = Dimensions.get('window');

// 하드코딩된 챗봇 응답들
const CHATBOT_RESPONSES: { [key: string]: ChatBotResponse } = {
  '안녕': {
    text: '안녕하세요! 인천 여행 도우미입니다. 무엇을 도와드릴까요?',
    suggestions: ['인천 추천 코스', '대불호텔 정보', '인천대공원 가는법', '미션 도움말']
  },
  '인천 추천': {
    text: '인천의 추천 코스는 다음과 같습니다:\n\n1️⃣ 대불호텔 - 인천의 역사\n2️⃣ 인천대공원 - 자연과 휴식\n3️⃣ 월미도 - 바다와 낭만\n4️⃣ 송도국제도시 - 미래형 도시',
    suggestions: ['대불호텔 상세정보', '인천대공원 가는법', '월미도 정보']
  },
  '대불호텔': {
    text: '대불호텔은 1883년 인천 개항과 함께 지어진 역사적인 건물입니다. 현재는 인천의 상징적인 관광지로 많은 사람들이 찾고 있어요!',
    suggestions: ['대불호텔 가는법', '대불호텔 미션', '주변 맛집']
  },
  '인천대공원': {
    text: '인천대공원은 1996년에 조성된 시민들의 휴식 공간입니다. 넓은 공원과 아름다운 자연을 즐길 수 있어요!',
    suggestions: ['인천대공원 가는법', '인천대공원 미션', '주변 관광지']
  },
  '미션': {
    text: '미션을 완료하려면 해당 장소에 가서 사진을 찍고, 과거 사진과 비교해보세요! 각 장소마다 특별한 역사적 의미가 담겨있답니다.',
    suggestions: ['대불호텔 미션', '인천대공원 미션', '미션 힌트']
  },
  '도움말': {
    text: '저는 인천 여행을 도와주는 AI 어시스턴트입니다!\n\n• 여행 코스 추천\n• 장소 정보 제공\n• 미션 도움말\n• 길찾기 안내\n\n무엇이든 물어보세요!',
    suggestions: ['인천 추천 코스', '미션 도움말', '길찾기']
  }
};

const ChatScreen: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: '안녕하세요! 인천 여행 도우미입니다. 무엇을 도와드릴까요?',
      isUser: false,
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visible, messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // 챗봇 응답 생성
    setTimeout(() => {
      const botResponse = generateBotResponse(inputText);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponse.text,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  const generateBotResponse = (userInput: string): ChatBotResponse => {
    const lowerInput = userInput.toLowerCase();
    
    // 키워드 매칭
    for (const [keyword, response] of Object.entries(CHATBOT_RESPONSES)) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        return response;
      }
    }

    // 기본 응답
    return {
      text: '죄송합니다. 더 구체적으로 질문해주시면 도움을 드릴 수 있어요!',
      suggestions: ['인천 추천 코스', '미션 도움말', '도움말']
    };
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 여행 도우미</Text>
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
                  {message.text}
                </Text>
                <Text style={styles.timestamp}>
                  {formatTime(message.timestamp)}
                </Text>
              </View>
            ))}
          </ScrollView>

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
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendButtonText}>전송</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* 추천 질문 */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>추천 질문</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['인천 추천 코스', '대불호텔 정보', '미션 도움말', '길찾기'].map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionButton}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
    borderBottomWidth: 2,
    borderBottomColor: '#222',
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  headerTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 20,
    color: INCHEON_BLUE,
    fontWeight: 'bold',
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
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 2,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: INCHEON_BLUE,
    borderColor: '#222',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderColor: '#222',
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
    color: '#000',
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  timestamp: {
    fontSize: 12,
    color: INCHEON_GRAY,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: '#222',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#222',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    fontFamily: 'NeoDunggeunmoPro-Regular',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: INCHEON_BLUE,
    borderWidth: 2,
    borderColor: '#222',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonDisabled: {
    backgroundColor: INCHEON_GRAY,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: '#222',
    backgroundColor: INCHEON_BLUE_LIGHT,
  },
  suggestionsTitle: {
    fontSize: 16,
    color: INCHEON_BLUE,
    marginBottom: 8,
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontWeight: 'bold',
  },
  suggestionButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#222',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: INCHEON_GRAY,
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
});

export default ChatScreen; 