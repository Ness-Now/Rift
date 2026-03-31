"use client";

import type {
  AnalyticsRun,
  IngestionRun,
  NormalizationRun,
  ReportRun,
  RiotProfile,
  SystemReadiness
} from "@rift/shared-types";
import { useEffect, useMemo, useState } from "react";

import {
  ApiError,
  createAnalyticsRun,
  createIngestionRun,
  createNormalizationRun,
  createReportRun,
  getSystemReadiness,
  listAnalyticsRuns,
  listIngestionRuns,
  listNormalizationRuns,
  listReportRuns
} from "@/lib/api";
import { formatMetric } from "@/lib/dashboard";

import { buildFreshnessState, type FreshnessState } from "./frozen-seams";
import { DashboardPanel, SectionEyebrow, SectionHeading, StatusChip } from "./primitives";

const DEFAULT_MAX_MATCHES = 50;
const MAX_MATCHES_UPPER_BOUND = 200;

type StageKey = "ingestion" | "normalization" | "analytics" | "report";

type StageDisplayStatus = "idle" | "queued" | "running" | "completed" | "failed";

type StageRun = IngestionRun | NormalizationRun | AnalyticsRun | ReportRun;

type AnalysisOrchestratorProps = {
  token: string;
  profiles: RiotProfile[];
  selectedProfileId: number | null;
  onSelectedProfileIdChange: (profileId: number) => void;
  onPipelineComplete: () => Promise<void>;
};

type PipelineRuns = {
  ingestion: IngestionRun | null;
  normalization: NormalizationRun | null;
  analytics: AnalyticsRun | null;
  report: ReportRun | null;
};

type ReadinessTone = "neutral" | "positive" | "warning";

type ReadinessState = {
  headline: string;
  detail: string;
  tone: ReadinessTone;
  canRun: boolean;
};

type BlockingState = {
  headline: string;
  detail: string;
  tone: ReadinessTone;
  nextStep: string;
};

type FailedStage = {
  stage: StageKey;
  run: StageRun;
};

const EMPTY_PIPELINE_RUNS: PipelineRuns = {
  ingestion: null,
  normalization: null,
  analytics: null,
  report: null
};

const STAGE_ORDER: StageKey[] = ["ingestion", "normalization", "analytics", "report"];

