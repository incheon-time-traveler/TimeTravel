// 기본 위치 서비스 - 지도 관련 코드 제거
export const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve) => {
    // 인천 중심 좌표 반환
    resolve({ lat: 37.4563, lng: 126.7052 });
  });
};

export const getLocations = () => {
  return [
    {
      id: '1',
      name: '인천대교',
      lat: 37.4563,
      lng: 126.7052,
      description: '아름다운 해상 다리',
    },
    {
      id: '2',
      name: '월미도',
      lat: 37.4663,
      lng: 126.5952,
      description: '인천의 대표 관광지',
    },
    {
      id: '3',
      name: '송도 센트럴파크',
      lat: 37.3863,
      lng: 126.6452,
      description: '현대적인 도시 공원',
    },
    {
      id: '4',
      name: '차이나타운',
      lat: 37.4763,
      lng: 126.6252,
      description: '인천의 다문화 거리',
    },
  ];
}; 