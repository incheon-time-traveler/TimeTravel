import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

interface PixelTextProps extends TextProps {
  children: React.ReactNode;
}

const styles = StyleSheet.create({
  pixel: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export const PixelText: React.FC<PixelTextProps> = ({ style, children, ...props }) => {
  let cleanedStyle;
  if (Array.isArray(style)) {
    cleanedStyle = style.map(s => (s && typeof s === 'object' ? { ...s, fontFamily: undefined } : s));
  } else if (style && typeof style === 'object') {
    cleanedStyle = { ...style, fontFamily: undefined };
  } else {
    cleanedStyle = style;
  }
  const mergedStyle = [styles.pixel, cleanedStyle];
  return (
    <RNText style={mergedStyle} {...props}>
      {children}
    </RNText>
  );
}; 