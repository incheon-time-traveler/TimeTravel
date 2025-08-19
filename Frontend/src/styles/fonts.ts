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
    fontSize: 24,
    color: '#000000',
  },
  subtitle: {
    ...FONT_STYLES.pixel,
    fontSize: 18,
    color: '#333333',
  },
  body: {
    ...FONT_STYLES.pixel,
    fontSize: 16,
    color: '#000000',
  },
  small: {
    ...FONT_STYLES.pixel,
    fontSize: 14,
    color: '#666666',
  },
  button: {
    ...FONT_STYLES.pixel,
    fontSize: 16,
    color: '#000000',
  },
  tab: {
    ...FONT_STYLES.pixel,
    fontSize: 12,
    color: '#000000',
  },
}); 

export const INCHEON_BLUE = '#0066CC'; 
export const INCHEON_BLUE_LIGHT = '#E3F0FF'; 
export const INCHEON_GRAY = '#5C5D60'; 