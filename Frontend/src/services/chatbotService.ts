import { BACKEND_API, CHATBOT_API } from '../config/apiKeys';

export interface ChatbotRequest {
  user_question: string;
  user_id: string;
  lat?: number;  // ← 변경
  lng?: number;  // ← 변경
}

export interface ChatbotResponse {
  ai_answer: string;
}

export class ChatbotService {
  private static baseUrl = BACKEND_API.BASE_URL;

  /**
   * 챗봇과 대화하기
   */
  static async chatWithBot(request: ChatbotRequest): Promise<ChatbotResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chatbot/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
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
