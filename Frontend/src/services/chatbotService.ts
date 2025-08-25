import { CHATBOT_API } from '../config/apiKeys';

export interface ChatbotRequest {
  user_question: string;
  user_id: string;
}

export interface ChatbotResponse {
  ai_answer: string;
}

export class ChatbotService {
  private static baseUrl = CHATBOT_API.CHAT_URL;

  /**
   * 챗봇과 대화하기
   */
  static async chatWithBot(request: ChatbotRequest): Promise<ChatbotResponse> {
    try {
      const formData = new FormData();
      formData.append('user_question', request.user_question);
      formData.append('user_id', request.user_id);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('챗봇 API 호출 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자 ID 생성 (임시로 사용)
   */
  static generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
