// src/utils/auth.ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'jwt_token';

export const saveToken = async (token: string) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    console.log('✅ Token saved successfully');
  } catch (error) {
    console.error('❌ Failed to save token:', error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('❌ Failed to get token:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    console.log('✅ Token removed');
  } catch (error) {
    console.error('❌ Failed to remove token:', error);
  }
};