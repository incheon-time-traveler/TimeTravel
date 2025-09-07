import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/Main/HomeScreen';
import MapScreen from './src/screens/Main/MapScreen';
import TripsScreen from './src/screens/Main/TripsScreen';
import GalleryScreen from './src/screens/Main/GalleryScreen';
import CourseRecommendationScreen from './src/screens/Main/CourseRecommendationScreen';
import CourseDetailScreen from './src/screens/Main/CourseDetailScreen';
import ProfileSetupScreen from './src/screens/Auth/ProfileSetupScreen';
import LoginScreen from './src/screens/Auth/LoginScreen';
import MissionScreen from './src/screens/Main/MissionScreen';
import CameraScreen from './src/screens/Main/CameraScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatScreenWrapper from './src/screens/Chat/ChatScreen';


// UI Components
import { INCHEON_BLUE } from './src/styles/fonts';
import FloatingChatBotButton from './src/components/ui/FloatingChatBotButton';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();


// ---  nesting navigators ---

// Home 탭에 대한 스택 네비게이터 (Mission, Camera 등을 포함)
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Mission" component={MissionScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
    </Stack.Navigator>
  );
}

// Map 탭에 대한 스택 네비게이터
function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapMain" component={MapScreen} />
    </Stack.Navigator>
  );
}


// 탭 네비게이터 (각 탭은 필요에 따라 스택을 가짐)
function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: 60 + insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: insets.bottom,
          paddingTop: 14,
        },
        tabBarIcon: ({ focused }) => {
          let iconName = '';
          let label = '';
          switch (route.name) {
            case 'Map':
              iconName = 'map-outline';
              label = '지도';
              break;
            case 'Trips':
              iconName = 'compass-outline';
              label = '여행';
              break;
            case 'Home':
              iconName = 'home-outline';
              label = '홈';
              break;
            case 'Gallery':
              iconName = 'images-outline';
              label = '사진첩';
              break;
            case 'Profile':
              iconName = 'person-outline';
              label = '프로필';
              break;
            default:
              iconName = 'ellipse-outline';
              label = '';
          }
          return <TabBarIconWithLabel name={iconName} label={label} focused={focused} />;
        },
        tabBarActiveTintColor: INCHEON_BLUE,
        tabBarInactiveTintColor: '#bbb',
      })}
    >
      <Tab.Screen name="Map" component={MapStack} />
      <Tab.Screen name="Trips" component={TripsScreen} />
      {/* HomeScreen 대신 HomeStack을 렌더링 */}
      <Tab.Screen
        name="Home"
        component={HomeStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // 기본 동작(마지막 화면으로 이동)을 막습니다.
            e.preventDefault();
            // 스택의 첫 화면('HomeMain')으로 리셋하며 이동합니다.
            navigation.navigate('Home', { screen: 'HomeMain' });
          },
        })}
      />
      <Tab.Screen name="Gallery" component={GalleryScreen} />
      <Tab.Screen name="Profile" component={LoginScreen} />
    </Tab.Navigator>
  );
}

// 탭 바를 포함하는 화면들과, 탭 바가 필요 없는 전체 화면들을 관리
function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* 탭 바가 있는 메인 화면 */}
      <Stack.Screen name="MainTabs" component={MainTabs} />
      {/* 탭 바가 필요 없는 화면들 */}
      <Stack.Screen name="CourseRecommendation" component={CourseRecommendationScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}


// --- 커스텀 컴포넌트 ---
function TabBarIconWithLabel({ name, label, focused }: { name: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 56 }}>
      <Ionicons name={name} size={32} color={focused ? INCHEON_BLUE : '#bbb'} />
      <Text
        style={{
          fontFamily: 'NeoDunggeunmoPro-Regular',
          fontSize: 12,
          color: focused ? INCHEON_BLUE : '#bbb',
          marginTop: 1.5,
          width: 56,
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}


// --- 메인 앱 컴포넌트 ---
export default function App() {
  const [chatVisible, setChatVisible] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const viewedOnboarding = await AsyncStorage.getItem('@viewedOnboarding');
      setIsOnboardingComplete(viewedOnboarding === 'true');
    } catch (error) {
      console.error('온보딩 상태 확인 실패:', error);
      setIsOnboardingComplete(false);
    }
  };

  if (isOnboardingComplete === null) {
    return null; // 로딩 중
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isOnboardingComplete ? (
            <Stack.Screen name="Root" component={RootNavigator} />
          ) : (
            <>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="RootAfterOnboarding" component={RootNavigator} />
            </>
          )}
        </Stack.Navigator>
        {isOnboardingComplete && (
          <>
            <FloatingChatBotButton onPress={() => setChatVisible(true)} />
            <ChatScreenWrapper visible={chatVisible} onClose={() => setChatVisible(false)} />
          </>
        )}
      </NavigationContainer>
    </>
  );
}

