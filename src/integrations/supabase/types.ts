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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      feedback: {
        Row: {
          context: Json | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          rating: string | null
          resolution: string | null
          resolution_note: string | null
          resolution_notes: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          rating?: string | null
          resolution?: string | null
          resolution_note?: string | null
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          type: string
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          rating?: string | null
          resolution?: string | null
          resolution_note?: string | null
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      health_profiles: {
        Row: {
          allergies: string[] | null
          completion_pct: number | null
          created_at: string
          diet: string[] | null
          hair_concerns: string[] | null
          hair_condition: string | null
          hair_type: string | null
          id: string
          nutrition_goals: string[] | null
          pregnancy_or_lactation: boolean | null
          skin_conditions: string[] | null
          skin_sensitivities: string[] | null
          skin_type: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          completion_pct?: number | null
          created_at?: string
          diet?: string[] | null
          hair_concerns?: string[] | null
          hair_condition?: string | null
          hair_type?: string | null
          id?: string
          nutrition_goals?: string[] | null
          pregnancy_or_lactation?: boolean | null
          skin_conditions?: string[] | null
          skin_sensitivities?: string[] | null
          skin_type?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          completion_pct?: number | null
          created_at?: string
          diet?: string[] | null
          hair_concerns?: string[] | null
          hair_condition?: string | null
          hair_type?: string | null
          id?: string
          nutrition_goals?: string[] | null
          pregnancy_or_lactation?: boolean | null
          skin_conditions?: string[] | null
          skin_sensitivities?: string[] | null
          skin_type?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maseya_products: {
        Row: {
          barcode: string
          brand: string | null
          category: string
          category_tag: string | null
          created_at: string
          image_url: string | null
          ingredients_text: string | null
          last_enriched_at: string | null
          nutriments: Json | null
          product_name: string
          scan_count: number
          source: string
          submitted_by: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          barcode: string
          brand?: string | null
          category: string
          category_tag?: string | null
          created_at?: string
          image_url?: string | null
          ingredients_text?: string | null
          last_enriched_at?: string | null
          nutriments?: Json | null
          product_name: string
          scan_count?: number
          source?: string
          submitted_by?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          barcode?: string
          brand?: string | null
          category?: string
          category_tag?: string | null
          created_at?: string
          image_url?: string | null
          ingredients_text?: string | null
          last_enriched_at?: string | null
          nutriments?: Json | null
          product_name?: string
          scan_count?: number
          source?: string
          submitted_by?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      monthly_scan_counts: {
        Row: {
          count: number
          id: string
          updated_at: string
          user_id: string
          year_month: string
        }
        Insert: {
          count?: number
          id?: string
          updated_at?: string
          user_id: string
          year_month: string
        }
        Update: {
          count?: number
          id?: string
          updated_at?: string
          user_id?: string
          year_month?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      products_cache: {
        Row: {
          barcode: string
          last_updated: string
          product_data: Json
          source: string
        }
        Insert: {
          barcode: string
          last_updated?: string
          product_data: Json
          source: string
        }
        Update: {
          barcode?: string
          last_updated?: string
          product_data?: Json
          source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_range: string | null
          avatar_url: string | null
          bio: string | null
          climate_type: string | null
          consent_analytics: boolean | null
          consent_date: string | null
          consent_health_data: boolean
          consent_personalization: boolean | null
          country: string | null
          created_at: string | null
          email_confirmed: boolean | null
          goals: string[] | null
          guide_completed: boolean | null
          hair_concerns: string[] | null
          hair_type: string | null
          has_profile_photo: boolean | null
          id: string
          language: string | null
          nickname: string | null
          onboarding_complete: boolean | null
          sensitivities: string[] | null
          skin_concerns: string[] | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age_range?: string | null
          avatar_url?: string | null
          bio?: string | null
          climate_type?: string | null
          consent_analytics?: boolean | null
          consent_date?: string | null
          consent_health_data?: boolean
          consent_personalization?: boolean | null
          country?: string | null
          created_at?: string | null
          email_confirmed?: boolean | null
          goals?: string[] | null
          guide_completed?: boolean | null
          hair_concerns?: string[] | null
          hair_type?: string | null
          has_profile_photo?: boolean | null
          id?: string
          language?: string | null
          nickname?: string | null
          onboarding_complete?: boolean | null
          sensitivities?: string[] | null
          skin_concerns?: string[] | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age_range?: string | null
          avatar_url?: string | null
          bio?: string | null
          climate_type?: string | null
          consent_analytics?: boolean | null
          consent_date?: string | null
          consent_health_data?: boolean
          consent_personalization?: boolean | null
          country?: string | null
          created_at?: string | null
          email_confirmed?: boolean | null
          goals?: string[] | null
          guide_completed?: boolean | null
          hair_concerns?: string[] | null
          hair_type?: string | null
          has_profile_photo?: boolean | null
          id?: string
          language?: string | null
          nickname?: string | null
          onboarding_complete?: boolean | null
          sensitivities?: string[] | null
          skin_concerns?: string[] | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_alternatives: {
        Row: {
          alt_barcode: string | null
          alt_data: Json
          created_at: string
          id: string
          position: number | null
          reason: string | null
          scan_id: string
        }
        Insert: {
          alt_barcode?: string | null
          alt_data: Json
          created_at?: string
          id?: string
          position?: number | null
          reason?: string | null
          scan_id: string
        }
        Update: {
          alt_barcode?: string | null
          alt_data?: Json
          created_at?: string
          id?: string
          position?: number | null
          reason?: string | null
          scan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_alternatives_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scan_history"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_history: {
        Row: {
          ai_explanation: string | null
          barcode: string | null
          category: string | null
          id: string
          product_data: Json
          product_image: string | null
          product_name: string | null
          scanned_at: string
          scores: Json
          source: string
          user_id: string
        }
        Insert: {
          ai_explanation?: string | null
          barcode?: string | null
          category?: string | null
          id?: string
          product_data?: Json
          product_image?: string | null
          product_name?: string | null
          scanned_at?: string
          scores?: Json
          source: string
          user_id: string
        }
        Update: {
          ai_explanation?: string | null
          barcode?: string | null
          category?: string | null
          id?: string
          product_data?: Json
          product_image?: string | null
          product_name?: string | null
          scanned_at?: string
          scores?: Json
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          period: string | null
          provider: string | null
          provider_customer_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          period?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          period?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_active_users: {
        Args: { p_limit?: number }
        Returns: {
          last_scan_at: string
          nickname: string
          scan_count: number
          user_id: string
        }[]
      }
      admin_recent_feedback: {
        Args: { p_barcode?: string; p_limit?: number; p_resolved?: boolean }
        Returns: {
          context: Json
          created_at: string
          email: string
          id: string
          message: string
          nickname: string
          resolution_notes: string
          resolved: boolean
          resolved_at: string
          type: string
          user_id: string
        }[]
      }
      admin_recent_products: {
        Args: { p_limit?: number }
        Returns: {
          barcode: string
          brand: string
          category: string
          created_at: string
          product_name: string
          source: string
          submitted_by: string
          verified: boolean
        }[]
      }
      admin_recent_scans: {
        Args: { p_limit?: number }
        Returns: {
          barcode: string
          category: string
          id: string
          nickname: string
          product_name: string
          scanned_at: string
          user_id: string
        }[]
      }
      admin_resolve_feedback: {
        Args: { p_id: string; p_notes: string; p_resolved?: boolean }
        Returns: undefined
      }
      admin_stats: {
        Args: never
        Returns: {
          active_users_7d: number
          products_added_7d: number
          scans_today: number
          total_products: number
          total_scans: number
          total_users: number
        }[]
      }
      admin_users_list: {
        Args: { p_limit?: number; p_search?: string }
        Returns: {
          created_at: string
          email: string
          is_admin: boolean
          last_sign_in_at: string
          nickname: string
          scan_count: number
          user_id: string
        }[]
      }
      get_public_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          nickname: string
          user_id: string
        }[]
      }
      get_public_profiles: {
        Args: { p_user_ids: string[] }
        Returns: {
          avatar_url: string
          nickname: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_product_scan_count: {
        Args: { p_barcode: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
