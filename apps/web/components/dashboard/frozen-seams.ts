import type { AnalyticsRun, IngestionRun, NormalizationRun, ReportRun } from "@rift/shared-types";

export type DashboardTone = "neutral" | "positive" | "warning";

export type ArtifactTruthState = {
  headline: string;
  detail: string;
  tone: DashboardTone;
};

export type FreshnessState = {
  headline: string;
  detail: string;
  tone: DashboardTone;
  isCurrent: boolean;
};

export function buildArtifactTruthState({
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

export function buildFreshnessState({
  latestCompletedIngestion,
  latestCompletedNormalization,
  latestCompletedAnalytics,
  latestCompletedReport,
  now = new Date()
}: {
  latestCompletedIngestion: IngestionRun | null;
  latestCompletedNormalization: NormalizationRun | null;
  latestCompletedAnalytics: AnalyticsRun | null;
  latestCompletedReport: ReportRun | null;
  now?: Date;
}): FreshnessState {
  if (!latestCompletedReport) {
    return {
      headline: "No coaching output yet",
      detail: "Run the full pipeline to create the first complete coaching chain for this profile.",
      tone: "warning",
      isCurrent: false
    };
  }

  if (!latestCompletedAnalytics || latestCompletedReport.analytics_run_id !== latestCompletedAnalytics.id) {
    return {
      headline: "Coaching is behind analytics",
      detail: "A newer analytics snapshot exists than the report currently shown on the coaching surface.",
      tone: "warning",
      isCurrent: false
    };
  }

  if (isRunNewer(latestCompletedNormalization, latestCompletedAnalytics)) {
    return {
      headline: "Analytics is behind normalization",
      detail: "A newer clean snapshot exists than the analytics summary currently feeding the report.",
      tone: "warning",
      isCurrent: false
    };
  }

  if (isRunNewer(latestCompletedIngestion, latestCompletedNormalization)) {
    return {
      headline: "Raw ingestion is ahead of the clean snapshot",
      detail: "A newer ingestion run has landed since the last completed normalization.",
      tone: "warning",
      isCurrent: false
    };
  }

  if (isOlderThanHours(latestCompletedReport.completed_at, 24, now)) {
    return {
      headline: "Latest successful pipeline is older than one day",
      detail: `The latest successful coaching chain completed ${formatRelativeTime(latestCompletedReport.completed_at, now)}.`,
      tone: "neutral",
      isCurrent: true
    };
  }

  return {
    headline: "Displayed coaching matches the latest completed upstream pipeline",
    detail: `The visible coaching output completed ${formatRelativeTime(latestCompletedReport.completed_at, now)} and matches the latest successful upstream chain.`,
    tone: "positive",
    isCurrent: true
  };
}

function isRunNewer(
  candidate: IngestionRun | NormalizationRun | AnalyticsRun | null,
  baseline: IngestionRun | NormalizationRun | AnalyticsRun | ReportRun | null
) {
  if (!candidate || !baseline) {
    return false;
  }
  return candidate.id > baseline.id;
}

function isOlderThanHours(value: string | null, hours: number, now: Date) {
  if (!value) {
    return false;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && now.getTime() - timestamp >= hours * 60 * 60 * 1000;
}

function formatRelativeTime(value: string | null, now: Date) {
  if (!value) {
    return "at an unknown time";
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  const diffMs = Math.max(0, now.getTime() - timestamp);
  const diffMinutes = Math.max(1, Math.round(diffMs / (60 * 1000)));
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}
