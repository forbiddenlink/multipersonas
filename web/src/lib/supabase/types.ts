export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          plan: "free" | "pro" | "team";
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "pro" | "team";
          stripe_customer_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          url: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          url: string;
          description?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };
      personas: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          config: Record<string, unknown>;
          is_custom: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description: string;
          config: Record<string, unknown>;
          is_custom?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["personas"]["Insert"]>;
      };
      test_runs: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          url: string;
          status: "pending" | "running" | "completed" | "failed" | "partial";
          overall_score: number | null;
          persona_ids: string[];
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          url: string;
          status?: "pending" | "running" | "completed" | "failed" | "partial";
          overall_score?: number | null;
          persona_ids: string[];
        };
        Update: Partial<Database["public"]["Tables"]["test_runs"]["Insert"]>;
      };
      findings: {
        Row: {
          id: string;
          test_run_id: string;
          persona_id: string;
          severity: "critical" | "serious" | "moderate" | "minor";
          category:
            | "accessibility"
            | "usability"
            | "performance"
            | "content";
          title: string;
          description: string;
          recommendation: string;
          page_url: string;
          screenshot_url: string | null;
          dismissed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          test_run_id: string;
          persona_id: string;
          severity: "critical" | "serious" | "moderate" | "minor";
          category:
            | "accessibility"
            | "usability"
            | "performance"
            | "content";
          title: string;
          description: string;
          recommendation: string;
          page_url: string;
          screenshot_url?: string | null;
          dismissed?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["findings"]["Insert"]>;
      };
    };
  };
}
