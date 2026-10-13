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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      campuses: {
        Row: {
          id: string
          lat: number
          lng: number
          name: string
          university_id: string
        }
        Insert: {
          id: string
          lat: number
          lng: number
          name: string
          university_id: string
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          name?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campuses_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          flatmates: number | null
          id: string
          kind: Database["public"]["Enums"]["listing_kind"]
          photos: string[]
          price_week: number
          property_id: string
          room_kind: Database["public"]["Enums"]["room_kind"]
          start_date: string | null
          status: Database["public"]["Enums"]["listing_status"]
          user_id: string
          wants: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          flatmates?: number | null
          id?: string
          kind: Database["public"]["Enums"]["listing_kind"]
          photos?: string[]
          price_week: number
          property_id: string
          room_kind: Database["public"]["Enums"]["room_kind"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          user_id?: string
          wants?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          flatmates?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["listing_kind"]
          photos?: string[]
          price_week?: number
          property_id?: string
          room_kind?: Database["public"]["Enums"]["room_kind"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          user_id?: string
          wants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: number
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: never
          sender_id?: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: never
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          budget_max: number | null
          course: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_demo: boolean
          languages: string[]
          lifestyle: Json
          university_id: string | null
          year: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          budget_max?: number | null
          course?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          is_demo?: boolean
          languages?: string[]
          lifestyle?: Json
          university_id?: string | null
          year?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          budget_max?: number | null
          course?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_demo?: boolean
          languages?: string[]
          lifestyle?: Json
          university_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          accessible: boolean
          address: string | null
          affiliated_university_id: string | null
          bike_dock_m: number | null
          catered: boolean
          created_at: string
          facilities: string[]
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          name: string
          postcode: string | null
          provider_id: string
          reception_24h: boolean
          slug: string
          station_m: number | null
          station_name: string | null
          supermarket_m: number | null
          supermarket_name: string | null
          website: string | null
        }
        Insert: {
          accessible?: boolean
          address?: string | null
          affiliated_university_id?: string | null
          bike_dock_m?: number | null
          catered?: boolean
          created_at?: string
          facilities?: string[]
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          postcode?: string | null
          provider_id: string
          reception_24h?: boolean
          slug: string
          station_m?: number | null
          station_name?: string | null
          supermarket_m?: number | null
          supermarket_name?: string | null
          website?: string | null
        }
        Update: {
          accessible?: boolean
          address?: string | null
          affiliated_university_id?: string | null
          bike_dock_m?: number | null
          catered?: boolean
          created_at?: string
          facilities?: string[]
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          postcode?: string | null
          provider_id?: string
          reception_24h?: boolean
          slug?: string
          station_m?: number | null
          station_name?: string | null
          supermarket_m?: number | null
          supermarket_name?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_affiliated_university_id_fkey"
            columns: ["affiliated_university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          colour: string | null
          id: string
          kind: string
          name: string
        }
        Insert: {
          colour?: string | null
          id: string
          kind: string
          name: string
        }
        Update: {
          colour?: string | null
          id?: string
          kind?: string
          name?: string
        }
        Relationships: []
      }
      room_types: {
        Row: {
          contract_weeks: number[]
          flatmates: number
          id: string
          kind: Database["public"]["Enums"]["room_kind"]
          price_week: number
          property_id: string
        }
        Insert: {
          contract_weeks?: number[]
          flatmates?: number
          id?: string
          kind: Database["public"]["Enums"]["room_kind"]
          price_week: number
          property_id: string
        }
        Update: {
          contract_weeks?: number[]
          flatmates?: number
          id?: string
          kind?: Database["public"]["Enums"]["room_kind"]
          price_week?: number
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_types_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          colour: string | null
          email_domains: string[]
          id: string
          name: string
        }
        Insert: {
          colour?: string | null
          email_domains?: string[]
          id: string
          name: string
        }
        Update: {
          colour?: string | null
          email_domains?: string[]
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      listing_satisfies: {
        Args: { h: Database["public"]["Tables"]["listings"]["Row"]; w: Json }
        Returns: boolean
      }
      match_listings: {
        Args: { p_listing_id: string }
        Returns: {
          created_at: string
          description: string | null
          end_date: string | null
          flatmates: number | null
          id: string
          kind: Database["public"]["Enums"]["listing_kind"]
          photos: string[]
          price_week: number
          property_id: string
          room_kind: Database["public"]["Enums"]["room_kind"]
          start_date: string | null
          status: Database["public"]["Enums"]["listing_status"]
          user_id: string
          wants: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      listing_kind: "swap" | "release"
      listing_status: "active" | "matched" | "closed"
      room_kind:
        | "ensuite"
        | "studio"
        | "shared_bathroom"
        | "twin"
        | "non_ensuite"
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
  public: {
    Enums: {
      listing_kind: ["swap", "release"],
      listing_status: ["active", "matched", "closed"],
      room_kind: [
        "ensuite",
        "studio",
        "shared_bathroom",
        "twin",
        "non_ensuite",
      ],
    },
  },
} as const
