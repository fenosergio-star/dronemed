import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { initDatabase } from './src/services/database';
import { startAutoSync, stopAutoSync } from './src/services/sync';
import { registerForPushNotifications } from './src/services/notifications';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import NewOrderScreen from './src/screens/NewOrderScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import IncidentScreen from './src/screens/IncidentScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="NewOrder" component={NewOrderScreen} />
      <Stack.Screen name="Tracking" component={TrackingScreen} />
      <Stack.Screen name="Incident" component={IncidentScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    initDatabase();
    startAutoSync(30000);
    registerForPushNotifications().catch(() => {});
    return () => stopAutoSync();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
