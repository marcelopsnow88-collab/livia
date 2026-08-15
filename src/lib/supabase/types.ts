export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Row<T extends Record<string, unknown>> = T;
type Insert<T extends Record<string, unknown>> = Partial<T> & Record<string, unknown>;
type Update<T extends Record<string, unknown>> = Partial<T>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Row<{ id: string; email: string; full_name: string | null; role: "admin" | "client"; created_at: string; updated_at: string }>;
        Insert: Insert<{ id: string; email: string; full_name?: string | null; role?: "admin" | "client" }>;
        Update: Update<{ id: string; email: string; full_name?: string | null; role?: "admin" | "client" }>;
        Relationships: [];
      };
      organizations: {
        Row: Row<{ id: string; name: string; website: string | null; responsible_name: string; plan: string; status: string; trial_days_left: number | null; consumption_pct: number; segment: string | null; objective: string | null; created_at: string; updated_at: string; deleted_at: string | null }>;
        Insert: Insert<{ id?: string; name: string; responsible_name: string; plan?: string; status?: string; trial_days_left?: number | null; consumption_pct?: number; website?: string | null; segment?: string | null; objective?: string | null }>;
        Update: Update<Record<string, unknown>>;
        Relationships: [];
      };
      organization_members: {
        Row: Row<{ id: string; organization_id: string; user_id: string; is_owner: boolean; created_at: string }>;
        Insert: Insert<{ organization_id: string; user_id: string; is_owner?: boolean }>;
        Update: Update<Record<string, unknown>>;
        Relationships: [];
      };
      availabilities: {
        Row: Row<{ id: string; organization_id: string; data: string; hora_inicio: string; hora_fim: string; status: "disponivel" | "indisponivel"; created_at: string; updated_at: string; deleted_at: string | null }>;
        Insert: Insert<{ id?: string; organization_id: string; data: string; hora_inicio: string; hora_fim: string; status?: "disponivel" | "indisponivel" }>;
        Update: Update<{ data?: string; hora_inicio?: string; hora_fim?: string; status?: "disponivel" | "indisponivel"; deleted_at?: string | null }>;
        Relationships: [];
      };
      contacts: {
        Row: Row<{ id: string; organization_id: string; name: string; phone: string | null; company_name: string | null; avatar_initials: string; whatsapp_wa_id: string | null; created_at: string; updated_at: string }>;
        Insert: Insert<{ organization_id: string; name: string; phone?: string | null; company_name?: string | null; avatar_initials?: string; whatsapp_wa_id?: string | null }>;
        Update: Update<Record<string, unknown>>;
        Relationships: [];
      };
      conversations: {
        Row: Row<{ id: string; organization_id: string; contact_id: string; status: "ia" | "humano" | "aguardando" | "finalizada"; unread_count: number; last_message_preview: string | null; last_message_at: string | null; ai_intent: string | null; ai_sentiment: string | null; ai_opportunity: string | null; responsible: string | null; created_at: string; updated_at: string }>;
        Insert: Insert<{ organization_id: string; contact_id: string; status?: string; unread_count?: number; last_message_preview?: string | null; last_message_at?: string | null }>;
        Update: Update<{ status?: string; responsible?: string; unread_count?: number; last_message_preview?: string | null; last_message_at?: string | null; ai_intent?: string | null }>;
        Relationships: [];
      };
      messages: {
        Row: Row<{ id: string; conversation_id: string; organization_id: string; tipo: "cliente" | "ia" | "sistema"; texto: string; sent_at: string; whatsapp_message_id: string | null; delivery_status: string | null; created_at: string }>;
        Insert: Insert<{ conversation_id: string; organization_id: string; tipo: "cliente" | "ia" | "sistema"; texto: string; sent_at?: string; whatsapp_message_id?: string | null; delivery_status?: string | null }>;
        Update: Update<{ delivery_status?: string | null }>;
        Relationships: [];
      };
      whatsapp_connections: {
        Row: Row<{ id: string; organization_id: string; phone_number: string | null; phone_number_id: string | null; display_name: string | null; status: string; last_error: string | null; connected_at: string | null; created_at: string; updated_at: string }>;
        Insert: Insert<Record<string, unknown>>;
        Update: Update<Record<string, unknown>>;
        Relationships: [];
      };
      webhook_events: {
        Row: Row<{ id: string; provider: string; external_id: string; event_type: string; payload: Json; status: string; processed_at: string | null; error_message: string | null; created_at: string }>;
        Insert: Insert<{ provider?: string; external_id: string; event_type: string; payload: Json; status?: string }>;
        Update: Update<{ status?: string; processed_at?: string | null; error_message?: string | null }>;
        Relationships: [];
      };
      integration_logs: {
        Row: Row<{ id: string; organization_id: string | null; source: string; level: string; message: string; metadata: Json | null; created_at: string }>;
        Insert: Insert<{ organization_id?: string | null; source: string; level?: string; message: string; metadata?: Json | null }>;
        Update: Update<Record<string, unknown>>;
        Relationships: [];
      };
      plan_usage: {
        Row: Row<{ id: string; organization_id: string; resource_key: string; used: number; limit_value: number; updated_at: string }>;
        Insert: Insert<Record<string, unknown>>;
        Update: Update<Record<string, unknown>>;
        Relationships: [];
      };
      ai_agents: {
        Row: Row<{ id: string; organization_id: string; name: string; tone: string; greeting_message: string | null; is_active: boolean; created_at: string; updated_at: string }>;
        Insert: Insert<{ organization_id: string; name?: string; tone?: string; greeting_message?: string | null }>;
        Update: Update<Record<string, unknown>>;
        Relationships: [];
      };
      subscriptions: {
        Row: Row<{ id: string; organization_id: string; stripe_customer_id: string; stripe_subscription_id: string | null; stripe_price_id: string | null; plan: string; billing_interval: "month" | "year"; status: string; current_period_end: string | null; cancel_at_period_end: boolean; created_at: string; updated_at: string }>;
        Insert: Insert<{ organization_id: string; stripe_customer_id: string; stripe_subscription_id?: string | null; stripe_price_id?: string | null; plan: string; billing_interval?: "month" | "year"; status?: string; current_period_end?: string | null; cancel_at_period_end?: boolean }>;
        Update: Update<Record<string, unknown>>;
        Relationships: [];
      };
      stripe_webhook_events: {
        Row: Row<{ id: string; stripe_event_id: string; event_type: string; payload: Json; processed_at: string }>;
        Insert: Insert<{ stripe_event_id: string; event_type: string; payload: Json }>;
        Update: Update<Record<string, unknown>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
