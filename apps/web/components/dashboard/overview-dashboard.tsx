"use client";

import type { AnalyticsRun, AnalyticsSummary, ReportArtifact, ReportRun, RiotProfile } from "@rift/shared-types";
import { useEffect, useState } from "react";

import {
  ApiError,
  getAnalyticsSummary,
  getReportArtifact,
  listAnalyticsRuns,
  listReportRuns,
  listRiotProfiles
} from "@/lib/api";
import { asArray, asBoolean, asRecord, asText, formatCompactNumber, formatMetric, formatPercent } from "@/lib/dashboard";

import { AnalysisOrchestrator } from "./analysis-orchestrator";
import { PillarSections } from "./pillar-sections";
import {
  DashboardPanel,
  InsightList,
  KpiCard,
  PillarTile,
  SectionEyebrow,
  SectionHeading,
  StatusChip,
  WorkflowRail
} from "./primitives";

type OverviewDashboardProps = {
  token: string;
  userEmail: string;
};

type ArtifactTruthState = {
  headline: string;
  detail: string;
  tone: "neutral" | "positive" | "warning";
};

export function OverviewDashboard({ token, userEmail }: OverviewDashboardProps) {
  const [profiles, setProfiles] = useState<RiotProfile[]>([]);
  const [analyticsRuns, setAnalyticsRuns] = useState<AnalyticsRun[]>([]);
  const [reportRuns, setReportRuns] = useState<ReportRun[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [reportArtifact, setReportArtifact] = useState<ReportArtifact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCollections() {
    setIsLoading(true);
    try {
      const [nextProfiles, nextAnalyticsRuns, nextReportRuns] = await Promise.all([
        listRiotProfiles(token),
        listAnalyticsRuns(token),
        listReportRuns(token)
      ]);
      setProfiles(nextProfiles);
      setAnalyticsRuns(nextAnalyticsRuns);
      setReportRuns(nextReportRuns);
      setError(null);

      if (nextProfiles.length === 0) {
        setSelectedProfileId(null);
      } else {
        const preferredProfile =
          nextProfiles.find((profile) => profile.id === selectedProfileId)
          ?? nextProfiles.find((profile) => profile.is_primary)
          ?? nextProfiles[0];
        setSelectedProfileId(preferredProfile.id);
      }
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to load the overview data right now.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCollections();
  }, [token]);

  useEffect(() => {
    async function loadArtifactsForProfile(profileId: number) {
      setIsLoadingArtifacts(true);
      try {
        const latestAnalyticsRun = latestCompletedRunForProfile(analyticsRuns, profileId);
        const latestReportRun = latestCompletedRunForProfile(reportRuns, profileId);
        const displayedAnalyticsRun = latestReportRun
          ? analyticsRuns.find((run) => run.id === latestReportRun.analytics_run_id && run.status === "completed") ?? null
          : latestAnalyticsRun;

        const [nextSummary, nextReport] = await Promise.all([
          displayedAnalyticsRun ? getAnalyticsSummary(token, displayedAnalyticsRun.id) : Promise.resolve(null),
          latestReportRun ? getReportArtifact(token, latestReportRun.id) : Promise.resolve(null)
        ]);

        setAnalyticsSummary(nextSummary);
        setReportArtifact(nextReport);
      } catch (requestError) {
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Unable to load the latest overview artifacts.");
        }
      } finally {
        setIsLoadingArtifacts(false);
      }
    }

    if (selectedProfileId === null) {
      setAnalyticsSummary(null);
      setReportArtifact(null);
      return;
    }

    void loadArtifactsForProfile(selectedProfileId);
  }, [analyticsRuns, reportRuns, selectedProfileId, token]);

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const latestAnalyticsRun = latestCompletedRunForProfile(analyticsRuns, selectedProfileId);
  const latestReportRun = latestCompletedRunForProfile(reportRuns, selectedProfileId);
  const displayedAnalyticsRun = latestReportRun
    ? analyticsRuns.find((run) => run.id === latestReportRun.analytics_run_id && run.status === "completed") ?? null
    : latestAnalyticsRun;
  const artifactTruthState = buildArtifactTruthState({
    displayedAnalyticsRun,
    latestAnalyticsRun,
    latestReportRun
  });

  const overview = asRecord(analyticsSummary?.overview);
  const progression = asRecord(analyticsSummary?.progression);
  const dataQuality = asRecord(analyticsSummary?.data_quality);
  const report = reportArtifact?.report ?? null;
  const executiveSummary = asRecord(report?.executive_summary);
  const playerProfile = asRecord(report?.player_profile);
  const confidence = asRecord(report?.confidence_and_limits);
  const strengths = asArray(report?.strengths);
  const weaknesses = asArray(report?.weaknesses);
  const nextActions = asArray(report?.next_actions);
  const priorityLevers = asArray(report?.priority_levers);
  const riskFlags = asArray(report?.risk_flags);
  const recentWindows = asArray(progression?.recent_windows);

  const heroTitle = selectedProfile?.riot_id_display ?? "No Riot profile selected";
  const heroSubtitle =
    artifactTruthState.tone === "warning"
      ? artifactTruthState.detail
      : asText(executiveSummary?.summary)
    ?? "Generate analytics and a structured report to populate the first coaching overview.";
  const playerStyle = asText(playerProfile?.primary_style) ?? "Structured profile pending";
  const championFocus = asText(playerProfile?.champion_focus)
    ?? asText(overview?.most_played_champion)
    ?? "No champion focus yet";
  const confidenceLevel = asText(confidence?.confidence_level) ?? "pending";
  const timelineAvailable = asBoolean(dataQuality?.timeline_metrics_available);
  const eventAvailable = asBoolean(dataQuality?.event_metrics_available);
  const sessionAvailable = asBoolean(dataQuality?.sessionization_available);
  const routeLabel = [selectedProfile?.region, selectedProfile?.platform_region, selectedProfile?.account_region_routing]
    .filter((value): value is string => Boolean(value))
    .join(" / ");
  const profileStatus = selectedProfile
    ? (selectedProfile.is_primary ? "Primary scouting profile" : "Owned linked profile")
    : "No profile selected";
  const primaryPriority = asRecord(priorityLevers[0]);
  const primaryRisk = asRecord(riskFlags[0]);
  const firstStrength = asRecord(strengths[0]);

  const strengthsItems = strengths.slice(0, 3).map((item, index) => {
    const row = asRecord(item);
    return {
      title: asText(row?.title) ?? `Strength ${index + 1}`,
      body: asText(row?.summary) ?? "No structured summary provided."
    };
  });
  const weaknessesItems = weaknesses.slice(0, 3).map((item, index) => {
    const row = asRecord(item);
    return {
      title: asText(row?.title) ?? `Weakness ${index + 1}`,
      body: asText(row?.summary) ?? "No structured summary provided."
    };
  });
  const nextActionItems = nextActions.slice(0, 3).map((item, index) => {
    const row = asRecord(item);
    return {
      title: asText(row?.action) ?? `Action ${index + 1}`,
      body: asText(row?.why) ?? "No rationale provided."
    };
  });

  const recentWindowCards = recentWindows.slice(0, 4).map((entry) => {
    const row = asRecord(entry);
    return {
      label: `Last ${formatMetric(row?.window_size, 0)}`,
      winRate: formatPercent(row?.win_rate),
      kda: formatMetric(row?.avg_kda),
      dpm: formatMetric(row?.avg_dpm)
    };
  });

  const heroSignals = [
    {
      label: "Style",
      value: playerStyle
    },
    {
      label: "Champion focus",
      value: championFocus
    },
    {
      label: "Snapshot confidence",
      value: confidenceLevel
    }
  ];

  const telemetryRows = [
    {
      label: "Profile route",
      value: routeLabel || "Awaiting routing data"
    },
    {
      label: "Sample size",
      value: `${formatMetric(dataQuality?.matches_analyzed, 0)} matches`
    },
    {
      label: "Artifact chain",
      value: latestReportRun && displayedAnalyticsRun
        ? `Displayed analytics #${displayedAnalyticsRun.id} -> report #${latestReportRun.id}`
        : displayedAnalyticsRun
          ? `Displayed analytics #${displayedAnalyticsRun.id}`
          : "No displayed artifact chain"
    }
  ];

  const workflowItems = [
    {
      step: "Step 01",
      title: "Read the evidence",
      detail: "Start with the snapshot, KPI strip, and sample context to understand what the clean data actually says.",
      href: "#overview",
      tone: "glow" as const
    },
    {
      step: "Step 02",
      title: "Read the interpretation",
      detail: "Use the executive read and pillar overlays to see how deterministic signals turn into coaching meaning.",
      href: "#pillars",
      tone: "gold" as const
    },
    {
      step: "Step 03",
      title: "Take the next move",
      detail: "Finish on the Coaching Board so the guidance lands as a concrete execution sequence instead of a report dump.",
      href: "#coaching-board",
      tone: "ember" as const
    }
  ];

  return (
    <div className="space-y-8" id="overview">
      <DashboardPanel className="dashboard-grid p-0">
        <div className="relative overflow-hidden px-8 py-8 sm:px-10 sm:py-10">
          <div className="dashboard-orbit right-[-6rem] top-[-5rem] hidden h-64 w-64 xl:block" />
          <div className="dashboard-orbit right-[8rem] top-[8rem] hidden h-28 w-28 xl:block" />
          <div className="absolute inset-y-0 right-0 hidden w-[26rem] bg-gradient-to-l from-white/[0.04] via-transparent to-transparent xl:block" />

          <div className="relative grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-3">
                <SectionEyebrow tone="gold">Elite overview desk</SectionEyebrow>
                <StatusChip label={profileStatus} tone={selectedProfile ? "positive" : "warning"} />
                <StatusChip label={artifactTruthState.headline} tone={artifactTruthState.tone} />
                {latestReportRun ? <StatusChip label={`Report ${latestReportRun.report_version}`} tone="neutral" /> : null}
                {displayedAnalyticsRun ? <StatusChip label={displayedAnalyticsRun.analytics_version} tone="neutral" /> : null}
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="dashboard-tactical-label text-frost/34">Performance scouting surface</p>
                  <h1 className="max-w-4xl font-display text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl xl:text-[4.2rem] xl:leading-[1.02]">
                    {heroTitle}
                  </h1>
                </div>
                <p className="max-w-3xl text-lg leading-8 text-frost/68">{heroSubtitle}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {heroSignals.map((signal) => (
                  <div key={signal.label} className="rounded-[1.35rem] border border-white/8 bg-white/[0.035] px-4 py-4">
                    <p className="dashboard-tactical-label text-frost/34">{signal.label}</p>
                    <p className="mt-3 text-base font-semibold text-white">{signal.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  accent="glow"
                  detail={`${formatMetric(overview?.wins, 0)} wins / ${formatMetric(overview?.losses, 0)} losses`}
                  label="Win rate"
                  value={formatPercent(overview?.win_rate)}
                />
                <KpiCard
                  accent="gold"
                  detail={`Games analyzed: ${formatMetric(overview?.total_games, 0)}`}
                  label="Average KDA"
                  value={formatMetric(overview?.avg_kda)}
                />
                <KpiCard
                  accent="ember"
                  detail={`Champion focus win rate: ${formatPercent(overview?.most_played_champion_win_rate)}`}
                  label="Average DPM"
                  value={formatCompactNumber(overview?.avg_dpm)}
                />
                <KpiCard
                  accent="glow"
                  detail={`Vision/min: ${formatMetric(overview?.avg_vision_per_min)}`}
                  label="Average CS/min"
                  value={formatMetric(overview?.avg_cs_per_min)}
                />
              </div>
            </div>

            <div className="space-y-4 xl:pl-6">
              <DashboardPanel className="border-white/10 bg-white/[0.02] p-6">
                <SectionEyebrow tone="steel">Desk telemetry</SectionEyebrow>
                <div className="mt-5 space-y-4">
                  {telemetryRows.map((row) => (
                    <div key={row.label} className="rounded-[1.35rem] border border-white/8 bg-white/[0.028] px-4 py-4">
                      <p className="dashboard-tactical-label text-frost/30">{row.label}</p>
                      <p className="mt-3 text-sm leading-7 text-frost/72">{row.value}</p>
                    </div>
                  ))}
                </div>
              </DashboardPanel>

              <DashboardPanel className="border-glow/14 bg-gradient-to-br from-glow/10 via-transparent to-transparent p-6">
                <SectionEyebrow tone="gold">Lead directive</SectionEyebrow>
                <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-white">
                  {asText(primaryPriority?.title) ?? "Awaiting persisted coaching priority"}
                </h2>
                <p className="mt-4 text-sm leading-7 text-frost/66">
                  {asText(primaryPriority?.summary)
                    ?? "Generate the next report run to surface the highest-value improvement lever from the persisted analytics summary."}
                </p>
                <div className="dashboard-line my-5" />
                <div className="flex flex-wrap gap-3">
                  <StatusChip label={timelineAvailable ? "Timeline ready" : "Timeline limited"} tone={timelineAvailable ? "positive" : "warning"} />
                  <StatusChip label={eventAvailable ? "Events ready" : "Events limited"} tone={eventAvailable ? "positive" : "warning"} />
                  <StatusChip label={sessionAvailable ? "Sessions ready" : "Sessions limited"} tone={sessionAvailable ? "positive" : "warning"} />
                </div>
              </DashboardPanel>
            </div>
          </div>
        </div>
      </DashboardPanel>

      <AnalysisOrchestrator
        onPipelineComplete={loadCollections}
        onSelectedProfileIdChange={setSelectedProfileId}
        profiles={profiles}
        selectedProfileId={selectedProfileId}
        token={token}
      />

      <WorkflowRail items={workflowItems} title="Coaching flow" />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardPanel className="p-6 sm:p-7">
          <SectionHeading
            action={
              <StatusChip
                label={selectedProfile?.riot_id_display ?? "Choose a profile"}
                tone={selectedProfile ? "neutral" : "warning"}
              />
            }
            description="Read this handoff in order: evidence first, interpretation second, then the action path that should shape the next block of play. Interpretation blocks only reflect the displayed report artifact, not any newer upstream analytics."
            title="Coaching handoff"
          />

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[1.8rem] border border-white/8 bg-gradient-to-br from-white/[0.065] via-white/[0.028] to-transparent p-5">
              <SectionEyebrow tone="gold">Scouting read</SectionEyebrow>
              <h3 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">
                {asText(executiveSummary?.headline) ?? "Generate a structured report to unlock the first coaching read."}
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-frost/66">
                {asText(executiveSummary?.summary) ?? "The overview is ready to display persisted analytics now, but the premium narrative layer appears after the first report run completes."}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-white/8 bg-night/30 px-4 py-4">
                  <p className="dashboard-tactical-label text-frost/34">Interpretation</p>
                  <p className="mt-3 text-lg font-semibold text-white">{playerStyle}</p>
                  <p className="mt-2 text-sm leading-6 text-frost/58">
                    {asText(firstStrength?.summary) ?? "Strength framing will sharpen after the next completed report artifact."}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-gold/14 bg-gold/5 px-4 py-4">
                  <p className="dashboard-tactical-label text-gold">Execution guidance</p>
                  <p className="mt-3 text-lg font-semibold text-white">{asText(primaryPriority?.title) ?? "No prioritized lever yet"}</p>
                  <p className="mt-2 text-sm leading-6 text-frost/58">
                    {asText(primaryPriority?.summary) ?? "Run or refresh the report to surface a prioritized coaching lever."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.7rem] border border-white/8 bg-white/[0.03] p-5">
                <SectionEyebrow tone="steel">Evidence snapshot</SectionEyebrow>
                <div className="mt-4 space-y-4">
                  {recentWindowCards.length === 0 ? (
                    <p className="text-sm leading-7 text-frost/58">
                      Recent-window splits will appear here once enough matches exist in the current clean snapshot.
                    </p>
                  ) : (
                    recentWindowCards.map((windowCard) => (
                      <div key={windowCard.label} className="rounded-[1.2rem] border border-white/7 bg-white/[0.025] px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold text-white">{windowCard.label}</p>
                          <p className="font-display text-xl font-semibold text-frost">{windowCard.winRate}</p>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs uppercase tracking-[0.18em] text-frost/44">
                          <span>KDA {windowCard.kda}</span>
                          <span>DPM {windowCard.dpm}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[1.7rem] border border-white/8 bg-white/[0.03] p-5">
                <SectionEyebrow tone="steel">Interpretation guardrails</SectionEyebrow>
                <p className="mt-4 font-display text-2xl font-semibold text-white">{confidenceLevel}</p>
                <p className="mt-3 text-sm leading-7 text-frost/60">
                  {asText(confidence?.explanation) ?? "Confidence will appear once a structured report is available."}
                </p>
                <div className="dashboard-line my-5" />
                <p className="text-sm leading-7 text-frost/60">
                  {asText(primaryRisk?.summary) ?? "Risk flags will surface here once the report artifact includes them."}
                </p>
              </div>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel className="p-6">
          <SectionHeading
            description="This evidence layer keeps the coaching grounded in artifact lineage and shows whether the visible interpretation is aligned with its backing artifacts. Use Run Full Analysis for end-to-end freshness."
            title="Evidence layer"
          />
          <div className="mt-6 grid gap-4">
            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="dashboard-tactical-label text-frost/34">Artifact chain</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <StatusChip label={displayedAnalyticsRun ? `Displayed analytics #${displayedAnalyticsRun.id}` : "No analytics"} tone={displayedAnalyticsRun ? "positive" : "warning"} />
                <StatusChip label={latestReportRun ? `Displayed report #${latestReportRun.id}` : "No report"} tone={latestReportRun ? "positive" : "warning"} />
                <StatusChip label={artifactTruthState.headline} tone={artifactTruthState.tone} />
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="dashboard-tactical-label text-frost/34">Sample integrity</p>
              <p className="mt-3 font-display text-3xl font-semibold text-white">{formatMetric(dataQuality?.matches_analyzed, 0)}</p>
              <p className="mt-2 text-sm leading-6 text-frost/58">
                Signed in as {userEmail}. The current overview is anchored to analytics run #{displayedAnalyticsRun?.id ?? "N/A"}, which is the exact deterministic artifact backing the visible coaching interpretation.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="dashboard-tactical-label text-frost/34">Execution focus</p>
              <p className="mt-3 text-sm leading-7 text-frost/64">
                {asText(primaryPriority?.summary) ?? "Priority levers will become visible here once the first report artifact is available."}
              </p>
            </div>
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <InsightList accent="glow" items={strengthsItems} title="Evidence holding up" />
        <InsightList accent="ember" items={weaknessesItems} title="Interpretation watchouts" />
        <InsightList accent="gold" items={nextActionItems} title="Action queue" />
      </div>

      <DashboardPanel className="p-6 sm:p-7" id="pillars">
        <SectionHeading
          description="Open the deep stations in coaching order: evidence first, interpretation second, execution last."
          title="Station Map"
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <PillarTile
            badge="Station 00"
            description="Snapshot identity, current form, and the top coaching read for the selected profile."
            href="#overview"
            title="Overview Desk"
          />
          <PillarTile
            badge="Station 01"
            description="Champion-specific form, role-opponent context, and progression shaping for focused improvement."
            href="#champion-form"
            title="Champion Form"
          />
          <PillarTile
            badge="Station 02"
            description="Objective conversion, team context, and loss-shape analysis framed like a scouting tool."
            href="#macro-lens"
            title="Macro Lens"
          />
          <PillarTile
            badge="Station 03"
            description="Persisted coaching priorities, execution steps, and confidence guardrails rendered as a deeper coaching surface."
            href="#coaching-board"
            title="Coaching Board"
          />
        </div>
      </DashboardPanel>

      <PillarSections
        analyticsSummary={analyticsSummary}
        artifactTruthState={artifactTruthState}
        reportArtifact={reportArtifact}
        selectedProfile={selectedProfile}
      />

      {(isLoading || isLoadingArtifacts || error || selectedProfile === null) ? (
        <DashboardPanel className="p-6">
          <SectionEyebrow tone="steel">Overview state</SectionEyebrow>
          <p className="mt-4 text-sm leading-7 text-frost/64">
            {error
              ?? (selectedProfile === null
                ? "Add a Riot profile and run ingestion, normalization, analytics, and reporting to activate the premium overview."
                : isLoading || isLoadingArtifacts
                  ? "Refreshing the latest persisted analytics and report artifacts..."
                  : "The overview is ready.")}
          </p>
        </DashboardPanel>
      ) : null}
    </div>
  );
}

function latestCompletedRunForProfile<T extends { id: number; riot_profile_id: number; status: string }>(
  runs: T[],
  profileId: number | null
): T | null {
  if (profileId === null) {
    return null;
  }

  let latest: T | null = null;
  for (const run of runs) {
    if (run.riot_profile_id !== profileId || run.status !== "completed") {
      continue;
    }
    if (latest === null || run.id > latest.id) {
      latest = run;
    }
  }
  return latest;
}

function buildArtifactTruthState({
  displayedAnalyticsRun,
  latestAnalyticsRun,
  latestReportRun
}: {
  displayedAnalyticsRun: AnalyticsRun | null;
  latestAnalyticsRun: AnalyticsRun | null;
  latestReportRun: ReportRun | null;
}): ArtifactTruthState {
  if (!displayedAnalyticsRun && !latestReportRun) {
    return {
      headline: "No displayed interpretation chain",
      detail: "Run analytics and report generation before the dashboard can show a persisted coaching interpretation.",
      tone: "warning"
    };
  }

  if (latestReportRun && !displayedAnalyticsRun) {
    return {
      headline: "Displayed interpretation is missing its analytics source",
      detail: `Report #${latestReportRun.id} exists, but its backing analytics run is not available as a completed artifact in the current dashboard state.`,
      tone: "warning"
    };
  }

  if (!latestReportRun && displayedAnalyticsRun) {
    return {
      headline: "Interpretation not generated yet",
      detail: `Analytics run #${displayedAnalyticsRun.id} is available, but no completed report artifact exists for the visible coaching interpretation.`,
      tone: "neutral"
    };
  }

  if (!displayedAnalyticsRun || !latestReportRun) {
    return {
      headline: "Displayed chain unavailable",
      detail: "The dashboard does not yet have an internally aligned analytics/report artifact pair to display.",
      tone: "warning"
    };
  }

  if (latestReportRun.analytics_run_id !== displayedAnalyticsRun.id) {
    return {
      headline: "Displayed report is not aligned with its analytics source",
      detail: `Report #${latestReportRun.id} points to analytics run #${latestReportRun.analytics_run_id}, but the dashboard is currently holding analytics run #${displayedAnalyticsRun.id}.`,
      tone: "warning"
    };
  }

  if (latestAnalyticsRun && latestAnalyticsRun.id !== displayedAnalyticsRun.id) {
    return {
      headline: "Displayed interpretation is behind newer analytics",
      detail: `The visible coaching read uses analytics run #${displayedAnalyticsRun.id} through report #${latestReportRun.id}, while newer analytics run #${latestAnalyticsRun.id} exists upstream.`,
      tone: "warning"
    };
  }

  return {
    headline: "Displayed interpretation is internally coherent",
    detail: `The visible coaching read is backed by analytics run #${displayedAnalyticsRun.id} and report #${latestReportRun.id}. This status is about displayed interpretation integrity, not full upstream freshness.`,
    tone: "positive"
  };
}
