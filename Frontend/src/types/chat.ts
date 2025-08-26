export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type: 'text' | 'image' | 'location';
}

export interface ChatBotResponse {
  text: string;
  suggestions?: string[];
  showMap?: boolean;
  location?: {
    name: string;
    lat: number;
    lng: number;
  };
}

export interface ChatScreenProps {
  visible: boolean;
  onClose: () => void;
} 