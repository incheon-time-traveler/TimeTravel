import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/Main/HomeScreen';
import MapScreen from './src/screens/Main/MapScreen';
import TripsScreen from './src/screens/Main/TripsScreen';
import GalleryScreen from './src/screens/Main/GalleryScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';
import CourseRecommendationScreen from './src/screens/Main/CourseRecommendationScreen';
import CourseDetailScreen from './src/screens/Main/CourseDetailScreen';
import ProfileSetupScreen from './src/screens/Auth/ProfileSetupScreen';
import FloatingChatBotButton from './src/components/ui/FloatingChatBotButton';
import ChatScreen from './src/screens/Chat/ChatScreen';
import { INCHEON_BLUE } from './src/styles/fonts';
import LoginScreen from './src/screens/Auth/LoginScreen';
import MissionScreen from './src/screens/Main/MissionScreen';
import CameraScreen from './src/screens/Main/CameraScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Map 스택 네비게이터
function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapMain" component={MapScreen} />
    </Stack.Navigator>
  );
}

// 메인 탭 네비게이터
function MainTabNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="CourseRecommendation" component={CourseRecommendationScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="Mission" component={MissionScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
    </Stack.Navigator>
  );
}

// 탭 네비게이터
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Trips"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false, // 직접 label 렌더링
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: 80,
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: 10,
          paddingTop: 14,
        },
        tabBarLabelStyle: {
          fontFamily: 'NeoDunggeunmoPro-Regular',
          fontSize: 10,
          color: '#000000',
        },
        tabBarIcon: ({ focused, color, size }) => {
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
      <Tab.Screen 
        name="Map" 
        component={MapStack} 
        options={{
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontSize: 14, marginBottom: 4 }}>
              Map
            </Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Trips" 
        component={TripsScreen} 
        options={{
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontSize: 14, marginBottom: 4 }}>
              Trips
            </Text>
          ),
        }}
      />
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarLabel: ({ color, focused }) => (
          <Text style={{ color, fontSize: 14, marginBottom: 4 }}>
            Home
          </Text>
        ),
      }}
    />
      <Tab.Screen 
        name="Gallery" 
        component={GalleryScreen} 
        options={{
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontSize: 14, marginBottom: 4 }}>
              Gallery
            </Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={LoginScreen} 
        options={{
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontSize: 14, marginBottom: 4 }}>
              Profile
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function TabBarIconWithLabel({ name, label, focused }: { name: string; label: string; focused: boolean }) {
  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 56,
      flexDirection: 'column',
    }}>
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
        ellipsizeMode='tail'
      >
        {label}
      </Text>
    </View>
  );
}

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
    // 로딩 상태
    return null;
  }

  if (!isOnboardingComplete) {
    // 온보딩 화면 표시
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Main" component={MainTabNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // 메인 앱 표시
  return (
    <>
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>
      <FloatingChatBotButton onPress={() => setChatVisible(true)} />
      <ChatScreen visible={chatVisible} onClose={() => setChatVisible(false)} />
    </>
  );
} 
