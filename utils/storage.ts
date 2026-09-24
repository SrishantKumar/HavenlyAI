import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Simple in-memory fallback for web/non-supported environments
const webLocalStorageFallback = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('Storage warning: localStorage not available', e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('Storage warning: localStorage write failed', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('Storage warning: localStorage remove failed', e);
    }
  },
};

export const storage = {
  async setSecureItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      webLocalStorageFallback.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`SecureStore error setting key ${key}:`, error);
      // Fallback in case of failure on dev builds without native backing
      webLocalStorageFallback.setItem(key, value);
    }
  },

  async getSecureItem(key: string): Promise<string | null> {
    if (isWeb) {
      return webLocalStorageFallback.getItem(key);
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`SecureStore error getting key ${key}:`, error);
      return webLocalStorageFallback.getItem(key);
    }
  },

  async deleteSecureItem(key: string): Promise<void> {
    if (isWeb) {
      webLocalStorageFallback.removeItem(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`SecureStore error deleting key ${key}:`, error);
      webLocalStorageFallback.removeItem(key);
    }
  },

  // Non-sensitive settings persistence (cross-platform local storage)
  setItem(key: string, value: string): void {
    webLocalStorageFallback.setItem(key, value);
  },

  getItem(key: string): string | null {
    return webLocalStorageFallback.getItem(key);
  },

  removeItem(key: string): void {
    webLocalStorageFallback.removeItem(key);
  },
};

export const supabaseStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return await storage.getSecureItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await storage.setSecureItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await storage.deleteSecureItem(key);
  },
};

