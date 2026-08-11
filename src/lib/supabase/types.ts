// Supabase database types — mirrors the schema in /supabase/migrations.
// When you change the schema in Supabase, regenerate this file with:
// npx supabase gen types typescript --project-id <your-id> > src/lib/supabase/types.ts

export type Json =
 | string
 | number
 | boolean
 | null
 | { [key: string]: Json | undefined }
 | Json[];

export type Database = {
 __InternalSupabase: {
 PostgrestVersion: "14.5";
 };
 public: {
 Tables: {
 profiles: {
 Row: {
 id: string;
 full_name: string | null;
 phone: string | null;
 role: "client" | "coach";
 avatar_url: string | null;
 created_at: string;
 };
 Insert: {
 id: string;
 full_name?: string | null;
 phone?: string | null;
 role?: "client" | "coach";
 avatar_url?: string | null;
 created_at?: string;
 };
 Update: {
 full_name?: string | null;
 phone?: string | null;
 role?: "client" | "coach";
 avatar_url?: string | null;
 };
 Relationships: [];
 };
 subscriptions: {
 Row: {
 id: string;
 client_id: string;
 tier: string;
 months: number;
 start_date: string | null;
 end_date: string | null;
 status: "active" | "expired" | "pending";
 created_at: string;
 };
 Insert: {
 id?: string;
 client_id: string;
 tier: string;
 months: number;
 start_date?: string | null;
 end_date?: string | null;
 status?: "active" | "expired" | "pending";
 created_at?: string;
 };
 Update: {
 tier?: string;
 months?: number;
 start_date?: string | null;
 end_date?: string | null;
 status?: "active" | "expired" | "pending";
 };
 Relationships: [
 { foreignKeyName: "subscriptions_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
 ];
 };
 nutrition_questionnaires: {
 Row: {
 id: string;
 client_id: string;
 data: Json;
 status: "draft" | "submitted" | "approved" | "needs_info";
 created_at: string;
 updated_at: string;
 };
 Insert: {
 id?: string;
 client_id: string;
 data?: Json;
 status?: "draft" | "submitted" | "approved" | "needs_info";
 created_at?: string;
 updated_at?: string;
 };
 Update: {
 data?: Json;
 status?: "draft" | "submitted" | "approved" | "needs_info";
 updated_at?: string;
 };
 Relationships: [
 { foreignKeyName: "nutrition_questionnaires_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
 ];
 };
 fitness_questionnaires: {
 Row: {
 id: string;
 client_id: string;
 data: Json;
 status: "draft" | "submitted" | "approved" | "needs_info";
 created_at: string;
 updated_at: string;
 };
 Insert: {
 id?: string;
 client_id: string;
 data?: Json;
 status?: "draft" | "submitted" | "approved" | "needs_info";
 created_at?: string;
 updated_at?: string;
 };
 Update: {
 data?: Json;
 status?: "draft" | "submitted" | "approved" | "needs_info";
 updated_at?: string;
 };
 Relationships: [
 { foreignKeyName: "fitness_questionnaires_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
 ];
 };
 progress_entries: {
 Row: {
 id: string;
 client_id: string;
 weight: number | null;
 waist: number | null;
 chest: number | null;
 hips: number | null;
 arm: number | null;
 neck: number | null;
 energy: number | null;
 adherence: number | null;
 notes: string | null;
 created_at: string;
 };
 Insert: {
 id?: string;
 client_id: string;
 weight?: number | null;
 waist?: number | null;
 chest?: number | null;
 hips?: number | null;
 arm?: number | null;
 neck?: number | null;
 energy?: number | null;
 adherence?: number | null;
 notes?: string | null;
 created_at?: string;
 };
 Update: {
 weight?: number | null;
 waist?: number | null;
 chest?: number | null;
 hips?: number | null;
 arm?: number | null;
 neck?: number | null;
 energy?: number | null;
 adherence?: number | null;
 notes?: string | null;
 };
 Relationships: [
 { foreignKeyName: "progress_entries_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
 ];
 };
 plans: {
 Row: {
 id: string;
 client_id: string;
 type: "meal" | "workout";
 title: string;
 notes: string | null;
 file_url: string | null;
 content: Json | null;
 created_at: string;
 };
 Insert: {
 id?: string;
 client_id: string;
 type: "meal" | "workout";
 title: string;
 notes?: string | null;
 file_url?: string | null;
 content?: Json | null;
 created_at?: string;
 };
 Update: {
 type?: "meal" | "workout";
 title?: string;
 notes?: string | null;
 file_url?: string | null;
 content?: Json | null;
 };
 Relationships: [
 { foreignKeyName: "plans_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
 ];
 };
 support_tickets: {
 Row: {
 id: string;
 client_id: string;
 subject: string;
 status: "open" | "pending" | "closed";
 priority: "low" | "normal" | "high";
 created_at: string;
 updated_at: string;
 };
 Insert: {
 id?: string;
 client_id: string;
 subject: string;
 status?: "open" | "pending" | "closed";
 priority?: "low" | "normal" | "high";
 created_at?: string;
 updated_at?: string;
 };
 Update: {
 subject?: string;
 status?: "open" | "pending" | "closed";
 priority?: "low" | "normal" | "high";
 updated_at?: string;
 };
 Relationships: [
 { foreignKeyName: "support_tickets_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
 ];
 };
 ticket_messages: {
 Row: {
 id: string;
 ticket_id: string;
 sender_id: string;
 body: string;
 created_at: string;
 };
 Insert: {
 id?: string;
 ticket_id: string;
 sender_id: string;
 body: string;
 created_at?: string;
 };
 Update: {
 body?: string;
 };
 Relationships: [
 { foreignKeyName: "ticket_messages_ticket_id_fkey"; columns: ["ticket_id"]; isOneToOne: false; referencedRelation: "support_tickets"; referencedColumns: ["id"] },
 { foreignKeyName: "ticket_messages_sender_id_fkey"; columns: ["sender_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
 ];
 };
 chat_messages: {
 Row: {
 id: string;
 client_id: string;
 role: "user" | "assistant";
 body: string;
 created_at: string;
 };
 Insert: {
 id?: string;
 client_id: string;
 role: "user" | "assistant";
 body: string;
 created_at?: string;
 };
 Update: {
 body?: string;
 };
 Relationships: [];
 };
 };
 Views: {};
 Functions: {};
 Enums: {
 user_role: "client" | "coach";
 questionnaire_status: "draft" | "submitted" | "approved" | "needs_info";
 subscription_status: "active" | "expired" | "pending";
 plan_type: "meal" | "workout";
 ticket_status: "open" | "pending" | "closed";
 ticket_priority: "low" | "normal" | "high";
 };
 CompositeTypes: {};
 };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type ProgressEntry = Database["public"]["Tables"]["progress_entries"]["Row"];
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];
