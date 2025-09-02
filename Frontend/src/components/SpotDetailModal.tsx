import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../styles/fonts';

const { width } = Dimensions.get('window');

interface SpotDetailModalProps {
  visible: boolean;
  spot: {
    id: number;
    name: string;
    description?: string;
    address?: string;
    past_image_url?: string;
    first_image?: string;
    era?: string;
  } | null;
  onClose: () => void;
}

export default function SpotDetailModal({
  visible,
  spot,
  onClose,
}: SpotDetailModalProps) {
  if (!spot) return null;

  const displayImage = spot.past_image_url || spot.first_image;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>{spot.name}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 이미지 */}
            {displayImage && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: displayImage }}
                  style={styles.spotImage}
                  resizeMode="cover"
                />
                {spot.past_image_url && (
                  <View style={styles.imageLabel}>
                    <Text style={styles.imageLabelText}>과거 모습</Text>
                  </View>
                )}
              </View>
            )}

            {/* 주소 */}
            {spot.address && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>📍 주소</Text>
                <Text style={styles.infoText}>{spot.address}</Text>
              </View>
            )}

            {/* 시대 */}
            {spot.era && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>🏛️ 시대</Text>
                <Text style={styles.infoText}>{spot.era}</Text>
              </View>
            )}

            {/* 설명 */}
            {spot.description && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>📖 설명</Text>
                <Text style={styles.infoText}>{spot.description}</Text>
              </View>
            )}

            {/* 미션 완료 표시 */}
            {spot.past_image_url && (
              <View style={styles.missionSection}>
                <View style={styles.missionBadge}>
                  <Text style={styles.missionBadgeText}>🎯 미션 완료</Text>
                </View>
                <Text style={styles.missionText}>
                  이 장소의 과거 모습을 확인하고 미션을 완료했습니다!
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    ...TEXT_STYLES.heading,
    fontSize: 20,
    color: INCHEON_BLUE,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: INCHEON_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  spotImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageLabel: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoLabel: {
    ...TEXT_STYLES.subtitle,
    fontSize: 16,
    color: INCHEON_BLUE,
    marginBottom: 8,
  },
  infoText: {
    ...TEXT_STYLES.body,
    color: '#333',
    lineHeight: 22,
  },
  missionSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  missionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: INCHEON_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  missionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  missionText: {
    ...TEXT_STYLES.body,
    color: INCHEON_GRAY,
    fontSize: 14,
    lineHeight: 20,
  },
});
