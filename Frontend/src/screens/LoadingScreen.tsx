import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';

const LoadingScreen = () => {
  const svgXml = `
    <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M150 50C95.8 50 52 93.8 52 148C52 202.2 95.8 246 150 246C204.2 246 248 202.2 248 148C248 93.8 204.2 50 150 50ZM150 230C103.4 230 66 192.6 66 146C66 99.4 103.4 62 150 62C196.6 62 234 99.4 234 146C234 192.6 196.6 230 150 230Z" fill="#4A90E2"/>
      <path d="M150 70C107.9 70 74 103.9 74 146C74 188.1 107.9 222 150 222C192.1 222 226 188.1 226 146C226 103.9 192.1 70 150 70ZM150 206C117.2 206 90 178.8 90 146C90 113.2 117.2 86 150 86C182.8 86 210 113.2 210 146C210 178.8 182.8 206 150 206Z" fill="#4A90E2"/>
      <path d="M150 90C122.4 90 100 112.4 100 140C100 167.6 122.4 190 150 190C177.6 190 200 167.6 200 140C200 112.4 177.6 90 150 90ZM150 174C133.5 174 120 160.5 120 144C120 127.5 133.5 114 150 114C166.5 114 180 127.5 180 144C180 160.5 166.5 174 150 174Z" fill="#4A90E2"/>
      <path d="M150 110C143.4 110 138 105.6 138 100C138 94.4 142.4 90 148 90H152C157.6 90 162 94.4 162 100C162 105.6 157.6 110 152 110H150Z" fill="#4A90E2"/>
      <path d="M150 190C156.6 190 162 185.6 162 180C162 174.4 157.6 170 152 170H148C142.4 170 138 174.4 138 180C138 185.6 142.4 190 148 190H150Z" fill="#4A90E2"/>
      <path d="M110 150C110 144.4 105.6 140 100 140V144C105.6 144 110 148.4 110 154H114C114 148.4 109.6 144 104 144V140C109.6 140 114 144.4 114 150H110Z" fill="#4A90E2"/>
      <path d="M190 150C190 155.6 194.4 160 200 160V156C194.4 156 190 151.6 190 146H186C186 151.6 190.4 156 196 156V160C190.4 160 186 155.6 186 150H190Z" fill="#4A90E2"/>
      <path d="M150 130C139 130 130 139 130 150C130 161 139 170 150 170C161 170 170 161 170 150C170 139 161 130 150 130Z" fill="#4A90E2"/>
    </svg>
  `;

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <SvgXml xml={svgXml} width="200" height="200" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LoadingScreen;
