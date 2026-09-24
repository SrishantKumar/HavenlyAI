export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageType = 'text' | 'voice' | 'system';

export type VoiceSessionState =
  | 'idle'
  | 'requesting'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'reconnecting'
  | 'ended'
  | 'error';

export type OrbState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export type SafetyLevel = 'none' | 'low' | 'moderate' | 'high';

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  messageType: MessageType;
  audioUrl?: string;
  duration?: number; // duration in seconds for voice notes
  isPending?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  type: 'text' | 'voice' | 'live';
  lastMessageText?: string;
}

export interface AudioMessage {
  localUri: string;
  duration: number;
  mimeType?: string;
}

export interface VoiceSession {
  id: string;
  state: VoiceSessionState;
  startTime: string;
  duration: number;
}

export type EmotionType =
  | 'okay'
  | 'low'
  | 'stressed'
  | 'overwhelmed'
  | 'lonely'
  | 'talk';

export interface EmotionCheckIn {
  id: string;
  timestamp: string;
  emotion: EmotionType;
  note?: string;
}

export interface SafetyEvent {
  id: string;
  timestamp: string;
  detectedText: string;
  level: SafetyLevel;
  actionTaken: string;
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  voice: {
    selectedVoice: string; // e.g. SpeechSynthesis voice name
    selectedLiveVoice?: string; // e.g. Gemini Live voice name
    autoplay: boolean;
    playbackSpeed: number; // e.g. 1.0
  };
  notifications: {
    callNotifications: boolean;
    reminders: boolean;
  };
  privacy: {
    historyEnabled: boolean;
    analyticsEnabled: boolean;
  };
  safety: {
    groundingVoiceGuides: boolean;
    crisisResourceInfo: boolean;
  };
}

export interface AIResponse {
  text: string;
  audioUrl?: string;
  safetyFlagged?: boolean;
  safetyLevel?: SafetyLevel;
}

export interface LiveKitSession {
  roomName: string;
  token: string;
  wsUrl: string;
}
