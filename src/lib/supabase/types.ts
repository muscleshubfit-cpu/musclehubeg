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
          role: "client" | "coach" | "admin";
          // Added by migration 0067 (admin clients unification — coach-type
          // distinction): 'site' = follows up site members (B2C), 'b2b' =
          // external partner with his own clients + wallet. Only meaningful
          // when role='coach'; every existing coach defaults to 'b2b'.
          coach_kind: string | null;
          avatar_url: string | null;
          referral_code: string | null;
          is_test_account: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: "client" | "coach" | "admin";
          coach_kind?: string | null;
          avatar_url?: string | null;
          referral_code?: string | null;
          is_test_account?: boolean;
          created_at?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: "client" | "coach" | "admin";
          coach_kind?: string | null;
          avatar_url?: string | null;
          referral_code?: string | null;
          is_test_account?: boolean;
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
          // Added by migration 0057 (affiliate foundation — cancel flow):
          cancel_requested_at: string | null;
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
          cancel_requested_at?: string | null;
          created_at?: string;
        };
        Update: {
          tier?: string;
          months?: number;
          start_date?: string | null;
          end_date?: string | null;
          status?: "active" | "expired" | "pending";
          subscription_type?: string | null;
          cancel_requested_at?: string | null;
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
          tool_slug: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator" | "water-tracker" | "meal-planner" | "newsletter" | "signup";
          email: string | null;
          name: string | null;
          whatsapp: string | null;
          result_summary: string | null;
          result_json: Json | null;
          lang: string | null;
          type: string;
          consent: boolean;
          contacted: boolean;
          converted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tool_slug: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator" | "water-tracker" | "meal-planner" | "newsletter" | "signup";
          email?: string | null;
          name?: string | null;
          whatsapp?: string | null;
          result_summary?: string | null;
          result_json?: Json | null;
          lang?: string | null;
          type?: string;
          consent?: boolean;
          contacted?: boolean;
          converted?: boolean;
          created_at?: string;
        };
        Update: {
          email?: string | null;
          name?: string | null;
          whatsapp?: string | null;
          result_summary?: string | null;
          result_json?: Json | null;
          lang?: string | null;
          type?: string;
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
          topic: string;
          topic_ar: string | null;
          focus_keyword: string;
          focus_keyword_ar: string | null;
          category: string | null;
          rationale: string | null;
          status: string;
          language: string | null;
          article_bundle: Json;
          error_message: string | null;
          en_post_id: string | null;
          ar_post_id: string | null;
          created_at: string;
          generated_at: string | null;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          topic: string;
          topic_ar?: string | null;
          focus_keyword: string;
          focus_keyword_ar?: string | null;
          category?: string | null;
          rationale?: string | null;
          status?: string;
          language?: string | null;
          article_bundle?: Json | null;
          error_message?: string | null;
          en_post_id?: string | null;
          ar_post_id?: string | null;
          created_at?: string;
          generated_at?: string | null;
          published_at?: string | null;
        };
        Update: {
          topic?: string;
          topic_ar?: string | null;
          focus_keyword?: string;
          focus_keyword_ar?: string | null;
          category?: string | null;
          rationale?: string | null;
          status?: string;
          language?: string | null;
          article_bundle?: Json | null;
          error_message?: string | null;
          en_post_id?: string | null;
          ar_post_id?: string | null;
          created_at?: string;
          generated_at?: string | null;
          published_at?: string | null;
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
          target_coach_id: string | null;
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
          target_coach_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          type?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          target_role?: string;
          target_coach_id?: string | null;
          read?: boolean;
        };
        Relationships: [
          { foreignKeyName: "admin_notifications_target_coach_id_fkey"; columns: ["target_coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      // mirror RUN_ON_SUPABASE_0037 (PART B) + 0038 price_usd rename —
      // added Phase 93 (was from("coach_ads" as any) in /api/coach/ads)
      coach_ads: {
        Row: {
          id: string;
          coach_id: string;
          package_id: string;
          days: number;
          price_usd: number;
          status: string;
          starts_at: string;
          ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          package_id: string;
          days: number;
          price_usd: number;
          status?: string;
          starts_at?: string;
          ends_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          package_id?: string;
          days?: number;
          price_usd?: number;
          status?: string;
          starts_at?: string;
          ends_at?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "coach_ads_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      coach_assignments: {
        Row: {
          id: string;
          client_id: string;
          coach_id: string;
          assigned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          coach_id: string;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          coach_id?: string;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "coach_assignments_client_id_fkey"; columns: ["client_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "coach_assignments_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "coach_assignments_assigned_by_fkey"; columns: ["assigned_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      coach_emails: {
        Row: {
          email: string;
          created_at: string;
        };
        Insert: {
          email: string;
          created_at?: string;
        };
        Update: {
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      coach_fees: {
        Row: {
          coach_id: string;
          fee_per_client: number;
          currency: string;
          updated_at: string;
        };
        Insert: {
          coach_id: string;
          fee_per_client?: number;
          currency?: string;
          updated_at?: string;
        };
        Update: {
          coach_id?: string;
          fee_per_client?: number;
          currency?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "coach_fees_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      coach_payments: {
        Row: {
          id: string;
          coach_id: string;
          client_id: string;
          subscription_id: string | null;
          tier: string;
          months: number;
          amount: number | null;
          currency: string;
          method: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          client_id: string;
          subscription_id?: string | null;
          tier: string;
          months: number;
          amount?: number | null;
          currency?: string;
          method?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          client_id?: string;
          subscription_id?: string | null;
          tier?: string;
          months?: number;
          amount?: number | null;
          currency?: string;
          method?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "coach_payments_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "coach_payments_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "coach_payments_subscription_id_fkey"; columns: ["subscription_id"]; isOneToOne: false; referencedRelation: "subscriptions"; referencedColumns: ["id"] },
        ];
      };
      coach_wallets: {
        Row: {
          coach_id: string;
          balance: number;
          currency: string;
          updated_at: string;
        };
        Insert: {
          coach_id: string;
          balance?: number;
          currency?: string;
          updated_at?: string;
        };
        Update: {
          coach_id?: string;
          balance?: number;
          currency?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "coach_wallets_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      coach_topup_requests: {
        Row: {
          id: string;
          coach_id: string;
          amount: number;
          currency: string;
          method: string;
          receipt_path: string;
          note: string | null;
          status: string;
          admin_note: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          amount: number;
          currency?: string;
          method: string;
          receipt_path: string;
          note?: string | null;
          status?: string;
          admin_note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          amount?: number;
          currency?: string;
          method?: string;
          receipt_path?: string;
          note?: string | null;
          status?: string;
          admin_note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "coach_topup_requests_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "coach_topup_requests_reviewed_by_fkey"; columns: ["reviewed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      coach_wallet_transactions: {
        Row: {
          id: string;
          coach_id: string;
          kind: string;
          amount: number;
          balance_after: number;
          ref_id: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          kind: string;
          amount: number;
          balance_after: number;
          ref_id?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          kind?: string;
          amount?: number;
          balance_after?: number;
          ref_id?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "coach_wallet_transactions_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      // mirror 0037 COACH_BOOST — added Phase 95 (was
      // from("coach_support_messages" as any) in admin/coach-support)
      coach_support_messages: {
        Row: {
          id: string;
          coach_id: string;
          parent_id: string | null;
          sender_role: "coach" | "admin";
          subject: string;
          body: string;
          status: "open" | "answered" | "closed";
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          parent_id?: string | null;
          sender_role?: "coach" | "admin";
          subject?: string;
          body: string;
          status?: "open" | "answered" | "closed";
          created_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          parent_id?: string | null;
          sender_role?: "coach" | "admin";
          subject?: string;
          body?: string;
          status?: "open" | "answered" | "closed";
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "coach_support_messages_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "coach_support_messages_parent_id_fkey"; columns: ["parent_id"]; isOneToOne: false; referencedRelation: "coach_support_messages"; referencedColumns: ["id"] },
        ];
      };
      // mirror 0031+0032 base + 0037 (photo_url, results_photos, social,
      // whatsapp_phone) + 0046 (review_status) + 0049 (certificates) —
      // columns added Phase 93 (was from("coach_pages" as any) in the
      // landing/coach-pages consumers)
      coach_pages: {
        Row: {
          coach_id: string;
          slug: string;
          headline: string;
          bio: string;
          specialties: string;
          headline_en: string;
          bio_en: string;
          specialties_en: string;
          is_published: boolean;
          review_status: string;
          review_note: string;
          reviewed_at: string | null;
          photo_url: string;
          results_photos: Json;
          instagram_url: string;
          facebook_url: string;
          tiktok_url: string;
          youtube_url: string;
          whatsapp_phone: string;
          certificates: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          coach_id: string;
          slug: string;
          headline?: string;
          bio?: string;
          specialties?: string;
          headline_en?: string;
          bio_en?: string;
          specialties_en?: string;
          is_published?: boolean;
          review_status?: string;
          review_note?: string;
          reviewed_at?: string | null;
          photo_url?: string;
          results_photos?: Json;
          instagram_url?: string;
          facebook_url?: string;
          tiktok_url?: string;
          youtube_url?: string;
          whatsapp_phone?: string;
          certificates?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          coach_id?: string;
          slug?: string;
          headline?: string;
          bio?: string;
          specialties?: string;
          headline_en?: string;
          bio_en?: string;
          specialties_en?: string;
          is_published?: boolean;
          review_status?: string;
          review_note?: string;
          reviewed_at?: string | null;
          photo_url?: string;
          results_photos?: Json;
          instagram_url?: string;
          facebook_url?: string;
          tiktok_url?: string;
          youtube_url?: string;
          whatsapp_phone?: string;
          certificates?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "coach_pages_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
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
            | "coach_client_activation"
            | null;
          // Added by migration 0062 (7-day refund safety hold):
          available_at: string;
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
            | "coach_client_activation"
            | null;
          available_at?: string;
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
            | "coach_client_activation"
            | null;
          available_at?: string;
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
            | "one_time_service"
            | "coach_client_activation";
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
            | "one_time_service"
            | "coach_client_activation";
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
            | "one_time_service"
            | "coach_client_activation";
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
            | "one_time_service"
            | "coach_client_activation";
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
            | "one_time_service"
            | "coach_client_activation";
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
            | "one_time_service"
            | "coach_client_activation";
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
      refund_requests: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string | null;
          tier: string;
          months: number | null;
          amount_usd: number | null;
          payment_reference: string | null;
          payment_source: string | null;
          status: "pending" | "approved" | "rejected";
          admin_note: string | null;
          usage_snapshot: Json | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id?: string | null;
          tier: string;
          months?: number | null;
          amount_usd?: number | null;
          payment_reference?: string | null;
          payment_source?: string | null;
          status?: "pending" | "approved" | "rejected";
          admin_note?: string | null;
          usage_snapshot?: Json | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          subscription_id?: string | null;
          tier?: string;
          months?: number | null;
          amount_usd?: number | null;
          payment_reference?: string | null;
          payment_source?: string | null;
          status?: "pending" | "approved" | "rejected";
          admin_note?: string | null;
          usage_snapshot?: Json | null;
          processed_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "refund_requests_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "refund_requests_subscription_id_fkey"; columns: ["subscription_id"]; isOneToOne: false; referencedRelation: "subscriptions"; referencedColumns: ["id"] },
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
      ai_jobs: {
        Row: {
          id: string;
          job_type: string;
          status: string;
          payload: Json;
          result: Json | null;
          error_message: string | null;
          requested_by: string | null;
          attempts: number;
          created_at: string;
          started_at: string | null;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          job_type: string;
          status?: string;
          payload?: Json;
          result?: Json | null;
          error_message?: string | null;
          requested_by?: string | null;
          attempts?: number;
          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Update: {
          job_type?: string;
          status?: string;
          payload?: Json;
          result?: Json | null;
          error_message?: string | null;
          requested_by?: string | null;
          attempts?: number;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "ai_jobs_requested_by_fkey"; columns: ["requested_by"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
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
      // Added by migration 0067 (admin clients unification): the B2C
      // follow-up roster — member ↔ site-coach. Deliberately SEPARATE from
      // coach_assignments (the B2B money relation feeding wallet bills and
      // affiliate attribution). One member ↔ one site coach (unique client_id).
      site_coach_assignments: {
        Row: {
          id: string;
          coach_id: string;
          client_id: string;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          client_id: string;
          assigned_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          client_id?: string;
          assigned_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "site_coach_assignments_coach_id_fkey"; columns: ["coach_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "site_coach_assignments_client_id_fkey"; columns: ["client_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "site_coach_assignments_assigned_by_fkey"; columns: ["assigned_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
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
      // mirror RUN_ON_SUPABASE_0022 — tamper-proof EVO usage ledger
      // (server-writes only; added Phase 93, was from("evo_chat_usage" as any))
      evo_chat_usage: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "evo_chat_usage_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
        ];
      };
      // mirror RUN_ON_SUPABASE_0028 — anonymous EVO usage ledger
      // (salted-IP-hash key; server-role writes only)
      evo_anon_usage: {
        Row: {
          id: string;
          anon_key: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          anon_key: string;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          anon_key?: string;
          source?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      external_plans: {
        Row: {
          id: string;
          person_name: string;
          person_contact: string | null;
          plan_type: "workout" | "meal";
          title: string;
          notes: string | null;
          content: Json;
          status: "draft" | "final";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          person_name: string;
          person_contact?: string | null;
          plan_type: "workout" | "meal";
          title: string;
          notes?: string | null;
          content?: Json;
          status?: "draft" | "final";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          person_name?: string;
          person_contact?: string | null;
          plan_type?: "workout" | "meal";
          title?: string;
          notes?: string | null;
          content?: Json;
          status?: "draft" | "final";
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "external_plans_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: {};
    Functions: {
      // mirror RUN_ON_SUPABASE_0035 (PART 4) — the ONLY wallet writer;
      // signed amount, raises 'insufficient wallet balance' on over-debit.
      coach_adjust_wallet: {
        Args: {
          p_coach_id: string;
          p_amount: number;
          p_kind: string;
          p_ref_id?: string | null;
          p_note?: string | null;
          p_created_by?: string | null;
        };
        Returns: number;
      };
      auto_promote_coach_if_allowed: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_profile_role: {
        Args: { p_user_id: string };
        Returns: "client" | "coach" | "admin";
      };
      extend_subscription: {
        Args: {
          p_client_id: string;
          p_tier: string;
          p_months: number;
          p_subscription_type?: string;
          p_request_id?: string | null;
        };
        Returns: {
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
      };
      get_coach_client_list: {
        Args: Record<string, never>;
        Returns: {
          client_id: string;
          client_email: string;
          client_full_name: string;
          client_phone: string;
          client_avatar_url: string;
          client_created_at: string;
          sub_tier: string;
          sub_status: string;
          sub_end_date: string;
          sub_months: number;
          pending_payments: number;
          nutri_q_status: string;
          fit_q_status: string;
          assigned_coach_id: string | null;
          assigned_coach_name: string | null;
        }[];
      };
      // 0047 (Phase 52) — server-side paging/filtering/sorting. bigint
      // (total_count) arrives as a string from PostgREST.
      get_coach_client_list_paged: {
        Args: {
          p_limit: number;
          p_offset: number;
          p_search: string | null;
          p_filter: string;
          p_segment: string;
          p_sort: string;
        };
        Returns: {
          client_id: string;
          client_email: string;
          client_full_name: string;
          client_phone: string;
          client_avatar_url: string;
          client_created_at: string;
          sub_tier: string;
          sub_status: string;
          sub_end_date: string;
          sub_months: number;
          pending_payments: number;
          nutri_q_status: string;
          fit_q_status: string;
          assigned_coach_id: string | null;
          assigned_coach_name: string | null;
          total_count: string;
        }[];
      };
      get_coach_client_stats: {
        Args: Record<string, never>;
        Returns: {
          total: string;
          active: string;
          expiring: string;
          no_plan: string;
          no_questionnaire: string;
          pending_payment: string;
          expired: string;
          premium: string;
          pro: string;
          coaching: string;
          coach_clients: string;
          site_clients: string;
        }[];
      };
      // Added by migration 0067 — the unified admin clients feed (every
      // role, membership lifecycle, B2B + site-coach relations, type/test
      // filters). Admin-only: non-admin callers get an empty set.
      get_admin_clients_paged: {
        Args: {
          p_limit: number;
          p_offset: number;
          p_search: string | null;
          p_filter: string;
          p_type: string;
          p_test: string;
          p_sort: string;
        };
        Returns: {
          client_id: string;
          client_email: string;
          client_full_name: string;
          client_phone: string;
          client_avatar_url: string;
          client_created_at: string;
          role: string;
          coach_kind: string;
          is_test_account: boolean;
          sub_tier: string;
          sub_status: string;
          sub_end_date: string;
          sub_months: number;
          pending_payments: number;
          assigned_coach_id: string | null;
          assigned_coach_name: string | null;
          assigned_coach_role: string | null;
          site_coach_id: string | null;
          site_coach_name: string | null;
          b2b_clients: number;
          site_members: number;
          total_count: string;
        }[];
      };
      get_admin_clients_stats: {
        Args: Record<string, never>;
        Returns: {
          total: string;
          member_site: string;
          client_of_coach: string;
          coach_site: string;
          coach_b2b: string;
          admin_count: string;
          test_count: string;
          active: string;
          expiring: string;
          expired: string;
          pending_payment: string;
        }[];
      };
    };
    Enums: {
      user_role: "client" | "coach" | "admin";
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
export type TicketMessage = Database["public"]["Tables"]["ticket_messages"]["Row"];
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
export type CoachPage = Database["public"]["Tables"]["coach_pages"]["Row"];
export type NutritionQuestionnaire = Database["public"]["Tables"]["nutrition_questionnaires"]["Row"];
export type FitnessQuestionnaire = Database["public"]["Tables"]["fitness_questionnaires"]["Row"];
export type ProgressPhoto = Database["public"]["Tables"]["progress_photos"]["Row"];
export type CoachAd = Database["public"]["Tables"]["coach_ads"]["Row"];
export type CoachTopupRequest = Database["public"]["Tables"]["coach_topup_requests"]["Row"];
export type CoachWalletTransaction = Database["public"]["Tables"]["coach_wallet_transactions"]["Row"];
export type EvoChatUsage = Database["public"]["Tables"]["evo_chat_usage"]["Row"];
export type EvoAnonUsage = Database["public"]["Tables"]["evo_anon_usage"]["Row"];
export type SiteCoachAssignment = Database["public"]["Tables"]["site_coach_assignments"]["Row"];
