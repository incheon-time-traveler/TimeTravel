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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY } from '../../styles/fonts';
import { ChatMessage, ChatBotResponse } from '../../types/chat';
import { ChatbotService } from '../../services/chatbotService';

const { width, height } = Dimensions.get('window');

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
  const [isLoading, setIsLoading] = useState(false);
  const [userId] = useState(() => ChatbotService.generateUserId());
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visible, messages]);

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
      const response = await ChatbotService.chatWithBot({
        user_question: currentInput,
        user_id: userId,
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

        {/* 추천 질문 */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>추천 질문</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['인천 추천 코스', '대불호텔 정보', '미션 도움말', '길찾기'].map((suggestion, index) => (
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
  suggestionButtonDisabled: {
    opacity: 0.7,
  },
  suggestionTextDisabled: {
    color: INCHEON_GRAY,
    opacity: 0.5,
  },
});

export default ChatScreen; 