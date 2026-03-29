import type {
  AnalyticsRun,
  AnalyticsSummary,
  AuthTokenResponse,
  AuthUser,
  IngestionRun,
  NormalizationRun,
  ReportArtifact,
  ReportRun,
  RawMatchPayloadSummary,
  RiotProfile
} from "@rift/shared-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = RequestInit & {
  token?: string;
};

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { token, ...fetchInit } = init;
  const headers = new Headers(fetchInit.headers);
  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchInit,
    headers
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(payload?.detail ?? "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export async function signup(credentials: AuthCredentials): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
}

export async function login(credentials: AuthCredentials): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", {
    token,
    cache: "no-store"
  });
}

export interface CreateRiotProfileInput {
  region: string;
  riot_id: string;
}

export async function createRiotProfile(
  token: string,
  payload: CreateRiotProfileInput
): Promise<RiotProfile> {
  return request<RiotProfile>("/riot-profiles", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function listRiotProfiles(token: string): Promise<RiotProfile[]> {
  return request<RiotProfile[]>("/riot-profiles", {
    token,
    cache: "no-store"
  });
}

export async function deleteRiotProfile(token: string, profileId: number): Promise<void> {
  return request<void>(`/riot-profiles/${profileId}`, {
    method: "DELETE",
    token
  });
}

export async function verifyRiotProfile(token: string, profileId: number): Promise<RiotProfile> {
  return request<RiotProfile>(`/riot-profiles/${profileId}/verify`, {
    method: "POST",
    token
  });
}

export async function makePrimaryRiotProfile(token: string, profileId: number): Promise<RiotProfile> {
  return request<RiotProfile>(`/riot-profiles/${profileId}/make-primary`, {
    method: "POST",
    token
  });
}

export interface CreateIngestionRunInput {
  riot_profile_id: number;
  max_matches?: number;
}

export async function createIngestionRun(
  token: string,
  payload: CreateIngestionRunInput
): Promise<IngestionRun> {
  return request<IngestionRun>("/ingestion-runs", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function listIngestionRuns(token: string): Promise<IngestionRun[]> {
  return request<IngestionRun[]>("/ingestion-runs", {
    token,
    cache: "no-store"
  });
}

export async function getIngestionRunMatches(
  token: string,
  runId: number
): Promise<RawMatchPayloadSummary[]> {
  return request<RawMatchPayloadSummary[]>(`/ingestion-runs/${runId}/matches`, {
    token,
    cache: "no-store"
  });
}

export interface CreateNormalizationRunInput {
  riot_profile_id: number;
}

export async function createNormalizationRun(
  token: string,
  payload: CreateNormalizationRunInput
): Promise<NormalizationRun> {
  return request<NormalizationRun>("/normalization-runs", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function listNormalizationRuns(token: string): Promise<NormalizationRun[]> {
  return request<NormalizationRun[]>("/normalization-runs", {
    token,
    cache: "no-store"
  });
}

export interface CreateAnalyticsRunInput {
  riot_profile_id: number;
}

export async function createAnalyticsRun(
  token: string,
  payload: CreateAnalyticsRunInput
): Promise<AnalyticsRun> {
  return request<AnalyticsRun>("/analytics-runs", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function listAnalyticsRuns(token: string): Promise<AnalyticsRun[]> {
  return request<AnalyticsRun[]>("/analytics-runs", {
    token,
    cache: "no-store"
  });
}

export async function getAnalyticsSummary(
  token: string,
  runId: number
): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>(`/analytics-runs/${runId}/summary`, {
    token,
    cache: "no-store"
  });
}

export interface CreateReportRunInput {
  riot_profile_id: number;
  analytics_run_id?: number;
}

export async function createReportRun(
  token: string,
  payload: CreateReportRunInput
): Promise<ReportRun> {
  return request<ReportRun>("/report-runs", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function listReportRuns(token: string): Promise<ReportRun[]> {
  return request<ReportRun[]>("/report-runs", {
    token,
    cache: "no-store"
  });
}

export async function getReportArtifact(
  token: string,
  runId: number
): Promise<ReportArtifact> {
  return request<ReportArtifact>(`/report-runs/${runId}/report`, {
    token,
    cache: "no-store"
  });
}

export { ApiError };
