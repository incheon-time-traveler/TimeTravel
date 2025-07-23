import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function TripsScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="bookmark-outline" size={48} color="#000" />
      <Text style={styles.text}>Trips</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 24, color: '#000', marginTop: 8, fontWeight: 'bold' },
}); 