export function AnalysisOrchestrator({
  token,
  profiles,
  selectedProfileId,
  onSelectedProfileIdChange,
  onPipelineComplete
}: AnalysisOrchestratorProps) {
  const [ingestionRuns, setIngestionRuns] = useState<IngestionRun[]>([]);
  const [normalizationRuns, setNormalizationRuns] = useState<NormalizationRun[]>([]);
  const [analyticsRuns, setAnalyticsRuns] = useState<AnalyticsRun[]>([]);
  const [reportRuns, setReportRuns] = useState<ReportRun[]>([]);
  const [readiness, setReadiness] = useState<SystemReadiness | null>(null);
  const [maxMatches, setMaxMatches] = useState(String(DEFAULT_MAX_MATCHES));
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [activeStage, setActiveStage] = useState<StageKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRuns>(EMPTY_PIPELINE_RUNS);

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  async function loadState() {
    setIsLoading(true);
    try {
      const [
        nextReadiness,
        nextIngestionRuns,
        nextNormalizationRuns,
        nextAnalyticsRuns,
        nextReportRuns
      ] = await Promise.all([
        getSystemReadiness(),
        listIngestionRuns(token),
        listNormalizationRuns(token),
        listAnalyticsRuns(token),
        listReportRuns(token)
      ]);

      setReadiness(nextReadiness);
      setIngestionRuns(nextIngestionRuns);
      setNormalizationRuns(nextNormalizationRuns);
      setAnalyticsRuns(nextAnalyticsRuns);
      setReportRuns(nextReportRuns);
      setError(null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to load the current pipeline state.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, [token]);

  const latestIngestionRun = useMemo(
    () => pipelineRuns.ingestion ?? latestRunForProfile(ingestionRuns, selectedProfileId),
    [ingestionRuns, pipelineRuns.ingestion, selectedProfileId]
  );
  const latestNormalizationRun = useMemo(
    () => pipelineRuns.normalization ?? latestRunForProfile(normalizationRuns, selectedProfileId),
    [normalizationRuns, pipelineRuns.normalization, selectedProfileId]
  );
  const latestAnalyticsRun = useMemo(
    () => pipelineRuns.analytics ?? latestRunForProfile(analyticsRuns, selectedProfileId),
    [analyticsRuns, pipelineRuns.analytics, selectedProfileId]
  );
  const latestReportRun = useMemo(
    () => pipelineRuns.report ?? latestRunForProfile(reportRuns, selectedProfileId),
    [pipelineRuns.report, reportRuns, selectedProfileId]
  );

  const latestCompletedIngestion = useMemo(
    () => latestCompletedRunForProfile(ingestionRuns, selectedProfileId),
    [ingestionRuns, selectedProfileId]
  );
  const latestCompletedNormalization = useMemo(
    () => latestCompletedRunForProfile(normalizationRuns, selectedProfileId),
    [normalizationRuns, selectedProfileId]
  );
  const latestCompletedAnalytics = useMemo(
    () => latestCompletedRunForProfile(analyticsRuns, selectedProfileId),
    [analyticsRuns, selectedProfileId]
  );
  const latestCompletedReport = useMemo(
    () => latestCompletedRunForProfile(reportRuns, selectedProfileId),
    [reportRuns, selectedProfileId]
  );

  const latestFailedStage = useMemo(
    () => latestFailedStageForProfile({
      profileId: selectedProfileId,
      ingestionRuns,
      normalizationRuns,
      analyticsRuns,
      reportRuns
    }),
    [analyticsRuns, ingestionRuns, normalizationRuns, reportRuns, selectedProfileId]
  );
  const latestStableTimestamp = Math.max(
    latestCompletedIngestion ? timestampForRun(latestCompletedIngestion) : 0,
    latestCompletedNormalization ? timestampForRun(latestCompletedNormalization) : 0,
    latestCompletedAnalytics ? timestampForRun(latestCompletedAnalytics) : 0,
    latestCompletedReport ? timestampForRun(latestCompletedReport) : 0
  );

  const readinessState = buildReadinessState(readiness, profiles, selectedProfile);
  const freshnessState = buildFreshnessState({
    latestCompletedIngestion,
    latestCompletedNormalization,
    latestCompletedAnalytics,
    latestCompletedReport
  });
  const blockingState = buildBlockingState({
    readiness,
    readinessState,
    selectedProfile,
    latestFailedStage,
    latestCompletedReport,
    latestStableTimestamp,
    freshnessState
  });

  async function handleRunFullAnalysis() {
    if (!readinessState.canRun || selectedProfileId === null) {
      setError(blockingState.detail);
      return;
    }

    const requestedMaxMatches = Number(maxMatches);
    if (!Number.isInteger(requestedMaxMatches) || requestedMaxMatches < 1 || requestedMaxMatches > MAX_MATCHES_UPPER_BOUND) {
      setError(`Max matches must be a whole number between 1 and ${MAX_MATCHES_UPPER_BOUND}.`);
      return;
    }

    setIsRunningPipeline(true);
    setActiveStage("ingestion");
    setError(null);
    setSuccessMessage(null);
    setPipelineRuns(EMPTY_PIPELINE_RUNS);

    try {
      const ingestionRun = await createIngestionRun(token, {
        riot_profile_id: selectedProfileId,
        max_matches: requestedMaxMatches
      });
      setPipelineRuns((current) => ({ ...current, ingestion: ingestionRun }));
      ensureCompleted("Ingestion", ingestionRun.status, ingestionRun.error_message);

      setActiveStage("normalization");
      const normalizationRun = await createNormalizationRun(token, {
        riot_profile_id: selectedProfileId
      });
      setPipelineRuns((current) => ({ ...current, normalization: normalizationRun }));
      ensureCompleted("Normalization", normalizationRun.status, normalizationRun.error_message);

      setActiveStage("analytics");
      const analyticsRun = await createAnalyticsRun(token, {
        riot_profile_id: selectedProfileId
      });
      setPipelineRuns((current) => ({ ...current, analytics: analyticsRun }));
      ensureCompleted("Analytics", analyticsRun.status, analyticsRun.error_message);

      setActiveStage("report");
      const reportRun = await createReportRun(token, {
        riot_profile_id: selectedProfileId,
        analytics_run_id: analyticsRun.id
      });
      setPipelineRuns((current) => ({ ...current, report: reportRun }));
      ensureCompleted("Report", reportRun.status, reportRun.error_message);

      await Promise.all([loadState(), onPipelineComplete()]);
      setSuccessMessage(`Displayed coaching refreshed from report run #${reportRun.id}.`);
      document.getElementById("coaching-board")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (requestError) {
      setError(buildStageFailureMessage(activeStage, requestError));
      await loadState();
    } finally {
      setActiveStage(null);
      setIsRunningPipeline(false);
    }
  }

  const stageCards = [
    buildStageCard("ingestion", latestIngestionRun, activeStage, isRunningPipeline),
    buildStageCard("normalization", latestNormalizationRun, activeStage, isRunningPipeline),
    buildStageCard("analytics", latestAnalyticsRun, activeStage, isRunningPipeline),
    buildStageCard("report", latestReportRun, activeStage, isRunningPipeline)
  ];

  const readinessModeLabel = readiness
    ? `${formatWorkflowMode(readiness.workflow_mode)} (${readiness.environment})`
    : "Checking environment";
  const missingRequirementsLabel = readiness && readiness.missing_requirements.length > 0
    ? readiness.missing_requirements.join(", ")
    : "None";

  return (
    <DashboardPanel className="p-6 sm:p-7">
      <SectionHeading
        action={
          <div className="flex flex-wrap items-center gap-3">
            {selectedProfile ? <StatusChip label={selectedProfile.riot_id_display} tone="neutral" /> : null}
            {latestCompletedReport ? (
              <a
                className="rounded-full border border-glow/16 bg-glow/10 px-4 py-2 text-sm font-medium text-glow transition hover:border-glow/28 hover:text-white"
                href="#coaching-board"
              >
                View displayed coaching
              </a>
            ) : null}
          </div>
        }
        description="Run the current self-use pipeline from one place. The workbench remains available below for manual control, but this surface now owns the default coaching workflow."
        title="Run Full Analysis"
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <DashboardPanel className="border-glow/14 bg-gradient-to-br from-glow/10 via-transparent to-transparent p-5">
            <SectionEyebrow tone="gold">Pipeline action</SectionEyebrow>
            <h3 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">
              Choose a profile, run the pipeline, then read the coaching surface.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-frost/64">
              This current self-use flow runs ingestion, normalization, analytics, and report generation in sequence for the selected Riot profile. It depends on server-side Riot and OpenAI configuration being present in this environment.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_0.7fr_auto]">
              <label className="space-y-2">
                <span className="dashboard-tactical-label text-frost/34">Riot profile</span>
                <select
                  className="w-full rounded-[1.3rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-glow/22"
                  disabled={profiles.length === 0 || isRunningPipeline}
                  onChange={(event) => onSelectedProfileIdChange(Number(event.target.value))}
                  value={selectedProfileId ?? ""}
                >
                  {profiles.length === 0 ? <option value="">No profiles available</option> : null}
                  {profiles.map((profile) => (
                    <option key={profile.id} className="bg-midnight text-white" value={profile.id}>
                      {profile.riot_id_display}{profile.is_primary ? " (Primary)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="dashboard-tactical-label text-frost/34">Max matches</span>
                <input
                  className="w-full rounded-[1.3rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-glow/22"
                  disabled={isRunningPipeline}
                  max={MAX_MATCHES_UPPER_BOUND}
                  min={1}
                  onChange={(event) => setMaxMatches(event.target.value)}
                  step={1}
                  type="number"
                  value={maxMatches}
                />
              </label>

              <button
                className="mt-6 rounded-[1.3rem] bg-white px-5 py-3 text-sm font-semibold text-night transition hover:bg-frost disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!readinessState.canRun || isRunningPipeline || selectedProfileId === null}
                onClick={() => {
                  void handleRunFullAnalysis();
                }}
                type="button"
              >
                {isRunningPipeline ? `Running ${formatStageLabel(activeStage)}...` : "Run full analysis"}
              </button>
            </div>

            <div className="dashboard-line my-5" />
            <div className="flex flex-wrap gap-3">
              <StatusChip label={readinessState.headline} tone={readinessState.tone} />
              <StatusChip label={freshnessState.headline} tone={freshnessState.tone} />
              <a
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-frost/72 transition hover:border-white/18 hover:text-white"
                href="#workbench"
              >
                Open workbench
              </a>
            </div>
          </DashboardPanel>

          {successMessage ? (
            <div className="rounded-[1.4rem] border border-glow/18 bg-glow/10 px-4 py-4">
              <p className="text-sm font-semibold text-white">{successMessage}</p>
              <p className="mt-2 text-sm leading-7 text-frost/72">
                {freshnessState.isCurrent
                  ? "The visible coaching surface is now aligned with the latest completed artifact chain."
                  : "The visible coaching surface may still sit behind newer upstream artifacts."}
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[1.4rem] border border-gold/20 bg-gold/10 px-4 py-4">
              <p className="text-sm font-semibold text-white">Pipeline issue</p>
              <p className="mt-2 text-sm leading-7 text-frost/78">{error}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <DashboardPanel className="p-5">
            <SectionEyebrow tone="steel">Readiness and trust</SectionEyebrow>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <article className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="dashboard-tactical-label text-frost/34">Environment mode</p>
                <p className="mt-3 text-sm font-semibold text-white">{readinessModeLabel}</p>
                <p className="mt-3 text-sm leading-6 text-frost/60">
                  Missing requirements: {missingRequirementsLabel}
                </p>
              </article>
              <article className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="dashboard-tactical-label text-frost/34">Launch readiness</p>
                    <p className="mt-3 text-sm font-semibold text-white">{readinessState.headline}</p>
                  </div>
                  <StatusChip label={readinessState.tone === "positive" ? "Ready" : "Attention"} tone={readinessState.tone} />
                </div>
                <p className="mt-3 text-sm leading-6 text-frost/60">{readinessState.detail}</p>
              </article>
              <article className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="dashboard-tactical-label text-frost/34">End-to-end freshness</p>
                    <p className="mt-3 text-sm font-semibold text-white">{freshnessState.headline}</p>
                  </div>
                  <StatusChip label={freshnessState.isCurrent ? "Coherent" : "Mixed"} tone={freshnessState.tone} />
                </div>
                <p className="mt-3 text-sm leading-6 text-frost/60">{freshnessState.detail}</p>
              </article>
            </div>
          </DashboardPanel>

          <DashboardPanel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SectionEyebrow tone="gold">Latest blocking issue</SectionEyebrow>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                  {blockingState.headline}
                </h3>
              </div>
              <StatusChip label={blockingState.tone === "positive" ? "Clear" : "Needs attention"} tone={blockingState.tone} />
            </div>
            <p className="mt-4 text-sm leading-7 text-frost/62">{blockingState.detail}</p>
            <div className="dashboard-line my-5" />
            <p className="text-sm leading-7 text-frost/72">{blockingState.nextStep}</p>
          </DashboardPanel>

          <DashboardPanel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SectionEyebrow tone="steel">Known stage status</SectionEyebrow>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                  Latest known run per stage
                </h3>
              </div>
              {isLoading ? <StatusChip label="Refreshing" tone="warning" /> : null}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {stageCards.map((card) => (
                <article key={card.key} className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="dashboard-tactical-label text-frost/34">{card.label}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{card.headline}</p>
                    </div>
                    {renderStageChip(card.status)}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-frost/60">{card.detail}</p>
                </article>
              ))}
            </div>
          </DashboardPanel>
        </div>
      </div>
    </DashboardPanel>
  );
}

function latestRunForProfile<T extends { id: number; riot_profile_id: number }>(
  runs: T[],
  profileId: number | null
): T | null {
  if (profileId === null) {
    return null;
  }

  let latest: T | null = null;
  for (const run of runs) {
    if (run.riot_profile_id !== profileId) {
      continue;
    }
    if (latest === null || run.id > latest.id) {
      latest = run;
    }
  }
  return latest;
}

function latestCompletedRunForProfile<T extends { id: number; riot_profile_id: number; status: string }>(
  runs: T[],
  profileId: number | null
): T | null {
  return latestRunForProfile(
    runs.filter((run) => run.status === "completed"),
    profileId
  );
}

function latestFailedRunForProfile<T extends { id: number; riot_profile_id: number; status: string }>(
  runs: T[],
  profileId: number | null
): T | null {
  return latestRunForProfile(
    runs.filter((run) => run.status === "failed"),
    profileId
  );
}

function latestFailedStageForProfile({
  profileId,
  ingestionRuns,
  normalizationRuns,
  analyticsRuns,
  reportRuns
}: {
  profileId: number | null;
  ingestionRuns: IngestionRun[];
  normalizationRuns: NormalizationRun[];
  analyticsRuns: AnalyticsRun[];
  reportRuns: ReportRun[];
}): FailedStage | null {
  const failedStages: FailedStage[] = [];
  const failedIngestion = latestFailedRunForProfile(ingestionRuns, profileId);
  const failedNormalization = latestFailedRunForProfile(normalizationRuns, profileId);
  const failedAnalytics = latestFailedRunForProfile(analyticsRuns, profileId);
  const failedReport = latestFailedRunForProfile(reportRuns, profileId);

  if (failedIngestion) {
    failedStages.push({ stage: "ingestion", run: failedIngestion });
  }
  if (failedNormalization) {
    failedStages.push({ stage: "normalization", run: failedNormalization });
  }
  if (failedAnalytics) {
    failedStages.push({ stage: "analytics", run: failedAnalytics });
  }
  if (failedReport) {
    failedStages.push({ stage: "report", run: failedReport });
  }

  if (failedStages.length === 0) {
    return null;
  }

  return failedStages.reduce((latest, current) =>
    timestampForRun(current.run) > timestampForRun(latest.run) ? current : latest
  );
}

function ensureCompleted(stage: string, status: "running" | "completed" | "failed", errorMessage: string | null) {
  if (status === "completed") {
    return;
  }

  if (status === "failed") {
    throw new Error(errorMessage ?? `${stage} failed.`);
  }

  throw new Error(`${stage} did not complete in the current request cycle.`);
}

function buildStageCard(
  key: StageKey,
  run: IngestionRun | NormalizationRun | AnalyticsRun | ReportRun | null,
  activeStage: StageKey | null,
  isRunningPipeline: boolean
) {
  const stageIndex = STAGE_ORDER.indexOf(key);
  const activeStageIndex = activeStage ? STAGE_ORDER.indexOf(activeStage) : -1;

  let status: StageDisplayStatus;
  if (isRunningPipeline && activeStage === key) {
    status = "running";
  } else if (isRunningPipeline && activeStageIndex !== -1 && stageIndex > activeStageIndex) {
    status = "queued";
  } else if (run?.status === "completed") {
    status = "completed";
  } else if (run?.status === "failed") {
    status = "failed";
  } else if (run?.status === "running") {
    status = "running";
  } else {
    status = "idle";
  }

  return {
    key,
    label: formatStageLabel(key),
    headline: buildStageHeadline(key, run),
    detail: buildStageDetail(key, run, status),
    status
  };
}

function buildStageHeadline(
  key: StageKey,
  run: IngestionRun | NormalizationRun | AnalyticsRun | ReportRun | null
) {
  if (!run) {
    return "No run yet";
  }

  if (key === "ingestion") {
    return `Run #${run.id} - ${formatMetric((run as IngestionRun).match_ids_ingested_count, 0)} queue-420 matches`;
  }
  if (key === "normalization") {
    return `Run #${run.id} - ${formatMetric((run as NormalizationRun).unique_matches_normalized, 0)} clean matches`;
  }
  if (key === "analytics") {
    return `Run #${run.id} - ${formatMetric((run as AnalyticsRun).matches_analyzed, 0)} matches analyzed`;
  }
  return `Run #${run.id} - ${(run as ReportRun).report_version}`;
}

function buildStageDetail(
  key: StageKey,
  run: IngestionRun | NormalizationRun | AnalyticsRun | ReportRun | null,
  status: StageDisplayStatus
) {
  if (!run) {
    if (status === "queued") {
      return "Queued inside the current pipeline run.";
    }
    return "No completed run yet for the selected profile.";
  }

  if (status === "running") {
    return `Started ${formatRelativeTime(run.started_at)}.`;
  }
  if (status === "failed") {
    return `${run.error_message ?? "The latest run failed."} Last attempt ${formatRelativeTime(run.completed_at ?? run.started_at)}.`;
  }

  if (key === "ingestion") {
    const ingestionRun = run as IngestionRun;
    return `${formatMetric(ingestionRun.requested_max_matches, 0)} requested - ${formatMetric(ingestionRun.match_payloads_ingested_count, 0)} match payloads - ${formatMetric(ingestionRun.timeline_payloads_ingested_count, 0)} timelines - completed ${formatRelativeTime(run.completed_at)}.`;
  }
  if (key === "normalization") {
    const normalizationRun = run as NormalizationRun;
    return `${formatMetric(normalizationRun.participants_rows_written, 0)} participants - ${formatMetric(normalizationRun.teams_rows_written, 0)} teams written - completed ${formatRelativeTime(run.completed_at)}.`;
  }
  if (key === "analytics") {
    const analyticsRun = run as AnalyticsRun;
    return `${analyticsRun.analytics_version} - ${analyticsRun.source_snapshot_type} - completed ${formatRelativeTime(run.completed_at)}.`;
  }

  const reportRun = run as ReportRun;
  return `${reportRun.report_version} from analytics run #${reportRun.analytics_run_id} - completed ${formatRelativeTime(run.completed_at)}.`;
}

function buildReadinessState(
  readiness: SystemReadiness | null,
  profiles: RiotProfile[],
  selectedProfile: RiotProfile | null
): ReadinessState {
  if (readiness === null) {
    return {
      headline: "Checking readiness",
      detail: "Reading environment readiness and the latest pipeline history.",
      tone: "neutral",
      canRun: false
    };
  }

  if (!readiness.pipeline_ready) {
    return {
      headline: "Environment missing server-side config",
      detail: readiness.missing_requirements.length > 0
        ? `This self-use mode still depends on ${readiness.missing_requirements.join(", ")} being configured on the server.`
        : "The self-use environment is not ready to launch the full pipeline.",
      tone: "warning",
      canRun: false
    };
  }

  if (profiles.length === 0) {
    return {
      headline: "Link a Riot profile first",
      detail: "The environment is ready, but no owned Riot profile is linked to this account yet.",
      tone: "warning",
      canRun: false
    };
  }

  if (selectedProfile === null) {
    return {
      headline: "Select an owned profile",
      detail: "Choose which linked Riot profile should drive the next pipeline run.",
      tone: "warning",
      canRun: false
    };
  }

  return {
    headline: "Ready to run",
    detail: `${selectedProfile.riot_id_display} can launch the current self-use pipeline from ingestion through report generation.`,
    tone: "positive",
    canRun: true
  };
}

function buildBlockingState({
  readiness,
  readinessState,
  selectedProfile,
  latestFailedStage,
  latestCompletedReport,
  latestStableTimestamp,
  freshnessState
}: {
  readiness: SystemReadiness | null;
  readinessState: ReadinessState;
  selectedProfile: RiotProfile | null;
  latestFailedStage: FailedStage | null;
  latestCompletedReport: ReportRun | null;
  latestStableTimestamp: number;
  freshnessState: FreshnessState;
}): BlockingState {
  if (readiness === null) {
    return {
      headline: "Checking environment and run history",
      detail: "Readiness is still loading, so the product cannot yet confirm whether the current self-use workflow is runnable.",
      tone: "neutral",
      nextStep: "Wait for the readiness check to complete before launching the full pipeline."
    };
  }

  if (!readinessState.canRun) {
    return {
      headline: readinessState.headline,
      detail: readinessState.detail,
      tone: readinessState.tone,
      nextStep: readiness.pipeline_ready
        ? "Choose or link the Riot profile that should drive the next coaching run."
        : "Add the missing server-side environment requirements, then return to run the full pipeline."
    };
  }

  if (latestFailedStage && timestampForRun(latestFailedStage.run) > latestStableTimestamp) {
    return {
      headline: `${formatStageLabel(latestFailedStage.stage)} failed last`,
      detail: latestFailedStage.run.error_message ?? "The latest run failed without a stored error message.",
      tone: "warning",
      nextStep: getStageNextStep(latestFailedStage.stage, selectedProfile)
    };
  }

  if (!latestCompletedReport) {
    return {
      headline: "No completed coaching artifact yet",
      detail: "The selected profile is ready, but the product does not yet have a finished report chain to hand off.",
      tone: "warning",
      nextStep: "Run the full pipeline once, then open the coaching board when the report stage completes."
    };
  }

  if (!freshnessState.isCurrent) {
    return {
      headline: freshnessState.headline,
      detail: freshnessState.detail,
      tone: freshnessState.tone,
      nextStep: "Refresh the full pipeline if you want the coaching surface to reflect the latest successful upstream data."
    };
  }

  return {
    headline: "Coaching handoff is clear",
    detail: "The current coaching chain is complete and there is no newer upstream stage waiting to be folded into the visible report.",
    tone: "positive",
    nextStep: "Jump to the Coaching Board to read the latest structured guidance."
  };
}

function buildStageFailureMessage(stage: StageKey | null, requestError: unknown) {
  const stageLabel = formatStageLabel(stage);
  const detail =
    requestError instanceof ApiError
      ? requestError.message
      : requestError instanceof Error
        ? requestError.message
        : "Unexpected pipeline failure.";

  return `${stageLabel} failed. ${detail}`;
}

function getStageNextStep(stage: StageKey, selectedProfile: RiotProfile | null) {
  if (stage === "ingestion") {
    return selectedProfile
      ? `Check Riot API readiness, confirm ${selectedProfile.riot_id_display} is still valid, then rerun the pipeline or inspect ingestion in the workbench.`
      : "Check Riot API readiness and the selected profile, then rerun the pipeline.";
  }
  if (stage === "normalization") {
    return "Inspect the latest raw ingestion output in the workbench, then rerun normalization once the raw match set looks correct.";
  }
  if (stage === "analytics") {
    return "Inspect the latest clean snapshot in the workbench, then rerun analytics once normalization is complete.";
  }
  return "Check OpenAI server-side readiness, then rerun the report stage or relaunch the full pipeline.";
}

function renderStageChip(status: StageDisplayStatus) {
  if (status === "completed") {
    return <StatusChip label="Completed" tone="positive" />;
  }
  if (status === "running") {
    return <StatusChip label="Running" tone="warning" />;
  }
  if (status === "queued") {
    return <StatusChip label="Queued" tone="neutral" />;
  }
  if (status === "failed") {
    return <StatusChip label="Failed" tone="warning" />;
  }
  return <StatusChip label="Idle" tone="neutral" />;
}

function formatStageLabel(stage: StageKey | null) {
  if (stage === null) {
    return "Pipeline";
  }
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function formatWorkflowMode(value: string) {
  if (value === "server_configured_self_use") {
    return "Server-configured self-use";
  }
  return value;
}

function timestampForRun(run: StageRun) {
  return parseIsoTimestamp(run.completed_at ?? run.started_at);
}

function parseIsoTimestamp(value: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isRunNewer(newerRun: StageRun | null, olderRun: StageRun | null) {
  if (!newerRun || !olderRun) {
    return false;
  }
  return timestampForRun(newerRun) > timestampForRun(olderRun);
}

function isOlderThanHours(value: string | null, hours: number) {
  const timestamp = parseIsoTimestamp(value);
  if (timestamp === 0) {
    return false;
  }
  return Date.now() - timestamp > hours * 60 * 60 * 1000;
}

function formatRelativeTime(value: string | null) {
  const timestamp = parseIsoTimestamp(value);
  if (timestamp === 0) {
    return "at an unknown time";
  }

  const diffMilliseconds = Date.now() - timestamp;
  if (diffMilliseconds < 60_000) {
    return "just now";
  }

  const diffMinutes = Math.round(diffMilliseconds / 60_000);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
