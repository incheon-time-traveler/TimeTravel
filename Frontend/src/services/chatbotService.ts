import { BACKEND_API, CHATBOT_API } from '../config/apiKeys';
import authService from './authService';

export interface ChatbotRequest {
  user_question: string;
  user_id: string;
  lat?: number;  
  lng?: number;
  user_nickname?: string;
  user_gender?: string;
  user_age_group?: string;
}

export interface ChatbotResponse {
  ai_answer: string;
}

export interface DeleteMemoryRequest {
  thread_id: number;
}

export interface DeleteMemoryResponse {
  success: boolean;
}

export class ChatbotService {
  private static baseUrl = BACKEND_API.BASE_URL;

  /**
   * 챗봇과 대화하기
   */
  static async chatWithBot(request: ChatbotRequest): Promise<ChatbotResponse> {
    try {
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        return { ai_answer: '안녕! 나는 인천 여행 도우미야. 도움이 필요하면 로그인 후에 더 많은 정보를 받을 수 있어!' };
      }

      const response = await fetch(`${this.baseUrl}/v1/chatbot/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${tokens.access}`,
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

  // /**
  //  * 사용자 ID 생성 (임시로 사용)
  //  */
  // static generateUserId(): string {
  //   return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  // }

  /**
   * 챗봇 메모리 삭제 (로그아웃 시 사용)
   */
  static async deleteMemory(request: DeleteMemoryRequest): Promise<DeleteMemoryResponse> {
    try {
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        console.log('[ChatbotService] 삭제할 유저가 없습니다.');
        throw new Error(``);
      }

      const response = await fetch(`${this.baseUrl}/v1/chatbot/memory/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      } 

      const data = await response.json();
      console.log('[ChatbotService] 채팅 메모리 삭제 성공:', data);
      return data;

    } catch (error) {
      console.error('[ChatbotService] 채팅 메모리 삭제 오류:', error);
      throw error;
    }
  }
}
