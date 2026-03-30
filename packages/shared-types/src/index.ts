export interface HealthResponse {
  service: "api";
  status: "ok";
}

export interface VersionResponse {
  environment: string;
  service: "api";
  version: string;
}

export interface SystemReadiness {
  environment: string;
  workflow_mode: "server_configured_self_use";
  pipeline_ready: boolean;
  riot_api_configured: boolean;
  openai_api_configured: boolean;
  missing_requirements: string[];
  service: "api";
}

export interface AuthUser {
  id: number;
  email: string;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
}

export interface RiotProfile {
  id: number;
  user_id: number;
  game_name: string;
  tag_line: string;
  riot_id_display: string;
  riot_id_norm: string;
  region: string;
  puuid: string;
  account_region_routing: string;
  platform_region: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  last_verified_at: string;
}

export interface IngestionRun {
  id: number;
  user_id: number;
  riot_profile_id: number;
  status: "running" | "completed" | "failed";
  requested_max_matches: number;
  queue_id: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  match_ids_requested: number;
  match_ids_ingested_count: number;
  match_payloads_ingested_count: number;
  timeline_payloads_ingested_count: number;
}

export interface RawMatchPayloadSummary {
  id: number;
  ingestion_run_id: number;
  riot_profile_id: number;
  match_id: string;
  queue_id: number;
  game_version: string | null;
  platform_id: string | null;
  ingested_at: string;
}

export interface NormalizationRun {
  id: number;
  user_id: number;
  riot_profile_id: number;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  raw_match_rows_scanned: number;
  unique_matches_normalized: number;
  participants_rows_written: number;
  teams_rows_written: number;
  timeline_rows_written: number;
  events_rows_written: number;
}

export interface AnalyticsRun {
  id: number;
  user_id: number;
  riot_profile_id: number;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  matches_analyzed: number;
  source_snapshot_type: "latest_clean_snapshot";
  analytics_version: string;
}

export interface AnalyticsSummary {
  analytics_version: string;
  source_snapshot_type: "latest_clean_snapshot";
  overview: Record<string, unknown>;
  progression: Record<string, unknown>;
  splits: Record<string, unknown>;
  carry_context: Record<string, unknown>;
  macro: Record<string, unknown>;
  early_mid: Record<string, unknown>;
  data_quality: Record<string, unknown>;
}

export interface ReportRun {
  id: number;
  user_id: number;
  riot_profile_id: number;
  analytics_run_id: number;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  analytics_version: string;
  report_version: string;
  source_snapshot_type: "latest_clean_snapshot";
}

export interface StructuredReport {
  executive_summary: Record<string, unknown>;
  player_profile: Record<string, unknown>;
  strengths: Record<string, unknown>[];
  weaknesses: Record<string, unknown>[];
  priority_levers: Record<string, unknown>[];
  coaching_focus: Record<string, unknown>[];
  risk_flags: Record<string, unknown>[];
  confidence_and_limits: Record<string, unknown>;
  next_actions: Record<string, unknown>[];
}

export interface ReportArtifact {
  report_run_id: number;
  analytics_run_id: number;
  analytics_version: string;
  report_version: string;
  source_snapshot_type: "latest_clean_snapshot";
  prompt_id: string;
  prompt_version: string;
  report: StructuredReport;
}

export interface ContextualChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ContextualChatGrounding {
  riot_profile_id: number;
  report_run_id: number;
  analytics_run_id: number;
  analytics_version: string;
  report_version: string;
  source_snapshot_type: "latest_clean_snapshot";
  context_status: "current" | "stale";
  latest_completed_analytics_run_id: number | null;
}

export interface ContextualChatReply {
  answer_mode: "grounded" | "limited";
  scope_note: string;
  trace_labels: Array<
    | "priority_levers"
    | "coaching_focus"
    | "next_actions"
    | "strengths"
    | "weaknesses"
    | "confidence_and_limits"
    | "report_input.overview"
    | "report_input.macro"
    | "report_input.progression"
    | "report_input.data_quality"
    | "artifact_digest.signal_digest"
    | "artifact_digest.report_digest"
  >;
  answer: string;
  evidence_points: string[];
  limitation_points: string[];
  suggested_follow_up: string | null;
}

export interface ContextualChatResponse {
  grounding: ContextualChatGrounding;
  reply: ContextualChatReply;
}
