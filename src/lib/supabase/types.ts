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
          email: string | null;
          full_name: string | null;
          phone: string | null;
          role: "client" | "coach";
          avatar_url: string | null;
          referral_code: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: "client" | "coach";
          avatar_url?: string | null;
          referral_code?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: "client" | "coach";
          avatar_url?: string | null;
          referral_code?: string | null;
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
          subscription_type: string | null;
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
          subscription_type?: string | null;
          created_at?: string;
        };
        Update: {
          tier?: string;
          months?: number;
          start_date?: string | null;
          end_date?: string | null;
          status?: "active" | "expired" | "pending";
          subscription_type?: string | null;
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
          status: string | null;
          is_current: boolean | null;
          approved_at: string | null;
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
          status?: string | null;
          is_current?: boolean | null;
          approved_at?: string | null;
          created_at?: string;
        };
        Update: {
          type?: "meal" | "workout";
          title?: string;
          notes?: string | null;
          file_url?: string | null;
          content?: Json | null;
          status?: string | null;
          is_current?: boolean | null;
          approved_at?: string | null;
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
      tool_leads: {
        Row: {
          id: string;
          tool_slug: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator";
          email: string | null;
          whatsapp: string | null;
          result_summary: string | null;
          result_json: Json | null;
          lang: string | null;
          consent: boolean;
          contacted: boolean;
          converted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tool_slug: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator";
          email?: string | null;
          whatsapp?: string | null;
          result_summary?: string | null;
          result_json?: Json | null;
          lang?: string | null;
          consent?: boolean;
          contacted?: boolean;
          converted?: boolean;
          created_at?: string;
        };
        Update: {
          email?: string | null;
          whatsapp?: string | null;
          result_summary?: string | null;
          result_json?: Json | null;
          lang?: string | null;
          consent?: boolean;
          contacted?: boolean;
          converted?: boolean;
        };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          id: string;
          language: "en" | "ar";
          title: string;
          slug: string;
          excerpt: string | null;
          content: string;
          meta_title: string | null;
          meta_description: string | null;
          focus_keyword: string | null;
          keywords: string[];
          category: string;
          tags: string[];
          featured_image: string | null;
          cover_alt: string | null;
          reading_time: number;
          author: string;
          published_at: string | null;
          updated_at: string;
          is_published: boolean;
          faq_json: Json | null;
          schema_json: Json | null;
          linked_post_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          language: "en" | "ar";
          title: string;
          slug: string;
          excerpt?: string | null;
          content?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          focus_keyword?: string | null;
          keywords?: string[];
          category?: string;
          tags?: string[];
          featured_image?: string | null;
          cover_alt?: string | null;
          reading_time?: number;
          author?: string;
          published_at?: string | null;
          updated_at?: string;
          is_published?: boolean;
          faq_json?: Json | null;
          schema_json?: Json | null;
          linked_post_id?: string | null;
          created_at?: string;
        };
        Update: {
          language?: "en" | "ar";
          title?: string;
          slug?: string;
          excerpt?: string | null;
          content?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          focus_keyword?: string | null;
          keywords?: string[];
          category?: string;
          tags?: string[];
          featured_image?: string | null;
          cover_alt?: string | null;
          reading_time?: number;
          author?: string;
          published_at?: string | null;
          updated_at?: string;
          is_published?: boolean;
          faq_json?: Json | null;
          schema_json?: Json | null;
          linked_post_id?: string | null;
        };
        Relationships: [
          { foreignKeyName: "blog_posts_linked_post_id_fkey"; columns: ["linked_post_id"]; isOneToOne: false; referencedRelation: "blog_posts"; referencedColumns: ["id"] },
        ];
      };
      blog_generation_queue: {
        Row: {
          id: string;
          topic: string | null;
          language: string | null;
          status: string | null;
          blog_post_id: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic?: string | null;
          language?: string | null;
          status?: string | null;
          blog_post_id?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          topic?: string | null;
          language?: string | null;
          status?: string | null;
          blog_post_id?: string | null;
          error_message?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          type?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          read?: boolean;
        };
        Relationships: [
          { foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      admin_notifications: {
        Row: {
          id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          target_role: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          target_role?: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          type?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          target_role?: string;
          read?: boolean;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string | null;
          referred_email: string | null;
          referral_code: string;
          status: "pending" | "completed" | "rejected";
          commission_amount: number;
          subscription_request_id: string | null;
          created_at: string;
          completed_at: string | null;
          last_seen: string | null;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id?: string | null;
          referred_email?: string | null;
          referral_code?: string;
          status?: "pending" | "completed" | "rejected";
          commission_amount?: number;
          subscription_request_id?: string | null;
          created_at?: string;
          completed_at?: string | null;
          last_seen?: string | null;
        };
        Update: {
          referred_id?: string | null;
          referred_email?: string | null;
          status?: "pending" | "completed" | "rejected";
          commission_amount?: number;
          subscription_request_id?: string | null;
          completed_at?: string | null;
          last_seen?: string | null;
        };
        Relationships: [
          { foreignKeyName: "referrals_referrer_id_fkey"; columns: ["referrer_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "referrals_referred_id_fkey"; columns: ["referred_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      referral_earnings: {
        Row: {
          id: string;
          user_id: string;
          referral_id: string | null;
          amount: number;
          status: "pending" | "available" | "requested" | "paid";
          created_at: string;
          requested_at: string | null;
          paid_at: string | null;
          payout_method: string | null;
          payout_details: string | null;
          // Added by migration 0015 (Affiliate Engine Foundation):
          affiliate_commission_id: string | null;
          transaction_type:
            | "subscription_initial"
            | "subscription_renewal"
            | "one_time_product"
            | "one_time_service"
            | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          referral_id?: string | null;
          amount: number;
          status?: "pending" | "available" | "requested" | "paid";
          created_at?: string;
          requested_at?: string | null;
          paid_at?: string | null;
          payout_method?: string | null;
          payout_details?: string | null;
          affiliate_commission_id?: string | null;
          transaction_type?:
            | "subscription_initial"
            | "subscription_renewal"
            | "one_time_product"
            | "one_time_service"
            | null;
        };
        Update: {
          referral_id?: string | null;
          amount?: number;
          status?: "pending" | "available" | "requested" | "paid";
          requested_at?: string | null;
          paid_at?: string | null;
          payout_method?: string | null;
          payout_details?: string | null;
          affiliate_commission_id?: string | null;
          transaction_type?:
            | "subscription_initial"
            | "subscription_renewal"
            | "one_time_product"
            | "one_time_service"
            | null;
        };
        Relationships: [
          { foreignKeyName: "referral_earnings_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "referral_earnings_referral_id_fkey"; columns: ["referral_id"]; isOneToOne: false; referencedRelation: "referrals"; referencedColumns: ["id"] },
          { foreignKeyName: "referral_earnings_affiliate_commission_id_fkey"; columns: ["affiliate_commission_id"]; isOneToOne: false; referencedRelation: "affiliate_commissions"; referencedColumns: ["id"] },
        ];
      };
      affiliate_transactions: {
        Row: {
          id: string;
          user_id: string;
          affiliate_user_id: string | null;
          transaction_type:
            | "subscription_initial"
            | "subscription_renewal"
            | "one_time_product"
            | "one_time_service";
          amount: number;
          currency: string;
          external_reference: string | null;
          product_id: string | null;
          affiliate_eligible: boolean;
          status: "completed" | "refunded" | "reversed" | "pending";
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          affiliate_user_id?: string | null;
          transaction_type:
            | "subscription_initial"
            | "subscription_renewal"
            | "one_time_product"
            | "one_time_service";
          amount: number;
          currency?: string;
          external_reference?: string | null;
          product_id?: string | null;
          affiliate_eligible?: boolean;
          status?: "completed" | "refunded" | "reversed" | "pending";
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          affiliate_user_id?: string | null;
          transaction_type?:
            | "subscription_initial"
            | "subscription_renewal"
            | "one_time_product"
            | "one_time_service";
          amount?: number;
          currency?: string;
          external_reference?: string | null;
          product_id?: string | null;
          affiliate_eligible?: boolean;
          status?: "completed" | "refunded" | "reversed" | "pending";
          metadata?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "affiliate_transactions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "affiliate_transactions_affiliate_user_id_fkey"; columns: ["affiliate_user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      affiliate_commissions: {
        Row: {
          id: string;
          affiliate_user_id: string;
          transaction_id: string;
          referral_id: string | null;
          commission_type:
            | "subscription_initial"
            | "subscription_renewal"
            | "one_time_product"
            | "one_time_service";
          amount: number;
          rate: number;
          status: "pending" | "available" | "requested" | "paid" | "reversed";
          reversed_at: string | null;
          reversal_reason: string | null;
          earning_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          affiliate_user_id: string;
          transaction_id: string;
          referral_id?: string | null;
          commission_type:
            | "subscription_initial"
            | "subscription_renewal"
            | "one_time_product"
            | "one_time_service";
          amount: number;
          rate?: number;
          status?: "pending" | "available" | "requested" | "paid" | "reversed";
          reversed_at?: string | null;
          reversal_reason?: string | null;
          earning_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          affiliate_user_id?: string;
          transaction_id?: string;
          referral_id?: string | null;
          commission_type?:
            | "subscription_initial"
            | "subscription_renewal"
            | "one_time_product"
            | "one_time_service";
          amount?: number;
          rate?: number;
          status?: "pending" | "available" | "requested" | "paid" | "reversed";
          reversed_at?: string | null;
          reversal_reason?: string | null;
          earning_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "affiliate_commissions_affiliate_user_id_fkey"; columns: ["affiliate_user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "affiliate_commissions_transaction_id_fkey"; columns: ["transaction_id"]; isOneToOne: false; referencedRelation: "affiliate_transactions"; referencedColumns: ["id"] },
          { foreignKeyName: "affiliate_commissions_referral_id_fkey"; columns: ["referral_id"]; isOneToOne: false; referencedRelation: "referrals"; referencedColumns: ["id"] },
          { foreignKeyName: "affiliate_commissions_earning_id_fkey"; columns: ["earning_id"]; isOneToOne: false; referencedRelation: "referral_earnings"; referencedColumns: ["id"] },
        ];
      };
      referral_payouts: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          method: "cash_wallet" | "subscription_discount" | "bank_transfer";
          wallet_number: string | null;
          bank_details: string | null;
          status: "pending" | "approved" | "rejected" | "paid";
          admin_note: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          method: "cash_wallet" | "subscription_discount" | "bank_transfer";
          wallet_number?: string | null;
          bank_details?: string | null;
          status?: "pending" | "approved" | "rejected" | "paid";
          admin_note?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          amount?: number;
          method?: "cash_wallet" | "subscription_discount" | "bank_transfer";
          wallet_number?: string | null;
          bank_details?: string | null;
          status?: "pending" | "approved" | "rejected" | "paid";
          admin_note?: string | null;
          processed_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "referral_payouts_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      saved_results: {
        Row: {
          id: string;
          user_id: string;
          tool_slug: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator" | "water-tracker";
          title: string | null;
          result_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tool_slug: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator" | "water-tracker";
          title?: string | null;
          result_data: Json;
          created_at?: string;
        };
        Update: {
          tool_slug?: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator" | "water-tracker";
          title?: string | null;
          result_data?: Json;
        };
        Relationships: [];
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          plan_data: Json;
          total_calories: number | null;
          total_protein: number | null;
          total_carbs: number | null;
          total_fat: number | null;
          meal_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          plan_data: Json;
          total_calories?: number | null;
          total_protein?: number | null;
          total_carbs?: number | null;
          total_fat?: number | null;
          meal_count?: number | null;
          created_at?: string;
        };
        Update: {
          title?: string | null;
          plan_data?: Json;
          total_calories?: number | null;
          total_protein?: number | null;
          total_carbs?: number | null;
          total_fat?: number | null;
          meal_count?: number | null;
        };
        Relationships: [];
      };
      plan_swaps: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string | null;
          swap_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id?: string | null;
          swap_type: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          plan_id?: string | null;
          swap_type?: string;
        };
        Relationships: [];
      };
      coach_presence: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          last_seen: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status: string;
          last_seen: string;
        };
        Update: {
          user_id?: string;
          status?: string;
          last_seen?: string;
        };
        Relationships: [];
      };
      progress_photos: {
        Row: {
          id: string;
          user_id: string;
          file_path: string;
          taken_on: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_path: string;
          taken_on: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          file_path?: string;
          taken_on?: string;
          note?: string | null;
        };
        Relationships: [];
      };
      subscription_requests: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          whatsapp: string | null;
          plan_tier: string;
          duration_months: number;
          price_usd: number | null;
          payment_method: "instapay" | "vodafone_cash" | "paypal" | null;
          receipt_path: string | null;
          status: "pending" | "approved" | "rejected";
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          whatsapp?: string | null;
          plan_tier: string;
          duration_months?: number;
          price_usd?: number | null;
          payment_method?: "instapay" | "vodafone_cash" | "paypal" | null;
          receipt_path?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          whatsapp?: string | null;
          plan_tier?: string;
          duration_months?: number;
          price_usd?: number | null;
          payment_method?: "instapay" | "vodafone_cash" | "paypal" | null;
          receipt_path?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
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
export type ToolLead = Database["public"]["Tables"]["tool_leads"]["Row"];
export type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type AdminNotification = Database["public"]["Tables"]["admin_notifications"]["Row"];
export type SavedResult = Database["public"]["Tables"]["saved_results"]["Row"];
export type MealPlan = Database["public"]["Tables"]["meal_plans"]["Row"];
export type SubscriptionRequest = Database["public"]["Tables"]["subscription_requests"]["Row"];
export type Referral = Database["public"]["Tables"]["referrals"]["Row"];
export type ReferralEarning = Database["public"]["Tables"]["referral_earnings"]["Row"];
export type ReferralPayout = Database["public"]["Tables"]["referral_payouts"]["Row"];
