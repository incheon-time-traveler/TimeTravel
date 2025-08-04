import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import TripsScreen from './src/screens/TripsScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import LoginSuccessScreen from './src/screens/LoginSuccessScreen';
import SignupScreen from './src/screens/SignupScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import { RootStackParamList, RootTabParamList } from './src/types/navigation';

const linking = {
  prefixes: ['http://localhost:5173', 'timetravel://'],
  config: {
    screens: {
      LoginSuccess: 'login-success',
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Trips"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontWeight: route.name === 'Trips' ? 'bold' : 'normal',
          fontSize: 14,
          marginBottom: 4,
        },
        tabBarStyle: {
          height: 80,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          let iconColor = focused ? '#000' : '#bbb';
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Map') iconName = 'location-outline';
          else if (route.name === 'Trips') iconName = 'bookmark-outline';
          else if (route.name === 'Gallery') iconName = 'image-outline';
          else if (route.name === 'Profile') iconName = 'person-outline';
          return <Ionicons name={iconName} size={28} color={iconColor} />;
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#bbb',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Trips" component={TripsScreen} />
      <Tab.Screen name="Gallery" component={GalleryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}



export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(true);
  const [viewedOnboarding, setViewedOnboarding] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const viewed = await AsyncStorage.getItem('@viewedOnboarding');
        if (token) {
          setIsLoggedIn(true);
        }
        if (viewed) {
          setViewedOnboarding(true);
        }
      } catch (error) {
        console.log('Error checking auth/onboarding status: ', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndOnboarding();
  }, []);

  

  // Show loading screen for 1.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || showLoading) {
    return <LoadingScreen />;
  }

  if (!viewedOnboarding) {
    return <OnboardingScreen />;
  }

  return (
    <NavigationContainer linking={linking} fallback={<ActivityIndicator color="blue" size="large" />}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <>
            {!viewedOnboarding && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          </>
        )}
        <Stack.Screen name="LoginSuccess" component={LoginSuccessScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
