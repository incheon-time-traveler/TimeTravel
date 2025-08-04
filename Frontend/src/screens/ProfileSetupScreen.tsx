import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { updateUserProfile } from '../services/authService';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ageOptions = ['10대', '20대', '30대', '40대', '50대 이상'];
const genderOptions = ['남성', '여성', '선택 안 함'];

const ProfileSetupScreen = ({ navigation }: any) => {
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

    const handleComplete = async () => {
    if (!nickname.trim()) {
      Alert.alert('입력 오류', '닉네임을 입력해 주세요.');
      return;
    }
    if (!age) {
      Alert.alert('입력 오류', '연령대를 선택해 주세요.');
      return;
    }
    if (!gender) {
      Alert.alert('입력 오류', '성별을 선택해 주세요.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('오류', '로그인 정보가 없습니다. 다시 로그인해 주세요.');
        navigation.navigate('Login');
        return;
      }

      const decodedToken: { user_id: number } = jwtDecode(token);
      const userId = decodedToken.user_id;

      const profileData = {
        nickname,
        age,
        gender,
      };

      await updateUserProfile(userId, profileData, token);

      Alert.alert('가입 완료', '회원 정보가 성공적으로 저장되었습니다!');
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('오류', '프로필 정보 저장에 실패했습니다.');
    }
  };

  const handleNicknameCheck = () => {
    Alert.alert('중복확인', '중복확인 기능은 추후 제공됩니다.');
  };

  const handleClearNickname = () => {
    setNickname('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>추가 정보 입력</Text>
      <Text style={styles.subtitle}>서비스 이용을 위해 아래 정보를 입력해 주세요.</Text>

      <Text style={styles.label}>닉네임</Text>
      <View style={styles.nicknameRow}>
        <TextInput
          style={styles.input}
          placeholder="닉네임을 입력하세요"
          value={nickname}
          onChangeText={text => setNickname(text)} // 또는 길이 제한이 필요하면 text.slice(0, 20)
          autoCapitalize="none"
          autoCorrect={false}
        />
        {nickname.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearNickname}>
            <Ionicons name="close-circle" size={22} color="#888" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.checkButton} onPress={handleNicknameCheck}>
          <Text style={styles.checkButtonText}>중복확인</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>연령대</Text>
      <View style={styles.optionsRow}>
        {ageOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.optionButton, age === option && styles.optionButtonSelected]}
            onPress={() => setAge(option)}
          >
            <Text style={[styles.optionText, age === option && styles.optionTextSelected]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>성별</Text>
      <View style={styles.optionsRow}>
        {genderOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.optionButton, gender === option && styles.optionButtonSelected]}
            onPress={() => setGender(option)}
          >
            <Text style={[styles.optionText, gender === option && styles.optionTextSelected]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
        <Text style={styles.completeButtonText}>완료</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginTop: 18,
    marginBottom: 8,
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 24,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#181818',
    color: '#fff',
    marginRight: 8,
  },
  clearButton: {
    marginRight: 4,
  },
  checkButton: {
    backgroundColor: '#ccc',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginLeft: 2,
  },
  checkButtonText: {
    color: '#222',
    fontSize: 13,
    fontWeight: 'bold',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#181818',
  },
  optionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f0ff',
  },
  optionText: {
    color: '#fff',
    fontSize: 15,
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  completeButton: {
    marginTop: 32,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProfileSetupScreen; 