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
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      links: {
        Row: {
          category_id: string
          clicks_count: number
          created_at: string
          description: string | null
          display_order: number
          favicon_url: string | null
          id: string
          is_visible: boolean
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          category_id: string
          clicks_count?: number
          created_at?: string
          description?: string | null
          display_order?: number
          favicon_url?: string | null
          id?: string
          is_visible?: boolean
          title: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          category_id?: string
          clicks_count?: number
          created_at?: string
          description?: string | null
          display_order?: number
          favicon_url?: string | null
          id?: string
          is_visible?: boolean
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_accounts: {
        Row: {
          access_token: string
          connected_at: string
          expires_at: string | null
          live_mode: boolean
          mp_user_id: string
          public_key: string | null
          refresh_token: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          expires_at?: string | null
          live_mode?: boolean
          mp_user_id: string
          public_key?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          expires_at?: string | null
          live_mode?: boolean
          mp_user_id?: string
          public_key?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          code_verifier: string
          created_at: string
          expires_at: string
          provider: string
          redirect_uri: string
          state: string
          user_id: string
        }
        Insert: {
          code_verifier: string
          created_at?: string
          expires_at?: string
          provider: string
          redirect_uri: string
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string
          created_at?: string
          expires_at?: string
          provider?: string
          redirect_uri?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      pix_campaigns: {
        Row: {
          accent_color: string
          accepts_card: boolean
          allow_message: boolean
          cover_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          goal_cents: number | null
          id: string
          is_active: boolean
          min_cents: number
          pass_fee_to_supporter: boolean
          raised_cents: number
          show_supporters: boolean
          slug: string
          suggested_amounts: number[]
          supporters_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string
          accepts_card?: boolean
          allow_message?: boolean
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          goal_cents?: number | null
          id?: string
          is_active?: boolean
          min_cents?: number
          pass_fee_to_supporter?: boolean
          raised_cents?: number
          show_supporters?: boolean
          slug: string
          suggested_amounts?: number[]
          supporters_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string
          accepts_card?: boolean
          allow_message?: boolean
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          goal_cents?: number | null
          id?: string
          is_active?: boolean
          min_cents?: number
          pass_fee_to_supporter?: boolean
          raised_cents?: number
          show_supporters?: boolean
          slug?: string
          suggested_amounts?: number[]
          supporters_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pix_contributions: {
        Row: {
          amount_cents: number
          approved_at: string | null
          badge_key: string | null
          campaign_id: string
          created_at: string
          fee_cents: number
          id: string
          is_anonymous: boolean
          message: string | null
          method: string
          mp_payment_id: string | null
          net_cents: number
          qr_code: string | null
          qr_code_base64: string | null
          raw: Json
          status: string
          supporter_email: string | null
          supporter_name: string | null
          ticket_url: string | null
        }
        Insert: {
          amount_cents: number
          approved_at?: string | null
          badge_key?: string | null
          campaign_id: string
          created_at?: string
          fee_cents?: number
          id?: string
          is_anonymous?: boolean
          message?: string | null
          method?: string
          mp_payment_id?: string | null
          net_cents: number
          qr_code?: string | null
          qr_code_base64?: string | null
          raw?: Json
          status?: string
          supporter_email?: string | null
          supporter_name?: string | null
          ticket_url?: string | null
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          badge_key?: string | null
          campaign_id?: string
          created_at?: string
          fee_cents?: number
          id?: string
          is_anonymous?: boolean
          message?: string | null
          method?: string
          mp_payment_id?: string | null
          net_cents?: number
          qr_code?: string | null
          qr_code_base64?: string | null
          raw?: Json
          status?: string
          supporter_email?: string | null
          supporter_name?: string | null
          ticket_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pix_contributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pix_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          interval: string
          mp_payment_id: string | null
          paid_at: string | null
          payer_email: string | null
          plan: Database["public"]["Enums"]["app_role"]
          qr_code: string | null
          qr_code_base64: string | null
          raw: Json
          status: string
          subscription_id: string | null
          ticket_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          interval: string
          mp_payment_id?: string | null
          paid_at?: string | null
          payer_email?: string | null
          plan?: Database["public"]["Enums"]["app_role"]
          qr_code?: string | null
          qr_code_base64?: string | null
          raw?: Json
          status?: string
          subscription_id?: string | null
          ticket_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          interval?: string
          mp_payment_id?: string | null
          paid_at?: string | null
          payer_email?: string | null
          plan?: Database["public"]["Enums"]["app_role"]
          qr_code?: string | null
          qr_code_base64?: string | null
          raw?: Json
          status?: string
          subscription_id?: string | null
          ticket_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          is_verified: boolean
          updated_at: string
          username: string
          views_count: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          is_verified?: boolean
          updated_at?: string
          username: string
          views_count?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_verified?: boolean
          updated_at?: string
          username?: string
          views_count?: number
        }
        Relationships: []
      }
      short_links: {
        Row: {
          clicks_count: number
          code: string
          created_at: string
          id: string
          url: string
          user_id: string | null
        }
        Insert: {
          clicks_count?: number
          code: string
          created_at?: string
          id?: string
          url: string
          user_id?: string | null
        }
        Update: {
          clicks_count?: number
          code?: string
          created_at?: string
          id?: string
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_cents: number
          canceled_at: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          external_id: string | null
          gateway: string
          id: string
          interval: string
          plan: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_id?: string | null
          gateway?: string
          id?: string
          interval?: string
          plan?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_id?: string | null
          gateway?: string
          id?: string
          interval?: string
          plan?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_categories: {
        Row: {
          created_at: string
          display_order: number
          icon: string
          id: string
          is_public: boolean
          is_visible: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_public?: boolean
          is_visible?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_public?: boolean
          is_visible?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      pix_supporters_public: {
        Row: {
          amount_cents: number | null
          approved_at: string | null
          badge_key: string | null
          campaign_id: string | null
          id: string | null
          message: string | null
          supporter_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pix_contributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pix_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_mercadopago_payment_update: {
        Args: {
          _mp_payment: Json
          _payment_id?: string
          _pix_id: string
          _request_id?: string
          _signature?: string
        }
        Returns: undefined
      }
      apply_pix_contribution_update: {
        Args: { _contribution_id: string; _mp_payment: Json }
        Returns: undefined
      }
      attach_pix_contribution_mp: {
        Args: {
          _contribution_id: string
          _mp_payment_id: string
          _qr_code: string
          _qr_code_base64: string
          _raw: Json
          _status: string
          _ticket_url: string
        }
        Returns: undefined
      }
      calc_pix_badge: { Args: { _amount_cents: number }; Returns: string }
      create_pending_pix_contribution: {
        Args: {
          _amount_cents: number
          _campaign_id: string
          _fee_cents: number
          _is_anonymous: boolean
          _message: string
          _method: string
          _net_cents: number
          _supporter_email: string
          _supporter_name: string
        }
        Returns: string
      }
      get_admin_notify_email: { Args: never; Returns: string }
      get_mercadopago_webhook_access_token: {
        Args: { _payment_id: string; _request_id: string; _signature: string }
        Returns: string
      }
      get_pix_campaign_owner_token: {
        Args: { _campaign_id: string }
        Returns: {
          access_token: string
          live_mode: boolean
          user_id: string
        }[]
      }
      get_pix_payment_context: {
        Args: { _pix_id: string }
        Returns: {
          amount_cents: number
          billing_interval: string
          display_name: string
          email: string
          paid_at: string
          status: string
          user_id: string
          username: string
        }[]
      }
      get_pricing_public: { Args: never; Returns: Json }
      get_public_setting: { Args: { _key: string }; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_link_click: { Args: { _link_id: string }; Returns: undefined }
      increment_profile_view: {
        Args: { _username: string }
        Returns: undefined
      }
      increment_short_click: { Args: { _code: string }; Returns: undefined }
      resolve_short_link: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      app_role: "free" | "pro" | "admin"
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
      app_role: ["free", "pro", "admin"],
    },
  },
} as const
