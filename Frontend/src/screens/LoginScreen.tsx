import React from 'react';
import { signInWithGoogle, signInWithKakao } from '../services/authService';
import { View, Button, Alert, Text, StyleSheet, TouchableOpacity } from 'react-native';

const LoginScreen = ({ navigation }: any) => {
  const handleGoogleLogin = () => {
    signInWithGoogle();
  };

  const handleKakaoLogin = () => {
    signInWithKakao();
  };

  const handleSignupPress = () => {
    // 회원가입 화면으로 이동
    navigation.navigate('Signup');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TimeTravel</Text>
        <Text style={styles.subtitle}>소셜 로그인으로 시작하세요</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
          <Text style={styles.googleButtonText}>구글로 로그인</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.kakaoButton} onPress={handleKakaoLogin}>
          <Text style={styles.kakaoButtonText}>카카오로 로그인</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>또는</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.signupPrompt}>
        <Text style={styles.signupPromptText}>아직 회원이 아니신가요?</Text>
        <TouchableOpacity onPress={handleSignupPress}>
          <Text style={styles.signupLink}>회원가입하기</Text>
        </TouchableOpacity>
      </View>

      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 15,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  kakaoButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    marginVertical: 30,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 14,
  },
  signupPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  signupPromptText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default LoginScreen; 