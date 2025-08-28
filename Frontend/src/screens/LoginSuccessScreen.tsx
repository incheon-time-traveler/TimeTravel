import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginSuccessScreen = ({ route, navigation }: any) => {
  const { access } = route.params;

  useEffect(() => {
    const storeTokenAndNavigate = async () => {
      if (access) {
        try {
          await AsyncStorage.setItem('accessToken', access);
          // Reset navigation stack to MainTabs, so user can't go back to login flow
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        } catch (error) {
          console.error('Failed to save access token', error);
          // Handle error, maybe navigate to a login failure screen
          navigation.navigate('Signup');
        }
      } else {
        // Handle case where access token is not present
        navigation.navigate('Signup');
      }
    };

    storeTokenAndNavigate();
  }, [access, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginSuccessScreen;
