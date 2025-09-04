import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const lockedImg = require('../../assets/icons/check_white.png');

interface CheckIconProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

const CheckIcon: React.FC<CheckIconProps> = ({ size = 18, style }) => (
  <Image
    source={lockedImg}
    style={[{ width: size, height: size, marginLeft: 4, marginRight: 4 }, style]}
    resizeMode="contain"
  />
);

export default CheckIcon;