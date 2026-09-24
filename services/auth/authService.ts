import { User } from '../../types';
import { CONFIG } from '../../constants/config';
import { MOCK_USER } from '../../constants/mockData';
import { storage } from '../../utils/storage';
import { supabase } from '../supabaseClient';

const TOKEN_KEY = 'havenly_auth_token';

export const authService = {
  /**
   * Recovers active session token and user profile
   */
  async getCurrentSession(): Promise<{ user: User; token: string } | null> {
    if (CONFIG.isDemoMode) {
      const token = await storage.getSecureItem(TOKEN_KEY);
      if (!token) return null;
      return { user: MOCK_USER, token: 'mock-session-token' };
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;

      const user: User = {
        id: session.user.id,
        name: session.user.user_metadata?.name || 'User',
        email: session.user.email || '',
        createdAt: session.user.created_at,
      };

      return { user, token: session.access_token };
    } catch (e) {
      console.error('Supabase Session recovery failed:', e);
      return null;
    }
  },

  /**
   * Authenticates user with email and password
   */
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    if (CONFIG.isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const user = { ...MOCK_USER, email };
      await storage.setSecureItem(TOKEN_KEY, 'mock-session-token');
      return { user, token: 'mock-session-token' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Authentication failed');
    }

    const user: User = {
      id: data.user.id,
      name: data.user.user_metadata?.name || 'User',
      email: data.user.email || '',
      createdAt: data.user.created_at,
    };

    return { user, token: data.session?.access_token || '' };
  },

  /**
   * Registers a new user
   */
  async signup(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    if (CONFIG.isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const user: User = {
        id: `usr_${Math.random().toString(36).substr(2, 9)}`,
        name,
        email,
        createdAt: new Date().toISOString(),
      };
      await storage.setSecureItem(TOKEN_KEY, 'mock-session-token');
      return { user, token: 'mock-session-token' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Registration failed');
    }

    const user: User = {
      id: data.user.id,
      name,
      email: data.user.email || '',
      createdAt: data.user.created_at,
    };

    return { user, token: data.session?.access_token || '' };
  },

  /**
   * Resets password
   */
  async forgotPassword(email: string): Promise<void> {
    if (CONFIG.isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      throw new Error(error.message || 'Password reset request failed');
    }
  },

  /**
   * Terminates session and logs out
   */
  async logout(): Promise<void> {
    if (CONFIG.isDemoMode) {
      await storage.deleteSecureItem(TOKEN_KEY);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('Supabase logout issue:', error.message);
    }
  },
};
