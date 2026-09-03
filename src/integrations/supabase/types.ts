export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      homegame_members: {
        Row: {
          created_at: string
          homegame_id: string
          id: string
          role: Database["public"]["Enums"]["homegame_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          homegame_id: string
          id?: string
          role?: Database["public"]["Enums"]["homegame_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          homegame_id?: string
          id?: string
          role?: Database["public"]["Enums"]["homegame_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homegame_members_homegame_id_fkey"
            columns: ["homegame_id"]
            isOneToOne: false
            referencedRelation: "homegames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homegame_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homegames: {
        Row: {
          created_at: string
          currency: string
          disabled_badges: string[] | null
          icon_id: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          disabled_badges?: string[] | null
          icon_id?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          disabled_badges?: string[] | null
          icon_id?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          homegame_id: string
          id: string
          is_active: boolean
          max_uses: number | null
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          homegame_id: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          homegame_id?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_homegame_id_fkey"
            columns: ["homegame_id"]
            isOneToOne: false
            referencedRelation: "homegames"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          default_buy_in: number
          homegame_id: string
          id: string
          notes: string | null
          players: Json
          started_at: string
          started_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_buy_in?: number
          homegame_id: string
          id?: string
          notes?: string | null
          players?: Json
          started_at?: string
          started_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_buy_in?: number
          homegame_id?: string
          id?: string
          notes?: string | null
          players?: Json
          started_at?: string
          started_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_homegame_id_fkey"
            columns: ["homegame_id"]
            isOneToOne: false
            referencedRelation: "homegames"
            referencedColumns: ["id"]
          },
        ]
      }
      player_claim_requests: {
        Row: {
          created_at: string
          id: string
          player_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_claim_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_claim_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_claim_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          homegame_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          homegame_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          homegame_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_homegame_id_fkey"
            columns: ["homegame_id"]
            isOneToOne: false
            referencedRelation: "homegames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          discriminator: number
          display_name: string | null
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          discriminator?: number
          display_name?: string | null
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          discriminator?: number
          display_name?: string | null
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          homegame_id: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          homegame_id: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          homegame_id?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      session_players: {
        Row: {
          buy_in: number
          cash_out: number
          created_at: string
          id: string
          player_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          buy_in?: number
          cash_out?: number
          created_at?: string
          id?: string
          player_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          buy_in?: number
          cash_out?: number
          created_at?: string
          id?: string
          player_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          date: string
          homegame_id: string
          id: string
          is_settled: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          homegame_id: string
          id?: string
          is_settled?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          homegame_id?: string
          id?: string
          is_settled?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_homegame_id_fkey"
            columns: ["homegame_id"]
            isOneToOne: false
            referencedRelation: "homegames"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_claim: {
        Args: {
          p_player_id: string
          p_request_id: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      generate_invite_code: { Args: never; Returns: string }
      get_user_homegame_id: { Args: never; Returns: string }
      get_user_homegame_ids: { Args: never; Returns: string[] }
      is_homegame_member: {
        Args: { _homegame_id: string; _user_id: string }
        Returns: boolean
      }
      is_homegame_owner: {
        Args: { _homegame_id: string; _user_id: string }
        Returns: boolean
      }
      join_with_invite_code: {
        Args: { code_input: string }
        Returns: {
          error_message: string
          homegame_id: string
        }[]
      }
      lookup_invite_code: {
        Args: { code_input: string }
        Returns: {
          code: string
          expires_at: string
          homegame_id: string
          id: string
          is_active: boolean
          max_uses: number
          uses_count: number
        }[]
      }
      shares_homegame_with: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: boolean
      }
    }
    Enums: {
      claim_status: "pending" | "approved" | "rejected"
      homegame_role: "owner" | "member" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      claim_status: ["pending", "approved", "rejected"],
      homegame_role: ["owner", "member", "admin"],
    },
  },
} as const
