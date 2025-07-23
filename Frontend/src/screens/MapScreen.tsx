import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="location-outline" size={48} color="#bbb" />
      <Text style={styles.text}>Map</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 24, color: '#bbb', marginTop: 8 },
}); 