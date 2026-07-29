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
      analytics_custom_events: {
        Row: {
          client_event_id: string
          id: string
          name: string
          page_id: string | null
          props: Json
          session_id: string
          ts: string
        }
        Insert: {
          client_event_id: string
          id?: string
          name: string
          page_id?: string | null
          props?: Json
          session_id: string
          ts?: string
        }
        Update: {
          client_event_id?: string
          id?: string
          name?: string
          page_id?: string | null
          props?: Json
          session_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_custom_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "analytics_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_custom_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          client_event_id: string
          id: string
          page_id: string | null
          payload: Json
          session_id: string
          ts: string
          type: string
        }
        Insert: {
          client_event_id: string
          id?: string
          page_id?: string | null
          payload?: Json
          session_id: string
          ts?: string
          type: string
        }
        Update: {
          client_event_id?: string
          id?: string
          page_id?: string | null
          payload?: Json
          session_id?: string
          ts?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "analytics_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_pages: {
        Row: {
          first_seen: string
          id: string
          last_seen: string
          owner_user_id: string | null
          path: string
          title: string | null
        }
        Insert: {
          first_seen?: string
          id?: string
          last_seen?: string
          owner_user_id?: string | null
          path: string
          title?: string | null
        }
        Update: {
          first_seen?: string
          id?: string
          last_seen?: string
          owner_user_id?: string | null
          path?: string
          title?: string | null
        }
        Relationships: []
      }
      analytics_pageviews: {
        Row: {
          duration_ms: number
          id: string
          is_exit: boolean
          page_id: string | null
          path: string
          session_id: string
          title: string | null
          ts: string
          url: string
        }
        Insert: {
          duration_ms?: number
          id?: string
          is_exit?: boolean
          page_id?: string | null
          path: string
          session_id: string
          title?: string | null
          ts?: string
          url: string
        }
        Update: {
          duration_ms?: number
          id?: string
          is_exit?: boolean
          page_id?: string | null
          path?: string
          session_id?: string
          title?: string | null
          ts?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_pageviews_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "analytics_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_pageviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          browser_family: string | null
          city: string | null
          country: string | null
          device_type: string | null
          ended_at: string | null
          id: string
          ip_prefix: string | null
          lang: string | null
          last_seen: string
          os_family: string | null
          referrer: string | null
          screen_h: number | null
          screen_w: number | null
          started_at: string
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_h: number | null
          viewport_w: number | null
          visitor_id: string
        }
        Insert: {
          browser_family?: string | null
          city?: string | null
          country?: string | null
          device_type?: string | null
          ended_at?: string | null
          id?: string
          ip_prefix?: string | null
          lang?: string | null
          last_seen?: string
          os_family?: string | null
          referrer?: string | null
          screen_h?: number | null
          screen_w?: number | null
          started_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_h?: number | null
          viewport_w?: number | null
          visitor_id: string
        }
        Update: {
          browser_family?: string | null
          city?: string | null
          country?: string | null
          device_type?: string | null
          ended_at?: string | null
          id?: string
          ip_prefix?: string | null
          lang?: string | null
          last_seen?: string
          os_family?: string | null
          referrer?: string | null
          screen_h?: number | null
          screen_w?: number | null
          started_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_h?: number | null
          viewport_w?: number | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_sessions_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "analytics_visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_visitors: {
        Row: {
          created_at: string
          first_seen: string
          id: string
          last_seen: string
          ua_hash: string | null
        }
        Insert: {
          created_at?: string
          first_seen?: string
          id?: string
          last_seen?: string
          ua_hash?: string | null
        }
        Update: {
          created_at?: string
          first_seen?: string
          id?: string
          last_seen?: string
          ua_hash?: string | null
        }
        Relationships: []
      }
      event_log: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          level: string
          payload: Json
          target_id: string | null
          target_type: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          level?: string
          payload?: Json
          target_id?: string | null
          target_type?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          level?: string
          payload?: Json
          target_id?: string | null
          target_type?: string | null
          type?: string
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
          show_progress: boolean
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
          show_progress?: boolean
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
          show_progress?: boolean
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
          {
            foreignKeyName: "pix_contributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_public"
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
          social_links: Json
          theme: string
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
          social_links?: Json
          theme?: string
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
          social_links?: Json
          theme?: string
          updated_at?: string
          username?: string
          views_count?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          subject: string
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          subject: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          bucket?: string
          count?: number
          subject?: string
          updated_at?: string
          window_start?: string
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
      user_addons: {
        Row: {
          activated_at: string | null
          addon: string
          canceled_at: string | null
          created_at: string
          id: string
          notes: string | null
          price_cents: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          addon: string
          canceled_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          price_cents?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          addon?: string
          canceled_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          price_cents?: number
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
      webhook_events: {
        Row: {
          error: string | null
          event_id: string
          event_type: string | null
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          status: string
        }
        Insert: {
          error?: string | null
          event_id: string
          event_type?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          provider: string
          received_at?: string
          status?: string
        }
        Update: {
          error?: string | null
          event_id?: string
          event_type?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
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
          {
            foreignKeyName: "pix_contributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_campaign_public: {
        Row: {
          accent_color: string | null
          accepts_card: boolean | null
          allow_message: boolean | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          ends_at: string | null
          goal_cents: number | null
          id: string | null
          is_active: boolean | null
          min_cents: number | null
          pass_fee_to_supporter: boolean | null
          raised_cents: number | null
          show_progress: boolean | null
          show_supporters: boolean | null
          slug: string | null
          suggested_amounts: number[] | null
          supporters_count: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          accepts_card?: boolean | null
          allow_message?: boolean | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          goal_cents?: never
          id?: string | null
          is_active?: boolean | null
          min_cents?: number | null
          pass_fee_to_supporter?: boolean | null
          raised_cents?: never
          show_progress?: boolean | null
          show_supporters?: boolean | null
          slug?: string | null
          suggested_amounts?: number[] | null
          supporters_count?: never
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          accepts_card?: boolean | null
          allow_message?: boolean | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          goal_cents?: never
          id?: string | null
          is_active?: boolean | null
          min_cents?: number | null
          pass_fee_to_supporter?: boolean | null
          raised_cents?: never
          show_progress?: boolean | null
          show_supporters?: boolean | null
          slug?: string | null
          suggested_amounts?: number[] | null
          supporters_count?: never
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_link_public: {
        Row: {
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          category_order: number | null
          clicks_count: number | null
          description: string | null
          display_order: number | null
          favicon_url: string | null
          id: string | null
          profile_id: string | null
          title: string | null
          url: string | null
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
      v_profile_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_verified: boolean | null
          username: string | null
          views_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          username?: string | null
          views_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          username?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _analytics_require_pro: { Args: never; Returns: undefined }
      admin_ops_summary: { Args: { _hours?: number }; Returns: Json }
      analytics_admin_summary: { Args: { _hours?: number }; Returns: Json }
      analytics_breakdown: {
        Args: {
          _dimension: string
          _limit?: number
          _path?: string
          _since?: string
          _until?: string
        }
        Returns: {
          bucket: string
          views: number
          visitors: number
        }[]
      }
      analytics_delete_my_data: { Args: never; Returns: Json }
      analytics_export_my_data: { Args: never; Returns: Json }
      analytics_heatmap: {
        Args: {
          _limit?: number
          _path: string
          _since?: string
          _until?: string
        }
        Returns: {
          kind: string
          ts: string
          vh: number
          vw: number
          x: number
          y: number
        }[]
      }
      analytics_ingest_batch: { Args: { _payload: Json }; Returns: Json }
      analytics_my_pages: {
        Args: { _limit?: number }
        Returns: {
          last_seen: string
          owner_user_id: string
          path: string
          title: string
          views_count: number
        }[]
      }
      analytics_page_summary: {
        Args: { _path: string; _since?: string; _until?: string }
        Returns: Json
      }
      analytics_timeseries: {
        Args: {
          _bucket?: string
          _path?: string
          _since?: string
          _until?: string
        }
        Returns: {
          ts: string
          views: number
          visitors: number
        }[]
      }
      analytics_top_events: {
        Args: {
          _limit?: number
          _path?: string
          _since?: string
          _until?: string
        }
        Returns: {
          name: string
          sessions: number
          total: number
        }[]
      }
      analytics_top_pages: {
        Args: { _limit?: number; _since?: string; _until?: string }
        Returns: {
          path: string
          title: string
          views: number
          visitors: number
        }[]
      }
      analytics_upsert_page: {
        Args: { _path: string; _title: string }
        Returns: string
      }
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
      check_rate_limit: {
        Args: {
          _bucket: string
          _max: number
          _subject: string
          _window_seconds: number
        }
        Returns: boolean
      }
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
      delete_push_subscription_by_endpoint: {
        Args: { _endpoint: string }
        Returns: undefined
      }
      get_admin_notify_email: { Args: never; Returns: string }
      get_campaign_fee_for_user: {
        Args: { _user_id: string }
        Returns: {
          creator_role: Database["public"]["Enums"]["app_role"]
          fee_pct: number
          min_fee_cents: number
        }[]
      }
      get_campaign_owner_push_subs: {
        Args: { _campaign_id: string }
        Returns: {
          auth: string
          endpoint: string
          p256dh: string
        }[]
      }
      get_mercadopago_webhook_access_token: {
        Args: { _payment_id: string; _request_id: string; _signature: string }
        Returns: string
      }
      get_pix_campaign_owner_token: {
        Args: { _campaign_id: string }
        Returns: {
          access_token: string
          creator_role: string
          fee_pct: number
          live_mode: boolean
          min_fee_cents: number
          user_id: string
        }[]
      }
      get_pix_campaign_public_data: {
        Args: { _slug: string }
        Returns: {
          accepts_card: boolean
          campaign_id: string
          creator_role: string
          fee_pct: number
          live_mode: boolean
          min_fee_cents: number
          public_key: string
        }[]
      }
      get_pix_contribution_status: {
        Args: { _id: string }
        Returns: {
          amount_cents: number
          approved_at: string
          badge_key: string
          id: string
          status: string
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
      list_mp_account_tokens: {
        Args: never
        Returns: {
          access_token: string
        }[]
      }
      list_pending_pix_contributions_for_reconcile: {
        Args: { _limit?: number; _older_than_seconds?: number }
        Returns: {
          access_token: string
          contribution_id: string
          created_at: string
          mp_payment_id: string
        }[]
      }
      list_pending_pix_payments_for_reconcile: {
        Args: { _limit?: number; _older_than_seconds?: number }
        Returns: {
          created_at: string
          mp_payment_id: string
          pix_id: string
        }[]
      }
      log_event: {
        Args: {
          _level?: string
          _payload?: Json
          _target_id?: string
          _target_type?: string
          _type: string
        }
        Returns: string
      }
      resolve_pix_contribution_by_mp: {
        Args: { _mp_payment_id: string }
        Returns: {
          access_token: string
          campaign_id: string
          contribution_id: string
          live_mode: boolean
        }[]
      }
      resolve_short_link: { Args: { _code: string }; Returns: string }
      user_has_active_addon: {
        Args: { _addon: string; _user_id: string }
        Returns: boolean
      }
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
