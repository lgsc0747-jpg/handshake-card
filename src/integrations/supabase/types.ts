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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          label: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          label: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_logs: {
        Row: {
          card_id: string | null
          card_serial: string | null
          created_at: string
          entity_id: string
          id: string
          interaction_type: string | null
          location: string | null
          metadata: Json | null
          notes: string | null
          occasion: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id?: string | null
          card_serial?: string | null
          created_at?: string
          entity_id: string
          id?: string
          interaction_type?: string | null
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          occasion?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string | null
          card_serial?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          interaction_type?: string | null
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          occasion?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_logs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nfc_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_captures: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          owner_user_id: string
          persona_id: string
          visitor_company: string | null
          visitor_email: string
          visitor_message: string | null
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          owner_user_id: string
          persona_id: string
          visitor_company?: string | null
          visitor_email: string
          visitor_message?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          owner_user_id?: string
          persona_id?: string
          visitor_company?: string | null
          visitor_email?: string
          visitor_message?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_captures_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_cards: {
        Row: {
          created_at: string
          current_category_id: string | null
          id: string
          label: string | null
          serial_number: string
          status: Database["public"]["Enums"]["card_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_category_id?: string | null
          id?: string
          label?: string | null
          serial_number: string
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_category_id?: string | null
          id?: string
          label?: string | null
          serial_number?: string
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfc_cards_current_category_id_fkey"
            columns: ["current_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          variant_info: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price?: number
          variant_info?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          variant_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_location: string
          buyer_name: string
          buyer_phone: string
          created_at: string
          id: string
          notes: string | null
          payment_method: string
          persona_id: string
          seller_user_id: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          buyer_location: string
          buyer_name: string
          buyer_phone: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          persona_id: string
          seller_user_id: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          buyer_location?: string
          buyer_name?: string
          buyer_phone?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          persona_id?: string
          seller_user_id?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      page_blocks: {
        Row: {
          block_type: string
          content: Json
          created_at: string
          id: string
          is_visible: boolean
          page_id: string
          sort_order: number
          styles: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          block_type: string
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          page_id: string
          sort_order?: number
          styles?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          page_id?: string
          sort_order?: number
          styles?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_sections: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_visible: boolean
          persona_id: string
          section_type: string
          sort_order: number
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          persona_id: string
          section_type: string
          sort_order?: number
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          persona_id?: string
          section_type?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_sections_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          accent_color: string | null
          availability_status: string | null
          avatar_position: Json | null
          avatar_url: string | null
          background_image_url: string | null
          background_preset: string | null
          bg_image_position: Json | null
          bio: string | null
          border_radius: number | null
          card_animation: string | null
          card_bg_image_url: string | null
          card_bg_position: Json | null
          card_bg_size: string | null
          card_blur: number | null
          card_texture: string | null
          created_at: string
          cv_url: string | null
          display_name: string | null
          email_public: string | null
          font_family: string | null
          gcash_qr_url: string | null
          github_url: string | null
          glass_opacity: number | null
          headline: string | null
          id: string
          is_active: boolean
          is_private: boolean
          label: string
          landing_bg_color: string | null
          linkedin_url: string | null
          location: string | null
          phone: string | null
          pin_code: string | null
          require_contact_exchange: boolean
          secondary_color: string | null
          shadow_preset: string | null
          show_availability: boolean | null
          show_location: boolean | null
          slug: string
          tertiary_color: string | null
          text_alignment: string | null
          text_color: string | null
          updated_at: string
          user_id: string
          website: string | null
          work_mode: string | null
        }
        Insert: {
          accent_color?: string | null
          availability_status?: string | null
          avatar_position?: Json | null
          avatar_url?: string | null
          background_image_url?: string | null
          background_preset?: string | null
          bg_image_position?: Json | null
          bio?: string | null
          border_radius?: number | null
          card_animation?: string | null
          card_bg_image_url?: string | null
          card_bg_position?: Json | null
          card_bg_size?: string | null
          card_blur?: number | null
          card_texture?: string | null
          created_at?: string
          cv_url?: string | null
          display_name?: string | null
          email_public?: string | null
          font_family?: string | null
          gcash_qr_url?: string | null
          github_url?: string | null
          glass_opacity?: number | null
          headline?: string | null
          id?: string
          is_active?: boolean
          is_private?: boolean
          label?: string
          landing_bg_color?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          pin_code?: string | null
          require_contact_exchange?: boolean
          secondary_color?: string | null
          shadow_preset?: string | null
          show_availability?: boolean | null
          show_location?: boolean | null
          slug: string
          tertiary_color?: string | null
          text_alignment?: string | null
          text_color?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          work_mode?: string | null
        }
        Update: {
          accent_color?: string | null
          availability_status?: string | null
          avatar_position?: Json | null
          avatar_url?: string | null
          background_image_url?: string | null
          background_preset?: string | null
          bg_image_position?: Json | null
          bio?: string | null
          border_radius?: number | null
          card_animation?: string | null
          card_bg_image_url?: string | null
          card_bg_position?: Json | null
          card_bg_size?: string | null
          card_blur?: number | null
          card_texture?: string | null
          created_at?: string
          cv_url?: string | null
          display_name?: string | null
          email_public?: string | null
          font_family?: string | null
          gcash_qr_url?: string | null
          github_url?: string | null
          glass_opacity?: number | null
          headline?: string | null
          id?: string
          is_active?: boolean
          is_private?: boolean
          label?: string
          landing_bg_color?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          pin_code?: string | null
          require_contact_exchange?: boolean
          secondary_color?: string | null
          shadow_preset?: string | null
          show_availability?: boolean | null
          show_location?: boolean | null
          slug?: string
          tertiary_color?: string | null
          text_alignment?: string | null
          text_color?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          work_mode?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_video: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_video?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_video?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          price_modifier: number
          product_id: string
          sort_order: number
          stock: number
          variant_type: string
          variant_value: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          price_modifier?: number
          product_id: string
          sort_order?: number
          stock?: number
          variant_type: string
          variant_value: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          price_modifier?: number
          product_id?: string
          sort_order?: number
          stock?: number
          variant_type?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_visible: boolean
          name: string
          persona_id: string
          price: number
          sort_order: number
          stock: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean
          name: string
          persona_id: string
          price?: number
          sort_order?: number
          stock?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean
          name?: string
          persona_id?: string
          price?: number
          sort_order?: number
          stock?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability_status: string | null
          avatar_url: string | null
          bio: string | null
          card_accent_color: string | null
          created_at: string
          cv_url: string | null
          display_name: string | null
          email_public: string | null
          github_url: string | null
          headline: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          show_availability: boolean | null
          show_location: boolean | null
          updated_at: string
          user_id: string
          username: string | null
          website: string | null
          work_mode: string | null
        }
        Insert: {
          availability_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          card_accent_color?: string | null
          created_at?: string
          cv_url?: string | null
          display_name?: string | null
          email_public?: string | null
          github_url?: string | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          show_availability?: boolean | null
          show_location?: boolean | null
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string | null
          work_mode?: string | null
        }
        Update: {
          availability_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          card_accent_color?: string | null
          created_at?: string
          cv_url?: string | null
          display_name?: string | null
          email_public?: string | null
          github_url?: string | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          show_availability?: boolean | null
          show_location?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string | null
          work_mode?: string | null
        }
        Relationships: []
      }
      short_links: {
        Row: {
          code: string
          created_at: string
          id: string
          persona_id: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          persona_id?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          persona_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_links_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          created_at: string
          id: string
          is_homepage: boolean
          is_visible: boolean
          page_icon: string | null
          persona_id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_homepage?: boolean
          is_visible?: boolean
          page_icon?: string | null
          persona_id: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_homepage?: boolean
          is_visible?: boolean
          page_icon?: string | null
          persona_id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_pages_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_username_available: {
        Args: { p_username: string }
        Returns: boolean
      }
      get_public_persona: {
        Args: { p_slug?: string; p_user_id: string }
        Returns: {
          accent_color: string
          availability_status: string
          avatar_position: Json
          avatar_url: string
          background_image_url: string
          background_preset: string
          bg_image_position: Json
          bio: string
          border_radius: number
          card_animation: string
          card_bg_image_url: string
          card_bg_position: Json
          card_bg_size: string
          card_blur: number
          card_texture: string
          cv_url: string
          display_name: string
          email_public: string
          font_family: string
          gcash_qr_url: string
          github_url: string
          glass_opacity: number
          has_pin: boolean
          headline: string
          id: string
          is_active: boolean
          is_private: boolean
          label: string
          landing_bg_color: string
          linkedin_url: string
          location: string
          phone: string
          require_contact_exchange: boolean
          secondary_color: string
          shadow_preset: string
          show_availability: boolean
          show_location: boolean
          slug: string
          tertiary_color: string
          text_alignment: string
          text_color: string
          user_id: string
          website: string
          work_mode: string
        }[]
      }
      get_public_profile: {
        Args: { p_username: string }
        Returns: {
          availability_status: string
          avatar_url: string
          bio: string
          card_accent_color: string
          display_name: string
          github_url: string
          headline: string
          linkedin_url: string
          location: string
          show_availability: boolean
          show_location: boolean
          user_id: string
          username: string
          website: string
          work_mode: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_pro: { Args: { p_user_id: string }; Returns: boolean }
      verify_persona_pin: {
        Args: { p_persona_id: string; p_pin: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      card_status: "active" | "inactive"
      subscription_plan: "free" | "pro"
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
      app_role: ["admin", "user"],
      card_status: ["active", "inactive"],
      subscription_plan: ["free", "pro"],
    },
  },
} as const
