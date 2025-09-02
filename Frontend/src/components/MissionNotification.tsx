import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Mission, HistoricalPhoto } from '../types/mission';
import { INCHEON_BLUE, INCHEON_GRAY } from '../styles/fonts';

interface MissionNotificationProps {
  visible: boolean;
  mission: Mission | null;
  onClose: () => void;
  onStartMission: (mission: Mission) => void;
  onCompleteVisit: (mission: Mission) => void;
}

const MissionNotification: React.FC<MissionNotificationProps> = ({
  visible,
  mission,
  onClose,
  onStartMission,
  onCompleteVisit,
}) => {
  const handleStartMission = () => {
    if (mission) {
      onStartMission(mission);
    }
  };

  const handleCompleteVisit = () => {
    if (mission) {
      onCompleteVisit(mission);
    }
  };

  if (!mission) return null;

  // past_image_url이 있는지 확인
  const hasMission = mission.historicalPhotos && mission.historicalPhotos.length > 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.notificationContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {hasMission ? '🎯 미션 장소에 도착했습니다!' : '📍 목적지에 도착했습니다!'}
            </Text>
            <Text style={styles.subtitle}>{mission.location.name}</Text>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.description}>
              {hasMission 
                ? '이곳의 과거 모습을 확인하고 역사를 탐험해보세요!'
                : '이곳을 방문하고 다음 장소로 이동하세요!'
              }
            </Text>
            
            {hasMission ? (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartMission}
              >
                <Text style={styles.startButtonText}>미션 시작!</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleCompleteVisit}
              >
                <Text style={styles.startButtonText}>방문 완료</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>나중에</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: INCHEON_BLUE,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: INCHEON_GRAY,
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    color: INCHEON_GRAY,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: INCHEON_BLUE,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 10,
    minWidth: 150,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: INCHEON_GRAY,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default MissionNotification; 