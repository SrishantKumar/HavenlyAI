export const AI_CONFIG = {
  textModel: 'gemini-3.5-flash-lite',      // High-limit (500 RPD) for text fallback
  liveModel: 'gemini-3.1-flash-live-preview', // Live API model — "Gemini 3 Flash Live" in quota dashboard
  ttsModel: 'tts-1',
};

export const CONFIG = {
  // If undefined, default to true for standalone/demo usage
  isDemoMode: process.env.EXPO_PUBLIC_DEMO_MODE !== 'false',
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.havenly.ai/v1',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
};
