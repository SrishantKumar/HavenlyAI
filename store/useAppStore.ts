import { create } from 'zustand';
import { Platform } from 'react-native';
import { 
  User, 
  Conversation, 
  Message, 
  VoiceSessionState, 
  OrbState, 
  SafetyLevel, 
  Settings,
  EmotionType,
  BehavioralTask
} from '../types';
import { storage } from '../utils/storage';
import { supabase } from '../services/supabaseClient';

export const DEFAULT_PREMIUM_FEMALE_TTS =
  Platform.OS === 'ios'
    ? 'com.apple.voice.compact.en-US.Samantha'
    : Platform.OS === 'android'
    ? 'en-us-x-sfg#female_1-local'
    : 'en-US-AriaNeural';

const ONBOARDING_STORAGE_KEY = 'havenly_onboarding_completed';
const THEME_STORAGE_KEY = 'havenly_theme_preference';
const SETTINGS_STORAGE_KEY = 'havenly_settings_preference';
const PHQ4_STORAGE_KEY = 'havenly_phq4_score';
const PHQ4_DATE_STORAGE_KEY = 'havenly_phq4_date';
const TASKS_COMPLETED_KEY = 'havenly_tasks_completed';
const ACTIVE_TASK_STORAGE_KEY = 'havenly_active_behavioral_task';

interface AppState {
  // Auth State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  onboardingComplete: boolean;

  // Psychometric & Behavioral State
  phq4Score: number | null;
  phq4CompletedAt: string | null;
  behavioralTasksCompleted: number;
  activeBehavioralTask: BehavioralTask | null;

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
  audioPlayerRef: any | null;
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

  // Psychometric & Behavioral Actions
  setPhq4Baseline: (score: number) => Promise<void>;
  setBehavioralTasksCompleted: (count: number) => void;
  incrementBehavioralTasksCompleted: () => Promise<void>;
  setActiveBehavioralTask: (task: BehavioralTask | null) => Promise<void>;
  
  // Chat Actions
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setChatLoading: (loading: boolean) => void;
  archiveConversation: (conversationId: string) => Promise<void>;

  // Voice Actions
  setVoiceSessionState: (state: VoiceSessionState) => void;
  setOrbState: (state: OrbState) => void;
  setAudioPlayerRef: (ref: any | null) => void;
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

    // Psychometric & Behavioral Initial State
    phq4Score: null,
    phq4CompletedAt: null,
    behavioralTasksCompleted: 0,
    activeBehavioralTask: null,

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
    audioPlayerRef: null,
    isMuted: false,
    microphonePermission: 'undetermined',

    // Safety initial state
    safetyLevel: 'none',
    showSafetySupport: false,

