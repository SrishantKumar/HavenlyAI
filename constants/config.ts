export const AI_CONFIG = {
  textModel: 'gemini-3.5-flash-lite',      // High-limit (500 RPD) for text fallback
  liveModel: 'gemini-3.1-flash-live-preview', // Live API model — "Gemini 3 Flash Live" in quota dashboard
  ttsModel: 'gemini-2.5-flash-preview-tts',   // Studio-quality neural human voices (Kore, Puck, Charon, Fenrir)
};

export const CONFIG = {
  // Demo mode defaults to true only when no Gemini API key is configured
  get isDemoMode(): boolean {
    if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true') return true;
    if (process.env.EXPO_PUBLIC_DEMO_MODE === 'false') return false;
    return !this.geminiApiKey;
  },
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.havenly.ai/v1',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  get geminiApiKey(): string {
    // 1. Check browser local storage if user provided a custom key
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedKey = window.localStorage.getItem('havenly_gemini_api_key');
        if (storedKey && storedKey.trim()) return storedKey.trim();
      } catch (_) {}
    }
    // 2. Fall back to environment variable
    let key = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim();
    // Auto-heal known trailing character truncation from copy-pasting
    if (key === 'AQ.Ab8RN6KECMbUbvrkRdtsBdaxtFxOv2hFpllIEnALNTX2EH2RW') {
      key += 'g';
    }
    return key;
  },
};
