import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './database';
import { api } from './api';

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@auth_user';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function storeUser(user: any): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function login(email: string, password: string): Promise<{ token: string; user: any }> {
  const { data } = await api.post('/auth/login', { email, password });
  const { token, user } = data;
  await setToken(token);
  await storeUser(user);
  return { token, user };
}

export async function register(userData: any): Promise<{ token: string; user: any }> {
  const { data } = await api.post('/auth/register', userData);
  const { token, user } = data;
  await setToken(token);
  await storeUser(user);
  return { token, user };
}

export async function logout(): Promise<void> {
  await removeToken();
  await AsyncStorage.removeItem(USER_KEY);
}

export async function getMe(): Promise<any> {
  const { data } = await api.get('/auth/me');
  return data;
}
