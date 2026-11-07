export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          memory_summary: string | null;
          phq4_score: number | null;
          phq4_completed_at: string | null;
          behavioral_tasks_completed: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          memory_summary?: string | null;
          phq4_score?: number | null;
          phq4_completed_at?: string | null;
          behavioral_tasks_completed?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          memory_summary?: string | null;
          phq4_score?: number | null;
          phq4_completed_at?: string | null;
          behavioral_tasks_completed?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          type: string;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          type?: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          type?: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          message_type: string;
          audio_url: string | null;
          duration: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          message_type?: string;
          audio_url?: string | null;
          duration?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          message_type?: string;
          audio_url?: string | null;
          duration?: number | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

