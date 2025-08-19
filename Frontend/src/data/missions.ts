import { Mission, HistoricalPhoto } from '../types/mission';

// 과거 사진 데이터
export const historicalPhotos: HistoricalPhoto[] = [
  {
    id: 1,
    title: "대불호텔 (정답)",
    description: "1883년 인천항이 개항되어 외국과의 무역이 시작되었습니다.",
    imageUrl: require('../assets/images/대불호텔.jpg'),
    year: "1883",
    location: "대불호텔"
  },
  {
    id: 2,
    title: "대불호텔",
    description: "1934년 인천대교가 완공되어 한강을 건너는 교통이 편리해졌습니다.",
    imageUrl: require('../assets/images/대불호텔.jpg'),
    year: "1934",
    location: "대불호텔"
  },
  {
    id: 3,
    title: "대불호텔",
    description: "2001년 인천국제공항이 개항되어 세계와의 연결이 강화되었습니다.",
    imageUrl: require('../assets/images/대불호텔.jpg'),
    year: "2001",
    location: "대불호텔"
  },
  {
    id: 4,
    title: "대불호텔",
    description: "1970년대 월미도가 관광지로 개발되어 많은 관광객이 찾게 되었습니다.",
    imageUrl: require('../assets/images/대불호텔.jpg'),
    year: "1970",
    location: "대불호텔"
  },
  {
    id: 5,
    title: "인천대공원 조성",
    description: "1996년 인천대공원이 조성되어 시민들의 휴식 공간이 되었습니다.",
    imageUrl: "https://via.placeholder.com/300x200/0066CC/FFFFFF?text=인천대공원+조성",
    year: "1996",
    location: "인천대공원"
  },
  {
    id: 6,
    title: "송도국제도시 개발",
    description: "2003년 송도국제도시 개발이 시작되어 미래형 도시로 발전했습니다.",
    imageUrl: "https://via.placeholder.com/300x200/0066CC/FFFFFF?text=송도국제도시+개발",
    year: "2003",
    location: "송도국제도시"
  },
  {
    id: 7,
    title: "인천 아시안게임",
    description: "2014년 인천 아시안게임이 개최되어 세계의 주목을 받았습니다.",
    imageUrl: "https://via.placeholder.com/300x200/0066CC/FFFFFF?text=인천+아시안게임",
    year: "2014",
    location: "인천"
  },
  {
    id: 8,
    title: "인천 지하철 1호선",
    description: "1999년 인천 지하철 1호선이 개통되어 대중교통이 발달했습니다.",
    imageUrl: "https://via.placeholder.com/300x200/0066CC/FFFFFF?text=인천+지하철+1호선",
    year: "1999",
    location: "인천"
  }
];

// 미션 데이터
export const missions: Mission[] = [
  {
    id: 1,
    location: {
      id: 1,
      name: "대불호텔",
      lat: 37.4563,
      lng: 126.7052,
      order: 1,
      radius: 100, // 100미터 반경
      completed: false
    },
    historicalPhotos: [historicalPhotos[0], historicalPhotos[1], historicalPhotos[2], historicalPhotos[3]],
    completed: false
  },
  {
    id: 2,
    location: {
      id: 2,
      name: "인천대공원",
      lat: 37.4583,
      lng: 126.7449,
      order: 2,
      radius: 150, // 150미터 반경
      completed: false
    },
    historicalPhotos: [historicalPhotos[4], historicalPhotos[5], historicalPhotos[6], historicalPhotos[7]],
    completed: false
  },
  {
    id: 3,
    location: {
      id: 3,
      name: "월미도",
      lat: 37.4667,
      lng: 126.5833,
      order: 3,
      radius: 200, // 200미터 반경
      completed: false
    },
    historicalPhotos: [historicalPhotos[3], historicalPhotos[4], historicalPhotos[5], historicalPhotos[6]],
    completed: false
  },
  {
    id: 4,
    location: {
      id: 4,
      name: "송도국제도시",
      lat: 37.3833,
      lng: 126.6333,
      order: 4,
      radius: 300, // 300미터 반경
      completed: false
    },
    historicalPhotos: [historicalPhotos[5], historicalPhotos[6], historicalPhotos[7], historicalPhotos[0]],
    completed: false
  }
];

// 현재 활성화된 미션 가져오기
export const getActiveMissions = (): Mission[] => {
  return missions.filter(mission => !mission.completed);
};

// 특정 위치의 미션 찾기
export const findMissionByLocation = (lat: number, lng: number): Mission | null => {
  return missions.find(mission => {
    const distance = calculateDistance(lat, lng, mission.location.lat, mission.location.lng);
    return distance <= mission.location.radius && !mission.completed;
  }) || null;
};

// 두 지점 간의 거리 계산 (미터)
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}; 