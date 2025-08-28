import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY, TEXT_STYLES } from '../../styles/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const sampleCourses = [
  {
    id: 1,
    title: '가볍게 인천 한바퀴',
    image: '', // 실제 이미지 경로 또는 URL
    locked: false,
  },
  {
    id: 2,
    title: '먹으면서 즐기는 인천',
    image: '',
    locked: false,
  },
];

export default function HomeScreen({ navigation }: any) {
  const handleLoginPress = () => {
    navigation.navigate('Profile'); // Profile 탭으로 이동(로그인 유도)
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>다른 사람들이 선택한 코스</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll}>
              {sampleCourses.map((course) => (
                <View key={course.id} style={styles.courseCard}>
                  <View style={styles.imageBox}>
                    <Ionicons name="image-outline" size={36} color="#bbb" />
                  </View>
                  <Text style={styles.courseTitle} numberOfLines={1}>{course.title}</Text>
                  <TouchableOpacity style={styles.startBtn} disabled>
                    <Text style={styles.startBtnText}>시작하기</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <View style={styles.loginSection}>
              <Text style={styles.loginTitle}>나만의 코스를 만들어 볼까요?</Text>
              <TouchableOpacity style={styles.loginBtn} onPress={handleLoginPress}>
                <Text style={styles.loginBtnText}>로그인</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
      </View>
    </SafeAreaView>

  );
}

const CARD_WIDTH = width * 0.7;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // SafeAreaView가 화면 전체를 차지하도록 설정
    backgroundColor: '#f0f0f0', // SafeAreaView 자체의 배경색 (선택 사항)
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 32,
  },
  loginSection: {
    flex:1,
    justifyContent: 'center',
    minHeight: 400,
    alignItems: 'center',
  },
  sectionTitle: {
    ...TEXT_STYLES.subtitle,
    marginBottom: 16,
    textAlign: 'center',
  },
  loginTitle: {
    ...TEXT_STYLES.subtitle,
  },
  loginBtn: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 16,
    marginBottom: 8,
  },
  loginBtnText: {
    ...TEXT_STYLES.button,
    color: '#fff',
  },
  cardScroll: {
    marginTop: 8,
    paddingLeft: 16,
    paddingRight: 16,
  },
  courseCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 16,
    padding: 16,
    alignItems: 'center',
  },
  imageBox: {
    width: '100%',
    height: 120,
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  courseTitle: {
    ...TEXT_STYLES.heading,
    marginBottom: 10,
    textAlign: 'center',
  },
  startBtn: {
    backgroundColor: INCHEON_BLUE_LIGHT,
    borderColor: '#e0e0e0',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  startBtnText: {
    ...TEXT_STYLES.button,
  },
}); 