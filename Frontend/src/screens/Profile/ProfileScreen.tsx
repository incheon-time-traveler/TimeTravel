import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import LoginScreen from '../Auth/LoginScreen';
import SignupScreen from '../Auth/SignupScreen';
import ProfileSetupScreen from '../Auth/ProfileSetupScreen';

const Stack = createNativeStackNavigator();

export default function ProfileScreen() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
} 