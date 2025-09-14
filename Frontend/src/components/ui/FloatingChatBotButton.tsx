import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { INCHEON_BLUE, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import Ionicons from '@react-native-vector-icons/ionicons';

interface Props {
  onPress?: () => void;
  style?: ViewStyle;
}

const FloatingChatBotButton: React.FC<Props> = ({ onPress, style }) => (
  <TouchableOpacity
    style={[styles.fab, style]}
    onPress={onPress}
  >
    <Ionicons name="chatbubbles" size={32} color='#fff' />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 24,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 50,
    backgroundColor: 'rgba(0,102,204,0.6)', // 인천블루 반투명
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default FloatingChatBotButton; 