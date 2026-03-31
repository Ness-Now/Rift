import type { ContextualChatMessage } from "@rift/shared-types";

export const MAX_MESSAGE_HISTORY = 6;
export const MAX_HISTORY_CONTENT_LENGTH = 1200;

export type HistoryChatMessage = ContextualChatMessage & {
  answerMode?: "grounded" | "limited";
  evidenceMode?: "deterministic" | "interpretive" | "mixed";
  actionStep?: string;
  evidencePoints?: string[];
  limitationPoints?: string[];
  scopeNote?: string;
  traceLabels?: string[];
  suggestedFollowUp?: string | null;
};

export function buildContextualChatResetKey(
  selectedProfileId: number | null | undefined,
  reportRunId: number | null | undefined
) {
  return `${selectedProfileId ?? "none"}:${reportRunId ?? "none"}`;
}

export function formatTraceLabel(value: string) {
  return value
    .replace("artifact_digest.", "")
    .replace("report_input.", "input:")
    .replace(/_/g, " ");
}

export function formatEvidenceMode(value: "deterministic" | "interpretive" | "mixed") {
  if (value === "deterministic") {
    return "Deterministic basis";
  }
  if (value === "interpretive") {
    return "Interpretive basis";
  }
  return "Mixed basis";
}

export function buildHistoryContent(message: HistoryChatMessage) {
  if (message.role === "user") {
    return trimHistoryContent(message.content);
  }

  const lines = [
    `Answer: ${message.content}`,
    `Support status: ${message.answerMode === "limited" ? "limited" : "grounded"}`
  ];

  if (message.evidenceMode) {
    lines.push(`Evidence basis: ${message.evidenceMode}`);
  }
  if (message.traceLabels && message.traceLabels.length > 0) {
    lines.push(`Artifact areas: ${message.traceLabels.join(", ")}`);
  }
  if (message.actionStep) {
    lines.push(`Action step: ${message.actionStep}`);
  }
  if (message.evidencePoints && message.evidencePoints.length > 0) {
    lines.push(`Supported points: ${message.evidencePoints.slice(0, 2).join(" | ")}`);
  }
  if (message.limitationPoints && message.limitationPoints.length > 0) {
    lines.push(`Cannot conclude: ${message.limitationPoints.slice(0, 2).join(" | ")}`);
  }
  if (message.scopeNote) {
    lines.push(`Scope bounds: ${message.scopeNote}`);
  }

  return trimHistoryContent(lines.join("\n"));
}

export function trimHistoryContent(value: string) {
  if (value.length <= MAX_HISTORY_CONTENT_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_HISTORY_CONTENT_LENGTH - 3)}...`;
}

export function buildPayloadMessages(messages: HistoryChatMessage[]): ContextualChatMessage[] {
  return messages
    .slice(-MAX_MESSAGE_HISTORY)
    .map((message) => ({ role: message.role, content: buildHistoryContent(message) }));
}
