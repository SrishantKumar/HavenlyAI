import { AIResponse, Message } from '../../types';
import { geminiService } from './geminiService';
import { CONFIG } from '../../constants/config';

export interface AIProvider {
  sendTextMessage(text: string, conversationId: string, history: Message[]): Promise<AIResponse>;
  analyzeAudio(audioUri: string, conversationId: string, userTranscript?: string): Promise<AIResponse>;
  generateVoiceResponse(text: string): Promise<AIResponse>;
}

// Active provider can switch based on settings or env
class UnifiedAIService implements AIProvider {
  private activeProvider: AIProvider;

  constructor() {
    // Currently, Gemini is our primary active implementation
    this.activeProvider = geminiService;
  }

  async sendTextMessage(text: string, conversationId: string, history: Message[]): Promise<AIResponse> {
    return this.activeProvider.sendTextMessage(text, conversationId, history);
  }

  async analyzeAudio(audioUri: string, conversationId: string, userTranscript?: string): Promise<AIResponse> {
    return this.activeProvider.analyzeAudio(audioUri, conversationId, userTranscript);
  }

  async generateVoiceResponse(text: string): Promise<AIResponse> {
    return this.activeProvider.generateVoiceResponse(text);
  }
}

export const aiService = new UnifiedAIService();
