import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import { authService } from '../../services/authService';
import { BACKEND_API } from '../../config/apiKeys';

export default function ProfileSetupScreen({ navigation }: any) {
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const ageOptions = [
    '10대', '20대', '30대', '40대', '50대', '60대', '70대 이상'
  ];

  const genderOptions = ['남성', '여성', '기타'];

  // 기존 사용자 정보 불러오기
  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const user = await authService.getUser();
      if (user) {
        setNickname(user.nickname || '');
        setAge(user.age || '');
        setGender(user.gender || '');
        // 기존 정보가 있으면 편집 모드
        if (user.nickname && user.age && user.gender) {
          setIsEditMode(true);
        }
      }
    } catch (error) {
      console.error('기존 프로필 로드 실패:', error);
    }
  };

  const handleCompleteProfile = async () => {
    if (!nickname.trim() || !age || !gender) {
      Alert.alert('입력 오류', '닉네임, 나이대, 성별을 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('인증 오류', '로그인이 필요합니다.');
        return;
      }

      // 현재 사용자 정보 가져오기
      const currentUser = await authService.getUser();
      if (!currentUser?.id) {
        Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
        return;
      }

      // JWT 토큰에서 실제 사용자 ID 추출하여 확인
      let actualUserId = currentUser.id;
      try {
        const tokenParts = tokens.access.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const jwtUserId = payload.user_id;
          console.log('[ProfileSetupScreen] JWT에서 추출된 user_id:', jwtUserId);
          console.log('[ProfileSetupScreen] currentUser.id:', currentUser.id);
          
          if (jwtUserId && jwtUserId !== currentUser.id) {
            console.log('[ProfileSetupScreen] ⚠️ ID 불일치! JWT:', jwtUserId, 'vs currentUser:', currentUser.id);
            console.log('[ProfileSetupScreen] JWT의 user_id를 우선 사용합니다.');
            // JWT의 user_id를 우선 사용
            actualUserId = jwtUserId;
          }
        }
      } catch (error) {
        console.error('[ProfileSetupScreen] JWT 파싱 실패:', error);
      }

      console.log('[ProfileSetupScreen] 최종 사용할 user_id:', actualUserId);
      console.log('[ProfileSetupScreen] 토큰 정보:', {
        accessTokenExists: !!tokens.access,
        accessTokenLength: tokens.access?.length,
        accessTokenPrefix: tokens.access?.slice(0, 20) + '...',
        accessTokenSuffix: tokens.access?.slice(-20)
      });

      // ID 불일치 경고
      if (actualUserId !== currentUser.id) {
        console.warn('[ProfileSetupScreen] ⚠️ 주의: JWT user_id와 currentUser.id가 다릅니다!');
        console.warn('[ProfileSetupScreen] JWT user_id:', actualUserId);
        console.warn('[ProfileSetupScreen] currentUser.id:', currentUser.id);
      }

      // JWT 토큰 페이로드 전체 로깅 (디버깅용)
      try {
        const tokenParts = tokens.access.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('[ProfileSetupScreen] JWT 페이로드 전체:', payload);
          console.log('[ProfileSetupScreen] JWT 생성시간:', new Date(payload.iat * 1000).toLocaleString());
          console.log('[ProfileSetupScreen] JWT 만료시간:', new Date(payload.exp * 1000).toLocaleString());
          console.log('[ProfileSetupScreen] JWT user_id:', payload.user_id);
          console.log('[ProfileSetupScreen] JWT token_type:', payload.token_type);
          
          // 토큰 만료 여부 확인
          const now = Math.floor(Date.now() / 1000);
          const isExpired = now >= payload.exp;
          console.log('[ProfileSetupScreen] 현재 시간 (Unix):', now);
          console.log('[ProfileSetupScreen] 토큰 만료 여부:', isExpired);
        }
      } catch (error) {
        console.error('[ProfileSetupScreen] JWT 페이로드 로깅 실패:', error);
      }

      // 백엔드의 정확한 API 엔드포인트 사용 (실제 사용자 ID 사용)
      console.log('[ProfileSetupScreen] API 호출 시작:', {
        url: `${BACKEND_API.BASE_URL}/v1/users/profile/${actualUserId}/`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access?.slice(0, 20)}...`,
        },
        body: {
          nickname: nickname.trim(),
          age: age,
          gender: gender,
        },
        userId: actualUserId
      });

      const response = await fetch(`${BACKEND_API.BASE_URL}/v1/users/profile/${actualUserId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access}`,
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          age: age,
          gender: gender,
        }),
      });

      console.log('[ProfileSetupScreen] API 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ProfileSetupScreen] 성공 응답 데이터:', data);
        
        // 로컬 사용자 정보 업데이트 (백엔드 응답 데이터 사용)
        await authService.saveUser({
          ...currentUser,
          nickname: data.nickname,
          age: data.age,
          gender: data.gender,
        });

        Alert.alert(
          isEditMode ? '프로필 수정 완료! 🎉' : '프로필 완성! 🎉',
          isEditMode 
            ? '프로필이 성공적으로 수정되었습니다.'
            : '프로필이 성공적으로 설정되었습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                if (isEditMode) {
                  // 프로필 수정 모드: 이전 화면(ProfileScreen)으로 돌아가기
                  navigation.goBack();
                } else {
                  // 최초 프로필 설정: 메인 탭으로 이동
                  navigation.navigate('MainTabs');
                }
              },
            },
          ]
        );
      } else {
        // 상세한 에러 정보 로깅
        console.error('[ProfileSetupScreen] API 에러:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });

        let errorMessage = '프로필 설정 중 오류가 발생했습니다.';
        
        try {
          const errorData = await response.json();
          console.error('[ProfileSetupScreen] 에러 응답 데이터:', errorData);
          errorMessage = errorData.error || errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('[ProfileSetupScreen] 에러 응답 파싱 실패:', parseError);
          const errorText = await response.text();
          console.error('[ProfileSetupScreen] 에러 응답 텍스트:', errorText);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        Alert.alert('프로필 설정 실패', errorMessage);
      }
    } catch (error) {
      console.error('프로필 설정 실패:', error);
      Alert.alert('네트워크 오류', '서버와의 연결을 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // 나중에 설정하기 - 메인 탭으로 이동
    navigation.navigate('MainTabs');
  };

  // 백엔드 연결 테스트 함수
  const testBackendConnection = async () => {
    try {
      console.log('[ProfileSetupScreen] 백엔드 연결 테스트 시작');
      
      const tokens = await authService.getTokens();
      if (!tokens?.access) {
        Alert.alert('연결 테스트 실패', '토큰이 없습니다.');
        return;
      }

      const currentUser = await authService.getUser();
      if (!currentUser?.id) {
        Alert.alert('연결 테스트 실패', '사용자 정보가 없습니다.');
        return;
      }

      // JWT 토큰에서 실제 사용자 ID 추출
      let actualUserId = currentUser.id;
      try {
        const tokenParts = tokens.access.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const jwtUserId = payload.user_id;
          if (jwtUserId && jwtUserId !== currentUser.id) {
            console.log('[ProfileSetupScreen] 연결 테스트 - JWT user_id 사용:', jwtUserId);
            actualUserId = jwtUserId;
          }
        }
      } catch (error) {
        console.error('[ProfileSetupScreen] JWT 파싱 실패:', error);
      }

      console.log('[ProfileSetupScreen] 연결 테스트 - 사용할 user_id:', actualUserId);
      console.log('[ProfileSetupScreen] 연결 테스트 - 토큰 정보:', {
        accessTokenExists: !!tokens.access,
        accessTokenLength: tokens.access?.length,
        accessTokenPrefix: tokens.access?.slice(0, 20) + '...',
        accessTokenSuffix: tokens.access?.slice(-20)
      });

      // ID 불일치 경고
      if (actualUserId !== currentUser.id) {
        console.warn('[ProfileSetupScreen] 연결 테스트 - ⚠️ 주의: JWT user_id와 currentUser.id가 다릅니다!');
        console.warn('[ProfileSetupScreen] 연결 테스트 - JWT user_id:', actualUserId);
        console.warn('[ProfileSetupScreen] 연결 테스트 - currentUser.id:', currentUser.id);
      }

      // GET 요청으로 연결 테스트 (실제 사용자 ID 사용)
      const testUrl = `${BACKEND_API.BASE_URL}/v1/users/profile/${actualUserId}/`;
      const testHeaders = {
        'Authorization': `Bearer ${tokens.access}`,
      };

      console.log('[ProfileSetupScreen] 연결 테스트 요청:', {
        url: testUrl,
        method: 'GET',
        headers: testHeaders
      });

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: testHeaders,
      });

      console.log('[ProfileSetupScreen] 연결 테스트 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('연결 테스트 성공', `백엔드 연결이 정상입니다.\n사용자 ID: ${actualUserId}\n응답 상태: ${response.status}`);
      } else {
        // 에러 응답 상세 정보 확인
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage += `\n\n에러 상세: ${JSON.stringify(errorData, null, 2)}`;
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage += `\n\n응답 텍스트: ${errorText}`;
        }
        Alert.alert('연결 테스트 실패', errorMessage);
      }
    } catch (error) {
      console.error('[ProfileSetupScreen] 연결 테스트 에러:', error);
      Alert.alert('연결 테스트 에러', `네트워크 오류: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isEditMode ? '프로필 편집' : '프로필 설정'}
      </Text>
      <Text style={styles.subtitle}>
        {isEditMode 
          ? '프로필 정보를 수정해주세요' 
          : '여행을 위한 기본 정보를 입력해주세요'
        }
      </Text>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 닉네임 입력 */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>닉네임 *</Text>
          <TextInput
            style={styles.textInput}
            value={nickname}
            onChangeText={setNickname}
            placeholder="사용할 닉네임을 입력하세요"
            maxLength={30}
          />
        </View>

        {/* 나이 선택 */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>나이대 *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={age}
              onValueChange={(itemValue) => setAge(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="나이대를 선택하세요" value="" />
              {ageOptions.map((ageOption) => (
                <Picker.Item key={ageOption} label={ageOption} value={ageOption} />
              ))}
            </Picker>
          </View>
        </View>

        {/* 성별 선택 */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>성별 *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={gender}
              onValueChange={(itemValue) => setGender(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="성별을 선택하세요" value="" />
              {genderOptions.map((genderOption) => (
                <Picker.Item key={genderOption} label={genderOption} value={genderOption} />
              ))}
            </Picker>
          </View>
        </View>


        {/* 안내 메시지 */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color={INCHEON_BLUE} />
          <Text style={styles.infoText}>
            프로필 정보는 여행 추천과 개인화 서비스에 활용됩니다.
          </Text>
        </View>

        {/* 백엔드 연결 테스트 버튼 */}
        <TouchableOpacity style={styles.testButton} onPress={testBackendConnection}>
          <Text style={styles.testButtonText}>백엔드 연결 테스트</Text>
        </TouchableOpacity>

        {/* 버튼들 */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteProfile}
            disabled={isLoading || !nickname.trim() || !age || !gender}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.completeButtonText}>
                  {isEditMode ? '프로필 수정하기' : '프로필 완성하기'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>나중에 설정하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    ...TEXT_STYLES.title,
    marginTop: 40,
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    ...TEXT_STYLES.heading,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    ...TEXT_STYLES.heading,
    color: INCHEON_GRAY,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    ...TEXT_STYLES.body,
    backgroundColor: '#f8f9fa',
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    fontFamily: 'NeoDunggeunmoPro-Regular',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INCHEON_BLUE_LIGHT,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: INCHEON_BLUE,
    marginLeft: 8,
    flex: 1,
  },
  buttonSection: {
    gap: 16,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INCHEON_BLUE,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 30,
  },
  completeButtonText: {
    ...TEXT_STYLES.heading,
    color: '#fff',
    marginLeft: 10,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipButtonText: {
    ...TEXT_STYLES.body,
    color: INCHEON_GRAY,
    textDecorationLine: 'underline',
  },
  testButton: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: INCHEON_BLUE,
  },
  testButtonText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_BLUE,
    fontWeight: 'bold',
  },
}); 