import { Conversation, Message, User } from '../types';

export const MOCK_USER: User = {
  id: 'usr_001',
  name: 'Sarah',
  email: 'sarah@havenly.ai',
  phoneNumber: '+919876544821',
  avatarUrl: undefined,
  createdAt: '2026-08-15T12:00:00Z',
};

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_001',
    title: 'Late night anxious thoughts',
    createdAt: '2026-08-19T22:30:00Z',
    updatedAt: '2026-08-19T22:45:00Z',
    type: 'text',
    lastMessageText: "If you want, tell me what has been taking up the most space in your mind lately.",
  },
  {
    id: 'conv_002',
    title: 'Work stress & feeling drained',
    createdAt: '2026-08-18T14:15:00Z',
    updatedAt: '2026-08-18T14:30:00Z',
    type: 'voice',
    lastMessageText: 'Voice message sent to HavenlyAI',
  },
  {
    id: 'conv_003',
    title: 'Just needed someone to listen',
    createdAt: '2026-08-17T09:00:00Z',
    updatedAt: '2026-08-17T09:40:00Z',
    type: 'live',
    lastMessageText: 'Live Voice Conversation · 12 mins',
  },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  conv_001: [
    {
      id: 'm1_1',
      conversationId: 'conv_001',
      role: 'user',
      content: "I've been feeling overwhelmed lately and I don't really know why.",
      timestamp: '2026-08-19T22:30:00Z',
      messageType: 'text',
    },
    {
      id: 'm1_2',
      conversationId: 'conv_001',
      role: 'assistant',
      content: "That sounds like a lot to carry. You don't need to figure everything out at once. If you want, tell me what has been taking up the most space in your mind lately.",
      timestamp: '2026-08-19T22:31:00Z',
      messageType: 'text',
    },
  ],
  conv_002: [
    {
      id: 'm2_1',
      conversationId: 'conv_002',
      role: 'user',
      content: 'Recorded audio note',
      timestamp: '2026-08-18T14:15:00Z',
      messageType: 'voice',
      audioUrl: 'mock-user-audio-url-1.mp3',
      duration: 18,
    },
    {
      id: 'm2_2',
      conversationId: 'conv_002',
      role: 'assistant',
      content: "It sounds like you're putting a lot of pressure on yourself to handle everything perfectly. Let's take a breath together. You don't have to carry all of this alone today.",
      timestamp: '2026-08-18T14:17:00Z',
      messageType: 'text',
    },
  ],
  conv_003: [
    {
      id: 'm3_1',
      conversationId: 'conv_003',
      role: 'system',
      content: 'Live voice session started',
      timestamp: '2026-08-17T09:00:00Z',
      messageType: 'system',
    },
    {
      id: 'm3_2',
      conversationId: 'conv_003',
      role: 'user',
      content: 'I spent the voice session talking through family conflicts.',
      timestamp: '2026-08-17T09:40:00Z',
      messageType: 'text',
    },
  ],
};

// Realistic mock response sentences based on emotional trigger words (used by local mock service)
export const SUPPORTIVE_RESPONSES = [
  "I'm here to listen. Take all the time you need to put it into words.",
  "That sounds heavy. Remember you don't have to carry everything by yourself.",
  "It's completely okay to not know what you're feeling right now. We can just take it one step at a time.",
  "That makes sense why you'd feel that way. It's a lot to process.",
  "Thank you for sharing that with me. I'm right here with you.",
  "It sounds like you've been holding onto this for a while. Let it out at your own pace.",
];

export const CRISIS_HOTLINES = [
  {
    name: 'National Suicide Prevention Lifeline (US)',
    number: '988',
    description: 'Free, confidential 24/7 support. Call or text 988.',
  },
  {
    name: 'Crisis Text Line',
    number: 'Text HOME to 741741',
    description: 'Free 24/7 crisis support via text.',
  },
  {
    name: 'The Trevor Project (LGBTQ+)',
    number: '1-866-488-7386',
    description: 'Call or text START to 678-678.',
  },
  {
    name: 'International Emergency Resources',
    number: '112 / 911 / 999',
    description: 'Please contact your local police, medical emergency, or hotlines immediately.',
  },
];
