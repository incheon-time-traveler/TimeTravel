import React, { useState } from 'react';
import { Text, View, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ageOptions = ['10대', '20대', '30대', '40대', '50대 이상'];
const genderOptions = ['남성', '여성', '선택 안 함'];

const ProfileSetupScreen = ({ navigation }: any) => {
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  const handleComplete = () => {
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
    // TODO: 서버로 정보 전송 및 다음 화면 이동
    Alert.alert('가입 완료', '회원 정보가 저장되었습니다!');
    // navigation.navigate('Home');
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
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 28,
    marginTop: 40,
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    alignSelf: 'flex-start',
    fontSize: 16,
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
    fontFamily: 'NeoDunggeunmoPro-Regular',
    color: '#222',
    fontSize: 13,
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
    fontFamily: 'NeoDunggeunmoPro-Regular',
    color: '#fff',
    fontSize: 15,
  },
  optionTextSelected: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    color: '#007AFF',
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
    fontFamily: 'NeoDunggeunmoPro-Regular',
    color: '#fff',
    fontSize: 18,
  },
});

export default ProfileSetupScreen; 