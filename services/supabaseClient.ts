import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../constants/config';
import { supabaseStorage } from '../utils/storage';

if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
  console.warn('Supabase credentials missing from configuration settings.');
}

export const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
  auth: {
    storage: supabaseStorage as any,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
