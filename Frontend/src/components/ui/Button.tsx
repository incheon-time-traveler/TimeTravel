import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet } from 'react-native';
import { PixelText } from '../PixelText';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

const buttonStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  default: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  destructive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: '#000000',
  },
  secondary: {
    backgroundColor: '#f3f4f6',
    borderColor: '#f3f4f6',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  link: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  sizeDefault: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sizeSm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sizeLg: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sizeIcon: {
    width: 40,
    height: 40,
  },
});

const textStyles = StyleSheet.create({
  base: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
  },
  default: {
    color: '#ffffff',
  },
  destructive: {
    color: '#ffffff',
  },
  outline: {
    color: '#000000',
  },
  secondary: {
    color: '#000000',
  },
  ghost: {
    color: '#000000',
  },
  link: {
    color: '#000000',
    textDecorationLine: 'underline',
  },
  sizeSm: {
    fontSize: 14,
  },
  sizeLg: {
    fontSize: 18,
  },
});

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'default', 
  size = 'default', 
  style, 
  children, 
  ...props 
}) => {
  const buttonStyle = [
    buttonStyles.base,
    buttonStyles[variant],
    size === 'sm' && buttonStyles.sizeSm,
    size === 'lg' && buttonStyles.sizeLg,
    size === 'icon' && buttonStyles.sizeIcon,
    size === 'default' && buttonStyles.sizeDefault,
    style,
  ];

  const textStyle = [
    textStyles.base,
    textStyles[variant],
    size === 'sm' && textStyles.sizeSm,
    size === 'lg' && textStyles.sizeLg,
  ];

  return (
    <TouchableOpacity style={buttonStyle} {...props}>
      <PixelText style={textStyle}>{children}</PixelText>
    </TouchableOpacity>
  );
}; 