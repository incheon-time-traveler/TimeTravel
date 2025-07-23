import React from 'react';
import { View, Button, Alert, Text, StyleSheet, TouchableOpacity } from 'react-native';

const SignupScreen = ({ navigation }: any) => {
  const handleGoogleSignup = () => {
    // 실제 구현 전까지는 바로 ProfileSetupScreen으로 이동
    navigation.navigate('ProfileSetup');
    // Alert.alert('구글 회원가입', '구글 회원가입 기능이 준비 중입니다.');
  };

  const handleKakaoSignup = () => {
    // 실제 구현 전까지는 바로 ProfileSetupScreen으로 이동
    navigation.navigate('ProfileSetup');
    // Alert.alert('카카오 회원가입', '카카오 회원가입 기능이 준비 중입니다.');
  };

  const handleLoginPress = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TimeTravel</Text>
        <Text style={styles.subtitle}>새로운 계정을 만들어보세요</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignup}>
          <Text style={styles.googleButtonText}>구글로 시작하기</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.kakaoButton} onPress={handleKakaoSignup}>
          <Text style={styles.kakaoButtonText}>카카오로 시작하기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>또는</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.loginPrompt}>
        <Text style={styles.loginPromptText}>이미 계정이 있으신가요?</Text>
        <TouchableOpacity onPress={handleLoginPress}>
          <Text style={styles.loginLink}>로그인하기</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>
        * 소셜 회원가입 기능은 현재 개발 중입니다.
      </Text>
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
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loginPromptText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
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

export default SignupScreen; 