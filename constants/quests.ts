import { Quest, QuestBadge } from '../types/quest';

export const SEED_QUESTS: Quest[] = [
  {
    id: 'five-things-sight',
    title: 'Five Things',
    prompt: 'Look around you slowly and notice 5 things you can see right now.',
    slots: 5,
    sense: 'sight',
    xp: 25,
    difficulty: 'easy',
    estimatedSeconds: 90,
    helperHint: 'Notice colors, shapes, light reflections, or textures.',
  },
  {
    id: 'listen-closely-sound',
    title: 'Listen Closely',
    prompt: 'Close your eyes for a moment. Name 3 distinct sounds you can hear.',
    slots: 3,
    sense: 'sound',
    xp: 20,
    difficulty: 'easy',
    estimatedSeconds: 60,
    helperHint: 'The hum of an appliance, a bird outside, or your own breath.',
  },
  {
    id: 'feel-it-touch',
    title: 'Feel It',
    prompt: 'Notice your physical environment. Name 4 things you can feel with your hands or body.',
    slots: 4,
    sense: 'touch',
    xp: 25,
    difficulty: 'easy',
    estimatedSeconds: 90,
    helperHint: 'The fabric of your clothes, the floor beneath your feet, or cool air.',
  },
  {
    id: 'one-good-thing',
    title: 'One Good Thing',
    prompt: 'Bring to mind one small, comforting thing in your present moment.',
    slots: 1,
    sense: 'mixed',
    xp: 15,
    difficulty: 'easy',
    estimatedSeconds: 45,
    helperHint: 'A warm sip of tea, a soft blanket, or taking this quiet pause.',
  },
  {
    id: 'sensory-54321-countdown',
    title: '5-4-3-2-1 Grounding',
    prompt: 'A complete sensory circuit to anchor yourself firmly in the here and now.',
    slots: 5,
    sense: 'mixed',
    xp: 50,
    difficulty: 'medium',
    estimatedSeconds: 150,
    stepPrompts: [
      'Step 1: Name 5 things you see around you',
      'Step 2: Name 4 things you can physically feel',
      'Step 3: Name 3 sounds you can hear',
      'Step 4: Name 2 scents you can smell or enjoy',
      'Step 5: Name 1 taste or something you appreciate right now',
    ],
    helperHint: 'Move gently through your senses one step at a time.',
  },
  {
    id: 'scents-and-breathing',
    title: 'Calming Scents',
    prompt: 'Take a slow, deep breath in through your nose. What are 2 scents around you?',
    slots: 2,
    sense: 'smell',
    xp: 15,
    difficulty: 'easy',
    estimatedSeconds: 60,
    helperHint: 'Fresh air, coffee, wood, hand lotion, or rain.',
  },
  {
    id: 'colors-nearby',
    title: 'Color Palette',
    prompt: 'Scan your space and name 4 items that each have a completely different color.',
    slots: 4,
    sense: 'sight',
    xp: 20,
    difficulty: 'easy',
    estimatedSeconds: 75,
    helperHint: 'Find something red, blue, green, and gold or white.',
  },
  {
    id: 'taste-the-present',
    title: 'Mindful Taste',
    prompt: 'Bring your awareness inside your mouth. Name 2 sensations or tastes you notice.',
    slots: 2,
    sense: 'taste',
    xp: 15,
    difficulty: 'easy',
    estimatedSeconds: 60,
    helperHint: 'A lingering hint of mint, water, tea, or pure neutrality.',
  },
];

export const BADGES: QuestBadge[] = [
  {
    id: 'first_grounding',
    name: 'First Grounding',
    description: 'Completed your very first grounding quest with Haven.',
    icon: '🌱',
    category: 'quest',
  },
  {
    id: 'streak_3',
    name: '3-Day Streak',
    description: 'Grounding practiced 3 days in a row.',
    icon: '🔥',
    category: 'streak',
  },
  {
    id: 'streak_7',
    name: '7-Day Streak',
    description: '7 consecutive days of steady mindfulness.',
    icon: '✨',
    category: 'streak',
  },
  {
    id: 'five_senses',
    name: 'Five Senses',
    description: 'Completed the full 5-4-3-2-1 sensory grounding circuit.',
    icon: '🌸',
    category: 'quest',
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Found your calm after 10:00 PM.',
    icon: '🌙',
    category: 'special',
  },
  {
    id: 'voice_explorer',
    name: 'Voice Explorer',
    description: 'Spoke your grounding thoughts aloud with Haven.',
    icon: '🎙️',
    category: 'special',
  },
  {
    id: 'level_5',
    name: 'Level 5',
    description: 'Deepened your sanctuary and reached Level 5.',
    icon: '🔮',
    category: 'level',
  },
];

/**
 * Deterministically picks today's quest based on the local calendar date.
 * Every user gets the same rotating quest on the same day.
 */
export function getTodaysQuest(date: Date = new Date()): Quest {
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0)) /
      (24 * 60 * 60 * 1000)
  );
  const index = Math.abs(dayOfYear) % SEED_QUESTS.length;
  return SEED_QUESTS[index];
}

/**
 * Returns all quests with Today's quest first followed by the rest.
 */
export function getAvailableQuests(date: Date = new Date()): { todaysQuest: Quest; moreQuests: Quest[] } {
  const todaysQuest = getTodaysQuest(date);
  const moreQuests = SEED_QUESTS.filter((q) => q.id !== todaysQuest.id);
  return { todaysQuest, moreQuests };
}

export function getQuestById(id: string): Quest | undefined {
  return SEED_QUESTS.find((q) => q.id === id);
}

