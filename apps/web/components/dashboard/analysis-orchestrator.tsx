"use client";

import type {
  AnalyticsRun,
  IngestionRun,
  NormalizationRun,
  ReportRun,
  RiotProfile
} from "@rift/shared-types";
import { useEffect, useMemo, useState } from "react";

import {
  ApiError,
  createAnalyticsRun,
  createIngestionRun,
  createNormalizationRun,
  createReportRun,
  listAnalyticsRuns,
  listIngestionRuns,
  listNormalizationRuns,
  listReportRuns
} from "@/lib/api";
import { formatMetric } from "@/lib/dashboard";

import { DashboardPanel, SectionEyebrow, SectionHeading, StatusChip } from "./primitives";

const DEFAULT_MAX_MATCHES = 50;
const MAX_MATCHES_UPPER_BOUND = 200;

type StageKey = "ingestion" | "normalization" | "analytics" | "report";

type StageDisplayStatus = "idle" | "queued" | "running" | "completed" | "failed";

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
  const [maxMatches, setMaxMatches] = useState(String(DEFAULT_MAX_MATCHES));
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [activeStage, setActiveStage] = useState<StageKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRuns>(EMPTY_PIPELINE_RUNS);

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  async function loadRuns() {
    setIsLoading(true);
    try {
      const [nextIngestionRuns, nextNormalizationRuns, nextAnalyticsRuns, nextReportRuns] = await Promise.all([
        listIngestionRuns(token),
        listNormalizationRuns(token),
        listAnalyticsRuns(token),
        listReportRuns(token)
      ]);
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
    void loadRuns();
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

  async function handleRunFullAnalysis() {
    if (selectedProfileId === null) {
      setError("Choose an owned Riot profile before running the full analysis.");
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

      await Promise.all([loadRuns(), onPipelineComplete()]);
      setSuccessMessage(`Coaching output refreshed from report run #${reportRun.id}.`);
      document.getElementById("coaching-board")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Unable to complete the full analysis workflow.");
      }
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

  return (
    <DashboardPanel className="p-6 sm:p-7">
      <SectionHeading
        action={
          <div className="flex flex-wrap items-center gap-3">
            {selectedProfile ? <StatusChip label={selectedProfile.riot_id_display} tone="neutral" /> : null}
            {latestReportRun?.status === "completed" ? (
              <a
                className="rounded-full border border-glow/16 bg-glow/10 px-4 py-2 text-sm font-medium text-glow transition hover:border-glow/28 hover:text-white"
                href="#coaching-board"
              >
                View latest coaching
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
              This current self-use flow runs ingestion, normalization, analytics, and report generation in sequence for the selected Riot profile using the server-side configuration already present in this environment.
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
                disabled={profiles.length === 0 || isRunningPipeline || selectedProfileId === null}
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
              <StatusChip
                label={selectedProfile ? `Primary focus: ${selectedProfile.riot_id_display}` : "Choose a profile"}
                tone={selectedProfile ? "positive" : "warning"}
              />
              <StatusChip label="Server-side Riot/OpenAI config" tone="neutral" />
              <a
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-frost/72 transition hover:border-white/18 hover:text-white"
                href="#workbench"
              >
                Open workbench
              </a>
            </div>
          </DashboardPanel>

          {successMessage ? (
            <p className="rounded-[1.4rem] border border-glow/18 bg-glow/10 px-4 py-4 text-sm leading-7 text-frost/78">
              {successMessage}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-[1.4rem] border border-gold/20 bg-gold/10 px-4 py-4 text-sm leading-7 text-frost/78">
              {error}
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          <DashboardPanel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SectionEyebrow tone="steel">Current pipeline state</SectionEyebrow>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                  Latest run chain for this profile
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
    return `Started at ${run.started_at}.`;
  }
  if (status === "failed") {
    return run.error_message ?? "The latest run failed.";
  }

  if (key === "ingestion") {
    const ingestionRun = run as IngestionRun;
    return `${formatMetric(ingestionRun.requested_max_matches, 0)} requested - ${formatMetric(ingestionRun.match_payloads_ingested_count, 0)} match payloads - ${formatMetric(ingestionRun.timeline_payloads_ingested_count, 0)} timelines`;
  }
  if (key === "normalization") {
    const normalizationRun = run as NormalizationRun;
    return `${formatMetric(normalizationRun.participants_rows_written, 0)} participants - ${formatMetric(normalizationRun.teams_rows_written, 0)} teams written`;
  }
  if (key === "analytics") {
    const analyticsRun = run as AnalyticsRun;
    return `${analyticsRun.analytics_version} - ${analyticsRun.source_snapshot_type}`;
  }

  const reportRun = run as ReportRun;
  return `${reportRun.report_version} from analytics run #${reportRun.analytics_run_id}`;
}

function renderStageChip(status: StageDisplayStatus) {
  if (status === "completed") {
    return <StatusChip label="Ready" tone="positive" />;
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
    return "pipeline";
  }
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}
