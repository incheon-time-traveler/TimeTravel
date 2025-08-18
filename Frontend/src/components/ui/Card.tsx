import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
// Card 내부 텍스트는 PixelText를 사용하세요!

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
}); 