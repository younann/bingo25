// Database types for Supabase

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          called_numbers: number[];
          current_number: number | null;
          started_at: string;
          is_active: boolean;
          is_paused: boolean;
          auto_call_enabled: boolean;
          auto_call_interval: number;
          winner_card_id: string | null;
          winner_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          called_numbers?: number[];
          current_number?: number | null;
          started_at?: string;
          is_active?: boolean;
          is_paused?: boolean;
          auto_call_enabled?: boolean;
          auto_call_interval?: number;
          winner_card_id?: string | null;
          winner_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          called_numbers?: number[];
          current_number?: number | null;
          started_at?: string;
          is_active?: boolean;
          is_paused?: boolean;
          auto_call_enabled?: boolean;
          auto_call_interval?: number;
          winner_card_id?: string | null;
          winner_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      player_cards: {
        Row: {
          id: string;
          card_numbers: number[][];
          marked_cells: boolean[][];
          game_id: string | null;
          player_name: string | null;
          theme_id: string | null;
          last_active: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_numbers: number[][];
          marked_cells?: boolean[][];
          game_id?: string | null;
          player_name?: string | null;
          theme_id?: string | null;
          last_active?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_numbers?: number[][];
          marked_cells?: boolean[][];
          game_id?: string | null;
          player_name?: string | null;
          theme_id?: string | null;
          last_active?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      admin_sessions: {
        Row: {
          id: string;
          session_id: string;
          started_at: string;
          last_heartbeat: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          started_at?: string;
          last_heartbeat?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          started_at?: string;
          last_heartbeat?: string;
          created_at?: string;
        };
      };
    };
  };
}

// Derived types for easier use
export type Game = Database['public']['Tables']['games']['Row'];
export type GameInsert = Database['public']['Tables']['games']['Insert'];
export type GameUpdate = Database['public']['Tables']['games']['Update'];

export type PlayerCard = Database['public']['Tables']['player_cards']['Row'];
export type PlayerCardInsert = Database['public']['Tables']['player_cards']['Insert'];
export type PlayerCardUpdate = Database['public']['Tables']['player_cards']['Update'];

export type AdminSession = Database['public']['Tables']['admin_sessions']['Row'];
export type AdminSessionInsert = Database['public']['Tables']['admin_sessions']['Insert'];
export type AdminSessionUpdate = Database['public']['Tables']['admin_sessions']['Update'];
