export interface MissionLocation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  order: number;
  radius: number; // 미션 감지 반경 (미터)
  completed: boolean;
}

export interface HistoricalPhoto {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  year: string;
  location: string;
}

export interface Mission {
  id: number;
  location: MissionLocation;
  historicalPhotos: HistoricalPhoto[];
  completed: boolean;
  selectedPhotoId?: number;
}

export interface MissionNotification {
  type: 'arrival' | 'completion';
  missionId: number;
  locationName: string;
} 