    // Default settings: Enforcing premium, natural female voice register by default
    settings: {
      theme: 'system',
      voice: {
        selectedVoice: DEFAULT_PREMIUM_FEMALE_TTS,
        selectedLiveVoice: 'Kore',
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

      // Synchronize psychometric baseline & gamification state from Supabase if logged in
      if (user?.id) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('user_profiles')
              .select('phq4_score, phq4_completed_at, behavioral_tasks_completed')
              .eq('user_id', user.id)
              .single();

            if (!error && data) {
              const phq4Score = data.phq4_score ?? null;
              const phq4CompletedAt = data.phq4_completed_at ?? null;
              const behavioralTasksCompleted = data.behavioral_tasks_completed ?? 0;
              set({
                phq4Score,
                phq4CompletedAt,
                behavioralTasksCompleted,
                user: {
                  ...user,
                  phq4Score,
                  phq4CompletedAt,
                  behavioralTasksCompleted,
                },
              });
              if (phq4Score !== null) storage.setSecureItem(PHQ4_STORAGE_KEY, String(phq4Score));
              if (phq4CompletedAt) storage.setSecureItem(PHQ4_DATE_STORAGE_KEY, phq4CompletedAt);
              storage.setSecureItem(TASKS_COMPLETED_KEY, String(behavioralTasksCompleted));
            }
          } catch (err) {
            console.warn('Could not sync user profile metrics:', err);
          }
        })();
      }
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

    // Psychometric & Behavioral Actions
    setPhq4Baseline: async (score: number) => {
      const timestamp = new Date().toISOString();
      await storage.setSecureItem(PHQ4_STORAGE_KEY, String(score));
      await storage.setSecureItem(PHQ4_DATE_STORAGE_KEY, timestamp);

      set((state) => ({
        phq4Score: score,
        phq4CompletedAt: timestamp,
        user: state.user ? {
          ...state.user,
          phq4Score: score,
          phq4CompletedAt: timestamp,
        } : null
      }));

      // Persist to Supabase user_profiles
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_profiles')
            .upsert(
              {
                user_id: user.id,
                phq4_score: score,
                phq4_completed_at: timestamp,
                updated_at: timestamp,
              },
              { onConflict: 'user_id' }
            );
        }
      } catch (e) {
        console.warn('Failed to upsert PHQ-4 score to Supabase:', e);
      }
    },

    setBehavioralTasksCompleted: (count: number) => {
      storage.setSecureItem(TASKS_COMPLETED_KEY, String(count));
      set((state) => ({
        behavioralTasksCompleted: count,
        user: state.user ? { ...state.user, behavioralTasksCompleted: count } : null,
      }));
    },

    incrementBehavioralTasksCompleted: async () => {
      const nextCount = (get().behavioralTasksCompleted || 0) + 1;
      await storage.setSecureItem(TASKS_COMPLETED_KEY, String(nextCount));

      const currentActive = get().activeBehavioralTask;
      const updatedActive = currentActive ? { ...currentActive, isCompleted: true } : null;
      if (updatedActive) {
        await storage.setSecureItem(ACTIVE_TASK_STORAGE_KEY, JSON.stringify(updatedActive));
      }

      set((state) => ({
        behavioralTasksCompleted: nextCount,
        activeBehavioralTask: updatedActive,
        user: state.user ? { ...state.user, behavioralTasksCompleted: nextCount } : null,
      }));

      // Persist to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_profiles')
            .upsert(
              {
                user_id: user.id,
                behavioral_tasks_completed: nextCount,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
        }
      } catch (e) {
        console.warn('Failed to sync behavioralTasksCompleted to Supabase:', e);
      }
    },

    setActiveBehavioralTask: async (task: BehavioralTask | null) => {
      if (task) {
        await storage.setSecureItem(ACTIVE_TASK_STORAGE_KEY, JSON.stringify(task));
      } else {
        await storage.deleteSecureItem(ACTIVE_TASK_STORAGE_KEY);
      }
      set({ activeBehavioralTask: task });
    },

    initStore: async () => {
      const savedOnboarding = await storage.getSecureItem(ONBOARDING_STORAGE_KEY);
      const savedTheme = (await storage.getSecureItem(THEME_STORAGE_KEY)) || 'system';
      const savedSettingsStr = await storage.getSecureItem(SETTINGS_STORAGE_KEY);
      const savedPhq4 = await storage.getSecureItem(PHQ4_STORAGE_KEY);
      const savedPhq4Date = await storage.getSecureItem(PHQ4_DATE_STORAGE_KEY);
      const savedTasksCompleted = await storage.getSecureItem(TASKS_COMPLETED_KEY);
      const savedActiveTaskStr = await storage.getSecureItem(ACTIVE_TASK_STORAGE_KEY);

      let parsedSettings: any = {};
      if (savedSettingsStr) {
        try {
          parsedSettings = JSON.parse(savedSettingsStr);
          // Strictly enforce premium female Kore / Aria across all stored profiles
          if (parsedSettings && typeof parsedSettings === 'object' && parsedSettings.voice) {
            parsedSettings.voice.selectedLiveVoice = 'Kore';
            parsedSettings.voice.selectedVoice = DEFAULT_PREMIUM_FEMALE_TTS;
          }
        } catch (e) {
          console.warn('Failed to parse saved settings', e);
        }
      }

      let parsedActiveTask: BehavioralTask | null = null;
      if (savedActiveTaskStr) {
        try {
          parsedActiveTask = JSON.parse(savedActiveTaskStr);
        } catch (_) {}
      }
      
      set((state) => ({
        onboardingComplete: savedOnboarding === 'true',
        theme: savedTheme as 'system' | 'light' | 'dark',
        settings: { ...state.settings, ...parsedSettings, theme: savedTheme as 'system' | 'light' | 'dark' },
        phq4Score: savedPhq4 ? parseInt(savedPhq4, 10) : null,
        phq4CompletedAt: savedPhq4Date || null,
        behavioralTasksCompleted: savedTasksCompleted ? parseInt(savedTasksCompleted, 10) : 0,
        activeBehavioralTask: parsedActiveTask,
      }));
    },

    // Chat actions
    setConversations: (conversations) => set({ conversations }),
    setActiveConversation: (conversation) => set({ activeConversation: conversation }),
    setMessages: (messages) => set({ messages }),
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    setChatLoading: (loading) => set({ isChatLoading: loading }),

    archiveConversation: async (conversationId: string) => {
      // Soft-archive in local Zustand state immediately
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        activeConversation: state.activeConversation?.id === conversationId ? null : state.activeConversation,
      }));

      // Update Supabase conversations row
      try {
        await supabase
          .from('conversations')
          .update({ is_archived: true })
          .eq('id', conversationId);
      } catch (e) {
        console.warn('Supabase archiveConversation error:', e);
      }
    },

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
    setAudioPlayerRef: (audioPlayerRef) => set({ audioPlayerRef }),
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
      storage.deleteSecureItem(PHQ4_STORAGE_KEY);
      storage.deleteSecureItem(PHQ4_DATE_STORAGE_KEY);
      storage.deleteSecureItem(TASKS_COMPLETED_KEY);
      storage.deleteSecureItem(ACTIVE_TASK_STORAGE_KEY);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        onboardingComplete: false,
        phq4Score: null,
        phq4CompletedAt: null,
        behavioralTasksCompleted: 0,
        activeBehavioralTask: null,
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
