import axios from 'axios';
import { BACKEND_API } from '../config/apiKeys';
import authService from './authService';
// Types
export interface UnlockedSpot {
  id: number;
  order: number;
  unlock_at: string;
  created_at: string;
  route_id: number;
  route_spot_id: number;
  past_photo_url: string;
}

export const fetchUnlockedSpots = async (): Promise<UnlockedSpot[]> => {
  try {
    const tokens = await authService.getTokens();
    if (!tokens?.access) {
      return [];
    }
    const response = await fetch(`${BACKEND_API.BASE_URL}/v1/routes/unlock_spots/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.access}`,
      },
    });
    const data = await response.json();
    return data as UnlockedSpot[];
  } catch (error) {
    console.error('Error fetching unlocked spots:', error);
    throw error;
  }
};
