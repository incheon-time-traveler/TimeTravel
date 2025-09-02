import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../styles/fonts';

const { width } = Dimensions.get('window');

interface VisitCompleteModalProps {
  visible: boolean;
  spotName: string;
  spotDescription?: string;
  spotImage?: string;
  onClose: () => void;
  onNextSpot: () => void;
}

export default function VisitCompleteModal({
  visible,
  spotName,
  spotDescription,
  spotImage,
  onClose,
  onNextSpot,
}: VisitCompleteModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>🎉 목적지에 도착했습니다!</Text>
          </View>

          {/* 스팟 정보 */}
          <View style={styles.spotInfo}>
            <Text style={styles.spotName}>{spotName}</Text>
            {spotDescription && (
              <Text style={styles.spotDescription}>{spotDescription}</Text>
            )}
            
            {spotImage && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: spotImage }}
                  style={styles.spotImage}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>

          {/* 버튼들 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.nextButton} onPress={onNextSpot}>
              <Text style={styles.nextButtonText}>다음 장소로 이동</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxWidth: width - 40,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    ...TEXT_STYLES.heading,
    fontSize: 20,
    color: INCHEON_BLUE,
    textAlign: 'center',
  },
  spotInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  spotName: {
    ...TEXT_STYLES.subtitle,
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  spotDescription: {
    ...TEXT_STYLES.body,
    color: INCHEON_GRAY,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  spotImage: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    gap: 12,
  },
  nextButton: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: INCHEON_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: {
    ...TEXT_STYLES.button,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  closeButtonText: {
    ...TEXT_STYLES.button,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
