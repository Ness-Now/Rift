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

import { PillarSections } from "./pillar-sections";
import {
  DashboardPanel,
  InsightList,
  KpiCard,
  PillarTile,
  SectionEyebrow,
  SectionHeading,
  StatusChip,
  SurfaceNavigator
} from "./primitives";

type OverviewDashboardProps = {
  token: string;
  userEmail: string;
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
        const latestAnalyticsRun = analyticsRuns.find(
          (run) => run.riot_profile_id === profileId && run.status === "completed"
        ) ?? null;
        const latestReportRun = reportRuns.find(
          (run) => run.riot_profile_id === profileId && run.status === "completed"
        ) ?? null;

        const [nextSummary, nextReport] = await Promise.all([
          latestAnalyticsRun ? getAnalyticsSummary(token, latestAnalyticsRun.id) : Promise.resolve(null),
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
  const latestAnalyticsRun =
    analyticsRuns.find((run) => run.riot_profile_id === selectedProfileId && run.status === "completed")
    ?? null;
  const latestReportRun =
    reportRuns.find((run) => run.riot_profile_id === selectedProfileId && run.status === "completed")
    ?? null;

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
    asText(executiveSummary?.summary)
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
  const profileStatus = selectedProfile?.is_primary ? "Primary scouting profile" : "Owned linked profile";
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
      value: latestAnalyticsRun && latestReportRun
        ? `Analytics #${latestAnalyticsRun.id} -> Report #${latestReportRun.id}`
        : latestAnalyticsRun
          ? `Analytics #${latestAnalyticsRun.id}`
          : "No completed artifact chain"
    }
  ];

  const surfaceRouteItems = [
    {
      label: "Station 00",
      title: "Overview Desk",
      href: "#overview",
      detail: latestReportRun
        ? "Identity, KPI strip, executive briefing, and artifact-chain orientation."
        : "Activate analytics and report artifacts to unlock the full overview desk.",
      tone: "glow" as const
    },
    {
      label: "Station 01",
      title: "Champion Form",
      href: "#champion-form",
      detail: championFocus !== "No champion focus yet"
        ? `${championFocus} anchors the current form read and champion progression surface.`
        : "Champion identity, recent form windows, and lane-checkpoint context.",
      tone: "glow" as const
    },
    {
      label: "Station 02",
      title: "Macro Lens",
      href: "#macro-lens",
      detail: asText(primaryPriority?.title)
        ?? "Objective conversion, loss shape, and macro contrast from the clean snapshot.",
      tone: "gold" as const
    },
    {
      label: "Station 03",
      title: "Coaching Board",
      href: "#coaching-board",
      detail: asText(primaryPriority?.title)
        ?? "Execution priorities, next actions, and confidence guardrails.",
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
                <StatusChip label={profileStatus} tone="positive" />
                {latestReportRun ? <StatusChip label={`Report ${latestReportRun.report_version}`} tone="neutral" /> : null}
                {latestAnalyticsRun ? <StatusChip label={latestAnalyticsRun.analytics_version} tone="neutral" /> : null}
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardPanel className="p-6 sm:p-7">
          <SectionHeading
            action={
              <label className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-frost/72">
                <span className="dashboard-tactical-label text-frost/34">Profile</span>
                <select
                  className="bg-transparent text-sm text-white outline-none"
                  disabled={profiles.length === 0}
                  onChange={(event) => setSelectedProfileId(Number(event.target.value))}
                  value={selectedProfileId ?? ""}
                >
                  {profiles.length === 0 ? <option value="">No profiles</option> : null}
                  {profiles.map((profile) => (
                    <option key={profile.id} className="bg-midnight text-white" value={profile.id}>
                      {profile.riot_id_display}
                    </option>
                  ))}
                </select>
              </label>
            }
            description="The executive block blends persisted deterministic signals with the latest stored structured report artifact for the selected profile."
            title="Executive briefing"
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
                  <p className="dashboard-tactical-label text-frost/34">Profile vector</p>
                  <p className="mt-3 text-lg font-semibold text-white">{playerStyle}</p>
                  <p className="mt-2 text-sm leading-6 text-frost/58">
                    {asText(firstStrength?.summary) ?? "Strength framing will sharpen after the next completed report artifact."}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-gold/14 bg-gold/5 px-4 py-4">
                  <p className="dashboard-tactical-label text-gold">Immediate lever</p>
                  <p className="mt-3 text-lg font-semibold text-white">{asText(primaryPriority?.title) ?? "No prioritized lever yet"}</p>
                  <p className="mt-2 text-sm leading-6 text-frost/58">
                    {asText(primaryPriority?.summary) ?? "Run or refresh the report to surface a prioritized coaching lever."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[1.7rem] border border-white/8 bg-white/[0.03] p-5">
                <SectionEyebrow tone="steel">Form snapshot</SectionEyebrow>
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
                <SectionEyebrow tone="steel">Confidence + limits</SectionEyebrow>
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
            description="Supporting telemetry keeps the overview grounded without stealing focus from the main coaching read."
            title="Support layer"
          />
          <div className="mt-6 grid gap-4">
            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="dashboard-tactical-label text-frost/34">Artifact chain</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <StatusChip label={latestAnalyticsRun ? `Analytics #${latestAnalyticsRun.id}` : "No analytics"} tone={latestAnalyticsRun ? "positive" : "warning"} />
                <StatusChip label={latestReportRun ? `Report #${latestReportRun.id}` : "No report"} tone={latestReportRun ? "positive" : "warning"} />
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="dashboard-tactical-label text-frost/34">Sample integrity</p>
              <p className="mt-3 font-display text-3xl font-semibold text-white">{formatMetric(dataQuality?.matches_analyzed, 0)}</p>
              <p className="mt-2 text-sm leading-6 text-frost/58">
                Signed in as {userEmail}. The current overview is anchored to the latest clean snapshot for this owned Riot profile.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="dashboard-tactical-label text-frost/34">Current focus</p>
              <p className="mt-3 text-sm leading-7 text-frost/64">
                {asText(primaryPriority?.summary) ?? "Priority levers will become visible here once the first report artifact is available."}
              </p>
            </div>
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <InsightList accent="glow" items={strengthsItems} title="Strength edge" />
        <InsightList accent="ember" items={weaknessesItems} title="Pressure points" />
        <InsightList accent="gold" items={nextActionItems} title="Next block" />
      </div>

      <DashboardPanel className="p-6 sm:p-7" id="pillars">
        <SectionHeading
          description="The overview desk stays responsible for orientation. These deeper stations carry the champion, macro, and coaching-specific reads in a consistent route."
          title="Station Map"
        />
        <div className="mt-6">
          <SurfaceNavigator items={surfaceRouteItems} title="Overview to deep-dive route" />
        </div>
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

      <PillarSections analyticsSummary={analyticsSummary} reportArtifact={reportArtifact} selectedProfile={selectedProfile} />

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
