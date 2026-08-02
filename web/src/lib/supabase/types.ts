export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          kind: string
          persona_ids: string[]
          project_id: string | null
          reserved_calls: number
          result: Json | null
          started_at: string | null
          status: string
          url: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          persona_ids?: string[]
          project_id?: string | null
          reserved_calls?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          url: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          persona_ids?: string[]
          project_id?: string | null
          reserved_calls?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          category: string
          created_at: string
          description: string
          dismissed: boolean
          id: string
          page_url: string
          persona_id: string
          recommendation: string
          rule_id: string | null
          screenshot_url: string | null
          severity: string
          source: string
          target: string | null
          test_run_id: string
          title: string
          wcag_tags: string[] | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          dismissed?: boolean
          id?: string
          page_url: string
          persona_id: string
          recommendation: string
          rule_id?: string | null
          screenshot_url?: string | null
          severity: string
          source?: string
          target?: string | null
          test_run_id: string
          title: string
          wcag_tags?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          dismissed?: boolean
          id?: string
          page_url?: string
          persona_id?: string
          recommendation?: string
          rule_id?: string | null
          screenshot_url?: string | null
          severity?: string
          source?: string
          target?: string | null
          test_run_id?: string
          title?: string
          wcag_tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "findings_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      grader_scans: {
        Row: {
          created_at: string
          entry_url: string
          error: string | null
          job_id: string | null
          pages_visited: string[]
          report: Json | null
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          entry_url: string
          error?: string | null
          job_id?: string | null
          pages_visited?: string[]
          report?: Json | null
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          entry_url?: string
          error?: string | null
          job_id?: string | null
          pages_visited?: string[]
          report?: Json | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "grader_scans_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "audit_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_steps: {
        Row: {
          action: string
          detail: string | null
          goal_completed: boolean
          id: string
          page_url: string | null
          persona_id: string
          reasoning: string | null
          screenshot_path: string | null
          step: number
          test_run_id: string
          ts: string
        }
        Insert: {
          action: string
          detail?: string | null
          goal_completed?: boolean
          id?: string
          page_url?: string | null
          persona_id: string
          reasoning?: string | null
          screenshot_path?: string | null
          step: number
          test_run_id: string
          ts?: string
        }
        Update: {
          action?: string
          detail?: string | null
          goal_completed?: boolean
          id?: string
          page_url?: string | null
          persona_id?: string
          reasoning?: string | null
          screenshot_path?: string | null
          step?: number
          test_run_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_steps_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          config: Json
          created_at: string
          description: string
          id: string
          is_custom: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description: string
          id?: string
          is_custom?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string
          id?: string
          is_custom?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_name: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          plan: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          agency_name?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          plan?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_name?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          plan?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      test_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          persona_ids: string[]
          project_id: string | null
          started_at: string | null
          status: string
          task_success_achieved: number | null
          task_success_total: number | null
          url: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          persona_ids?: string[]
          project_id?: string | null
          started_at?: string | null
          status?: string
          task_success_achieved?: number | null
          task_success_total?: number | null
          url: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          persona_ids?: string[]
          project_id?: string | null
          started_at?: string | null
          status?: string
          task_success_achieved?: number | null
          task_success_total?: number | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          day: string
          model_calls: number
          runs: number
        }
        Insert: {
          day: string
          model_calls?: number
          runs?: number
        }
        Update: {
          day?: string
          model_calls?: number
          runs?: number
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          note: string | null
          sites_count: string | null
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          note?: string | null
          sites_count?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          note?: string | null
          sites_count?: string | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_audit_job: {
        Args: never
        Returns: {
          attempts: number
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          kind: string
          persona_ids: string[]
          project_id: string | null
          reserved_calls: number
          result: Json | null
          started_at: string | null
          status: string
          url: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "audit_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      reap_stale_audit_jobs: {
        Args: { p_max_attempts: number; p_timeout_seconds: number }
        Returns: number
      }
      release_model_calls: { Args: { p_calls: number }; Returns: undefined }
      reserve_model_calls: {
        Args: { p_calls: number; p_cap: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

