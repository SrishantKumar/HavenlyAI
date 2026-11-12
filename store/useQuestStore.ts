import { create } from 'zustand';
import { storage } from '../utils/storage';
import { supabase } from '../services/supabaseClient';
import { Quest, QuestHistoryEntry, QuestProgressState } from '../types/quest';

const QUEST_STORAGE_KEY = 'havenly_quest_progress_v1';

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1;
}

export function xpForLevel(level: number): number {
  const l = Math.max(1, level);
  return Math.pow(l - 1, 2) * 25;
}

export function xpForNextLevel(level: number): number {
  const l = Math.max(1, level);
  return Math.pow(l, 2) * 25;
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(d: Date = new Date()): string {
  const yesterday = new Date(d);
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
}

interface QuestStoreState extends QuestProgressState {
  isInitialized: boolean;
  newlyUnlockedBadges: string[]; // Transient for celebration modal
  initQuestStore: () => Promise<void>;
  completeQuest: (params: {
    quest: Quest;
    answers: string[];
    usedVoice: boolean;
    followUpPrompt?: string;
    userFollowUpReply?: string;
  }) => Promise<{ xpGained: number; newBadges: string[]; streak: number; level: number }>;
  clearCelebrationBadges: () => void;
  resetQuestProgress: () => Promise<void>;
}

export const useQuestStore = create<QuestStoreState>((set, get) => ({
  xp: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  lastQuestDate: null,
  completedQuestIds: [],
  unlockedBadgeIds: [],
  history: [],
  isInitialized: false,
  newlyUnlockedBadges: [],

  initQuestStore: async () => {
    try {
      const raw = await storage.getSecureItem(QUEST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          xp: parsed.xp || 0,
          level: calculateLevel(parsed.xp || 0),
          streak: parsed.streak || 0,
          longestStreak: parsed.longestStreak || 0,
          lastQuestDate: parsed.lastQuestDate || null,
          completedQuestIds: parsed.completedQuestIds || [],
          unlockedBadgeIds: parsed.unlockedBadgeIds || [],
          history: parsed.history || [],
          isInitialized: true,
        });
      } else {
        set({ isInitialized: true });
      }

      // Try background silent sync with Supabase if user is logged in
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('quest_progress')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (!error && data) {
            const remoteXp = data.xp ?? 0;
            const currentXp = get().xp;
            // Merge favoring the higher XP state
            if (remoteXp > currentXp) {
              const remoteLevel = calculateLevel(remoteXp);
              const mergedBadges = Array.from(
                new Set([...(get().unlockedBadgeIds || []), ...(data.badges || [])])
              );
              set({
                xp: remoteXp,
                level: remoteLevel,
                streak: data.streak ?? get().streak,
                longestStreak: data.longest_streak ?? get().longestStreak,
                lastQuestDate: data.last_quest_date ?? get().lastQuestDate,
                unlockedBadgeIds: mergedBadges,
              });
            }
          }
        }
      } catch (remoteErr) {
        // Silent fail-safe for offline or unconfigured Supabase
      }
    } catch (e) {
      console.warn('Failed to initialize quest store:', e);
      set({ isInitialized: true });
    }
  },

  completeQuest: async ({
    quest,
    answers,
    usedVoice,
    followUpPrompt,
    userFollowUpReply,
  }) => {
    const state = get();
    const today = getLocalDateString();
    const yesterday = getYesterdayDateString();

    // 1. Calculate streak
    let nextStreak = state.streak;
    if (state.lastQuestDate === today) {
      // Already completed today, streak preserved
      nextStreak = state.streak === 0 ? 1 : state.streak;
    } else if (state.lastQuestDate === yesterday) {
      nextStreak = state.streak + 1;
    } else {
      // Missed day or first quest -> reset to 1 softly
      nextStreak = 1;
    }

    const nextLongest = Math.max(state.longestStreak, nextStreak);
    const xpEarned = quest.xp;
    const nextXp = state.xp + xpEarned;
    const nextLevel = calculateLevel(nextXp);

    // 2. Check for newly unlocked badges
    const currentBadges = new Set(state.unlockedBadgeIds);
    const newBadges: string[] = [];

    // First Grounding
    if (!currentBadges.has('first_grounding')) {
      newBadges.push('first_grounding');
    }
    // 3-Day Streak
    if (nextStreak >= 3 && !currentBadges.has('streak_3')) {
      newBadges.push('streak_3');
    }
    // 7-Day Streak
    if (nextStreak >= 7 && !currentBadges.has('streak_7')) {
      newBadges.push('streak_7');
    }
    // Five Senses badge for 5-4-3-2-1 quest
    if (quest.id === 'sensory-54321-countdown' && !currentBadges.has('five_senses')) {
      newBadges.push('five_senses');
    }
    // Night owl: after 10 PM (22:00)
    const currentHour = new Date().getHours();
    if (currentHour >= 22 && !currentBadges.has('night_owl')) {
      newBadges.push('night_owl');
    }
    // Voice explorer
    if (usedVoice && !currentBadges.has('voice_explorer')) {
      newBadges.push('voice_explorer');
    }
    // Level 5
    if (nextLevel >= 5 && !currentBadges.has('level_5')) {
      newBadges.push('level_5');
    }

    const updatedBadges = [...state.unlockedBadgeIds, ...newBadges];
    const completedQuestIds = Array.from(new Set([...state.completedQuestIds, quest.id]));

    const historyEntry: QuestHistoryEntry = {
      id: `quest_hist_${Date.now()}`,
      questId: quest.id,
      questTitle: quest.title,
      completedAt: new Date().toISOString(),
      answers,
      xpEarned,
      usedVoice,
      followUpTurn: followUpPrompt
        ? { havenPrompt: followUpPrompt, userReply: userFollowUpReply }
        : undefined,
    };

    const nextHistory = [historyEntry, ...state.history].slice(0, 50);

    const updatedState = {
      xp: nextXp,
      level: nextLevel,
      streak: nextStreak,
      longestStreak: nextLongest,
      lastQuestDate: today,
      completedQuestIds,
      unlockedBadgeIds: updatedBadges,
      history: nextHistory,
      newlyUnlockedBadges: newBadges,
    };

    set(updatedState);

    // Persist to local storage
    try {
      await storage.setSecureItem(
        QUEST_STORAGE_KEY,
        JSON.stringify({
          xp: nextXp,
          streak: nextStreak,
          longestStreak: nextLongest,
          lastQuestDate: today,
          completedQuestIds,
          unlockedBadgeIds: updatedBadges,
          history: nextHistory,
        })
      );
    } catch (saveErr) {
      console.warn('Failed to persist quest state locally:', saveErr);
    }

    // Background silent sync to Supabase (if logged in)
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('quest_progress').upsert(
            {
              user_id: user.id,
              xp: nextXp,
              level: nextLevel,
              streak: nextStreak,
              longest_streak: nextLongest,
              last_quest_date: today,
              badges: updatedBadges,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        }
      } catch (syncErr) {
        // Silently fails without throwing
      }
    })();

    return {
      xpGained: xpEarned,
      newBadges,
      streak: nextStreak,
      level: nextLevel,
    };
  },

  clearCelebrationBadges: () => {
    set({ newlyUnlockedBadges: [] });
  },

  resetQuestProgress: async () => {
    await storage.deleteSecureItem(QUEST_STORAGE_KEY);
    set({
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
      lastQuestDate: null,
      completedQuestIds: [],
      unlockedBadgeIds: [],
      history: [],
      newlyUnlockedBadges: [],
    });
  },
}));

