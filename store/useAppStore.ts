import { create } from 'zustand';
import { 
  User, 
  Conversation, 
  Message, 
  VoiceSessionState, 
  OrbState, 
  SafetyLevel, 
  Settings,
  EmotionType
} from '../types';
import { storage } from '../utils/storage';

const ONBOARDING_STORAGE_KEY = 'havenly_onboarding_completed';
const THEME_STORAGE_KEY = 'havenly_theme_preference';
const SETTINGS_STORAGE_KEY = 'havenly_settings_preference';

interface AppState {
  // Auth State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  onboardingComplete: boolean;

  // Theme & Layout
  theme: 'system' | 'light' | 'dark';

  // Chat/History State
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isChatLoading: boolean;

  // Voice Session (Live / In-app realtime voice) State
  voiceSessionState: VoiceSessionState;
  orbState: OrbState;
  isMuted: boolean;
  microphonePermission: 'undetermined' | 'granted' | 'denied' | 'permanently_denied';

  // Safety State
  safetyLevel: SafetyLevel;
  showSafetySupport: boolean;

  // Settings
  settings: Settings;

  // Actions
  setAuth: (user: User | null, token: string | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setTheme: (theme: 'system' | 'light' | 'dark') => void;
  
  // Chat Actions
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setChatLoading: (loading: boolean) => void;

  // Voice Actions
  setVoiceSessionState: (state: VoiceSessionState) => void;
  setOrbState: (state: OrbState) => void;
  setIsMuted: (muted: boolean) => void;
  setMicrophonePermission: (status: AppState['microphonePermission']) => void;

  // Safety Actions
  setSafetyLevel: (level: SafetyLevel) => void;
  setShowSafetySupport: (show: boolean) => void;
  
  // Settings Actions
  updateSettings: (settings: Partial<Settings>) => void;
  resetAllData: () => void;
  initStore: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => {
  return {
    // Auth initial state
    user: null,
    token: null,
    isAuthenticated: false,
    isAuthLoading: true,
    onboardingComplete: false,

    // Theme initial state
    theme: 'system',

    // Chat initial state
    conversations: [],
    activeConversation: null,
    messages: [],
    isChatLoading: false,

    // Voice initial state
    voiceSessionState: 'idle',
    orbState: 'idle',
    isMuted: false,
    microphonePermission: 'undetermined',

    // Safety initial state
    safetyLevel: 'none',
    showSafetySupport: false,

    // Default settings
    settings: {
      theme: 'system',
      voice: {
        selectedVoice: 'default',
        selectedLiveVoice: 'Puck',
        autoplay: true,
        playbackSpeed: 1.0,
      },
      notifications: {
        callNotifications: true,
        reminders: true,
      },
      privacy: {
        historyEnabled: true,
        analyticsEnabled: false,
      },
      safety: {
        groundingVoiceGuides: true,
        crisisResourceInfo: true,
      },
    },

    // Auth actions
    setAuth: (user, token) => {
      set({ 
        user, 
        token, 
        isAuthenticated: !!user,
        isAuthLoading: false 
      });
    },
    setAuthLoading: (loading) => set({ isAuthLoading: loading }),
    setOnboardingComplete: (complete) => {
      storage.setSecureItem(ONBOARDING_STORAGE_KEY, complete ? 'true' : 'false');
      set({ onboardingComplete: complete });
    },
    setTheme: (theme) => {
      storage.setSecureItem(THEME_STORAGE_KEY, theme);
      set((state) => ({ 
        theme,
        settings: { ...state.settings, theme }
      }));
    },
    initStore: async () => {
      const savedOnboarding = await storage.getSecureItem(ONBOARDING_STORAGE_KEY);
      const savedTheme = (await storage.getSecureItem(THEME_STORAGE_KEY)) || 'system';
      const savedSettingsStr = await storage.getSecureItem(SETTINGS_STORAGE_KEY);
      let parsedSettings = {};
      if (savedSettingsStr) {
        try {
          parsedSettings = JSON.parse(savedSettingsStr);
        } catch (e) {
          console.warn('Failed to parse saved settings', e);
        }
      }
      
      set((state) => ({
        onboardingComplete: savedOnboarding === 'true',
        theme: savedTheme as 'system' | 'light' | 'dark',
        settings: { ...state.settings, ...parsedSettings, theme: savedTheme as 'system' | 'light' | 'dark' }
      }));
    },

    // Chat actions
    setConversations: (conversations) => set({ conversations }),
    setActiveConversation: (conversation) => set({ activeConversation: conversation }),
    setMessages: (messages) => set({ messages }),
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    setChatLoading: (loading) => set({ isChatLoading: loading }),

    // Voice actions
    setVoiceSessionState: (state) => {
      // Map voice session state directly to orb state changes for responsive brand design
      let nextOrbState: OrbState = 'idle';
      if (state === 'listening') nextOrbState = 'listening';
      else if (state === 'thinking') nextOrbState = 'thinking';
      else if (state === 'speaking') nextOrbState = 'speaking';
      else if (state === 'error') nextOrbState = 'error';

      set({ 
        voiceSessionState: state,
        orbState: nextOrbState === 'idle' && get().voiceSessionState === 'connected' ? 'idle' : nextOrbState
      });
    },
    setOrbState: (orbState) => set({ orbState }),
    setIsMuted: (isMuted) => set({ isMuted }),
    setMicrophonePermission: (microphonePermission) => set({ microphonePermission }),

    // Safety actions
    setSafetyLevel: (safetyLevel) => set({ safetyLevel }),
    setShowSafetySupport: (showSafetySupport) => set({ showSafetySupport }),

    // Settings actions
    updateSettings: (newSettings) => set((state) => {
      const updatedSettings = { ...state.settings, ...newSettings };
      storage.setSecureItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
      return { settings: updatedSettings };
    }),

    // Clear active states
    resetAllData: () => {
      storage.deleteSecureItem(ONBOARDING_STORAGE_KEY);
      storage.deleteSecureItem(THEME_STORAGE_KEY);
      storage.deleteSecureItem(SETTINGS_STORAGE_KEY);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        onboardingComplete: false,
        conversations: [],
        activeConversation: null,
        messages: [],
        voiceSessionState: 'idle',
        orbState: 'idle',
        safetyLevel: 'none',
        showSafetySupport: false,
        theme: 'system',
      });
    },
  };
});
