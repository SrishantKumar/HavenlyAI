export type QuestSense = 'sight' | 'sound' | 'touch' | 'smell' | 'taste' | 'mixed';
export type QuestDifficulty = 'easy' | 'medium';

export interface Quest {
  id: string;
  title: string;
  prompt: string;
  slots: number;
  sense: QuestSense;
  xp: number;
  difficulty: QuestDifficulty;
  estimatedSeconds: number;
  stepPrompts?: string[]; // Custom prompt per slot (e.g. for 5-4-3-2-1)
  helperHint?: string;
}

export interface QuestBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category?: 'streak' | 'quest' | 'level' | 'special';
}

export interface QuestHistoryEntry {
  id: string;
  questId: string;
  questTitle: string;
  completedAt: string;
  answers: string[];
  xpEarned: number;
  usedVoice: boolean;
  followUpTurn?: {
    havenPrompt: string;
    userReply?: string;
  };
}

export interface QuestProgressState {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  lastQuestDate: string | null;
  completedQuestIds: string[];
  unlockedBadgeIds: string[];
  history: QuestHistoryEntry[];
}

