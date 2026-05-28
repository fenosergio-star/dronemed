import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from './src/services/database';
import { startAutoSync, stopAutoSync } from './src/services/sync';
import HomeScreen from './src/screens/HomeScreen';
import NewOrderScreen from './src/screens/NewOrderScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import IncidentScreen from './src/screens/IncidentScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    initDatabase();
    startAutoSync(30000);
    return () => stopAutoSync();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="NewOrder" component={NewOrderScreen} />
        <Stack.Screen name="Tracking" component={TrackingScreen} />
        <Stack.Screen name="Incident" component={IncidentScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
