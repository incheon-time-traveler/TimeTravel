import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { INCHEON_BLUE, INCHEON_BLUE_LIGHT, INCHEON_GRAY } from '../../styles/fonts';

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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <Text style={styles.topTitle}>어디로 떠나볼까요?</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={handleLoginPress}>
            <Text style={styles.loginBtnText}>로그인으로 여행을 시작해보세요</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>다른 사람들이 선택한 코스</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll}>
          {sampleCourses.map((course) => (
            <View key={course.id} style={styles.courseCard}>
              <View style={styles.imageBox}>
                <Ionicons name="image-outline" size={36} color="#bbb" />
              </View>
              <Text style={styles.courseTitle} numberOfLines={1}>{course.title}</Text>
              <TouchableOpacity style={styles.startBtn} disabled>
                <Text style={styles.startBtnText}>Start</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const CARD_WIDTH = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 8,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  topTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 20,
    color: INCHEON_GRAY,
    marginBottom: 16,
    textAlign: 'center',
  },
  loginBtn: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginBottom: 8,
  },
  loginBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: '#fff',
  },
  sectionTitle: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 16,
    color: INCHEON_GRAY,
    marginBottom: 12,
    marginLeft: 8,
  },
  cardScroll: {
    paddingLeft: 8,
  },
  courseCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: INCHEON_GRAY,
    marginRight: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 15,
    color: INCHEON_GRAY,
    marginBottom: 10,
    textAlign: 'center',
  },
  startBtn: {
    backgroundColor: INCHEON_BLUE,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  startBtnText: {
    fontFamily: 'NeoDunggeunmoPro-Regular',
    fontSize: 14,
    color: '#fff',
  },
}); 