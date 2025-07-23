import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import TripsScreen from './src/screens/TripsScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
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
            else if (route.name === 'Gallary') iconName = 'image-outline';
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
        <Tab.Screen name="Gallary" component={GalleryScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
} 
