import { StyleSheet } from 'react-native';

export const FONTS = {
  pixel: 'NeoDunggeunmoPro-Regular',
  monospace: 'monospace',
  system: 'System',
};

export const FONT_STYLES = StyleSheet.create({
  pixel: { 
    fontFamily: FONTS.pixel,
  },
  mono: { 
    fontFamily: FONTS.monospace,
  },
  system: { 
    fontFamily: FONTS.system,
  },
});

export const TEXT_STYLES = StyleSheet.create({
  title: {
    ...FONT_STYLES.pixel,
    fontSize: 28, // 조금 더 크게 (메인 타이틀용)
    color: '#000000',
  },
  subtitle: {
    ...FONT_STYLES.pixel,
    fontSize: 22, // 24에서 22로 (섹션 제목용)
    color: '#000000',
  },
  heading: { // 새로 추가 (카드 제목 등)
    ...FONT_STYLES.pixel,
    fontSize: 18,
    color: '#000000',
  },
  body: {
    ...FONT_STYLES.system, // 폰트패밀리 추가
    fontSize: 16,
    color: '#5C5D60',
  },
  small: {
    ...FONT_STYLES.system, // 폰트패밀리 추가
    fontSize: 14,
    color: '#5C5D60',
  },
  button: {
    ...FONT_STYLES.pixel,
    fontSize: 16,
    color: '#5C5D60',
  },
  tab: {
    ...FONT_STYLES.pixel,
    fontSize: 12,
    color: '#5C5D60',
  },
});

export const WARNING = '#D21D1D';
export const INCHEON_BLUE = '#0066CC'; 
export const INCHEON_BLUE_LIGHT = '#E3F0FF'; 
export const INCHEON_GRAY = '#5C5D60'; 