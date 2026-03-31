import test from "node:test";
import assert from "node:assert/strict";

import type { AnalyticsRun, ReportRun } from "@rift/shared-types";

import {
  buildContextualChatResetKey,
  buildHistoryContent,
  buildPayloadMessages,
  MAX_HISTORY_CONTENT_LENGTH,
  MAX_MESSAGE_HISTORY
} from "./components/chat/contextual-chat-panel.helpers";
import { buildArtifactTruthState, buildFreshnessState } from "./components/dashboard/frozen-seams";

function completedAnalyticsRun(id: number): AnalyticsRun {
  return {
    id,
    user_id: 1,
    riot_profile_id: 7,
    status: "completed",
    started_at: "2026-03-30T11:00:00Z",
    completed_at: "2026-03-30T11:10:00Z",
    error_message: null,
    matches_analyzed: 30,
    source_snapshot_type: "latest_clean_snapshot",
    analytics_version: "analytics_v1"
  };
}

function completedReportRun(id: number, analyticsRunId: number, completedAt = "2026-03-30T11:20:00Z"): ReportRun {
  return {
    id,
    user_id: 1,
    riot_profile_id: 7,
    analytics_run_id: analyticsRunId,
    status: "completed",
    started_at: "2026-03-30T11:15:00Z",
    completed_at: completedAt,
    error_message: null,
    analytics_version: "analytics_v1",
    report_version: "report_v1",
    source_snapshot_type: "latest_clean_snapshot"
  };
}

test("buildArtifactTruthState keeps displayed interpretation integrity separate from upstream freshness", () => {
  const displayedAnalyticsRun = completedAnalyticsRun(11);
  const latestReportRun = completedReportRun(22, 11);
  const latestAnalyticsRun = completedAnalyticsRun(13);

  const state = buildArtifactTruthState({
    displayedAnalyticsRun,
    latestAnalyticsRun,
    latestReportRun
  });

  assert.equal(state.tone, "warning");
  assert.equal(state.headline, "Displayed interpretation is behind newer analytics");
  assert.match(state.detail, /visible coaching read uses analytics run #11/);
  assert.match(state.detail, /newer analytics run #13 exists upstream/);
});

test("buildArtifactTruthState returns positive only when the displayed chain is internally coherent", () => {
  const displayedAnalyticsRun = completedAnalyticsRun(11);
  const latestReportRun = completedReportRun(22, 11);

  const state = buildArtifactTruthState({
    displayedAnalyticsRun,
    latestAnalyticsRun: displayedAnalyticsRun,
    latestReportRun
  });

  assert.equal(state.tone, "positive");
  assert.equal(state.headline, "Displayed interpretation is internally coherent");
  assert.match(state.detail, /displayed interpretation integrity, not full upstream freshness/);
});

test("buildFreshnessState keeps orchestration responsible for full-pipeline freshness", () => {
  const latestCompletedAnalytics = completedAnalyticsRun(13);
  const latestCompletedReport = completedReportRun(22, 11);

  const state = buildFreshnessState({
    latestCompletedIngestion: null,
    latestCompletedNormalization: null,
    latestCompletedAnalytics,
    latestCompletedReport,
    now: new Date("2026-03-30T11:30:00Z")
  });

  assert.equal(state.isCurrent, false);
  assert.equal(state.tone, "warning");
  assert.equal(state.headline, "Coaching is behind analytics");
});

test("buildFreshnessState returns current when the full upstream chain matches the displayed report", () => {
  const latestCompletedAnalytics = completedAnalyticsRun(13);
  const latestCompletedReport = completedReportRun(22, 13);

  const state = buildFreshnessState({
    latestCompletedIngestion: null,
    latestCompletedNormalization: null,
    latestCompletedAnalytics,
    latestCompletedReport,
    now: new Date("2026-03-30T11:30:00Z")
  });

  assert.equal(state.isCurrent, true);
  assert.equal(state.tone, "positive");
  assert.equal(state.headline, "Displayed coaching matches the latest completed upstream pipeline");
});

test("buildPayloadMessages keeps contextual chat history local, bounded, and recap-shaped", () => {
  const messages = Array.from({ length: MAX_MESSAGE_HISTORY + 2 }, (_, index) => {
    if (index % 2 === 0) {
      return {
        role: "user" as const,
        content: `question ${index}`
      };
    }

    return {
      role: "assistant" as const,
      content: `answer ${index}`,
      answerMode: "limited" as const,
      evidenceMode: "mixed" as const,
      actionStep: `do ${index}`,
      evidencePoints: ["supported one", "supported two", "supported three"],
      limitationPoints: ["limit one", "limit two", "limit three"],
      scopeNote: "Bound to displayed report #22 and analytics #13.",
      traceLabels: ["priority_levers", "artifact_digest.report_digest"]
    };
  });

  const payload = buildPayloadMessages(messages);

  assert.equal(payload.length, MAX_MESSAGE_HISTORY);
  assert.equal(payload[0]?.content, "question 2");
  assert.match(payload[1]?.content ?? "", /Support status: limited/);
  assert.match(payload[1]?.content ?? "", /Evidence basis: mixed/);
  assert.match(payload[1]?.content ?? "", /Artifact areas: priority_levers, artifact_digest.report_digest/);
  assert.doesNotMatch(payload[1]?.content ?? "", /supported three/);
  assert.doesNotMatch(payload[1]?.content ?? "", /limit three/);
});

test("buildHistoryContent trims recaps to the bounded local-history limit", () => {
  const history = buildHistoryContent({
    role: "assistant",
    content: "answer",
    answerMode: "grounded",
    evidenceMode: "interpretive",
    actionStep: "Review your lane setup next game.",
    evidencePoints: ["A".repeat(MAX_HISTORY_CONTENT_LENGTH)],
    limitationPoints: ["B".repeat(MAX_HISTORY_CONTENT_LENGTH)],
    scopeNote: "Bounded to the displayed artifact."
  });

  assert.equal(history.length, MAX_HISTORY_CONTENT_LENGTH);
  assert.ok(history.endsWith("..."));
});

test("buildContextualChatResetKey changes whenever the selected profile or displayed report changes", () => {
  assert.equal(buildContextualChatResetKey(7, 22), "7:22");
  assert.equal(buildContextualChatResetKey(7, 22), buildContextualChatResetKey(7, 22));
  assert.notEqual(buildContextualChatResetKey(7, 22), buildContextualChatResetKey(8, 22));
  assert.notEqual(buildContextualChatResetKey(7, 22), buildContextualChatResetKey(7, 23));
});
