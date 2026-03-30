"use client";

import type {
  ContextualChatMessage,
  ContextualChatResponse,
  ReportArtifact,
  RiotProfile
} from "@rift/shared-types";
import { useEffect, useMemo, useState } from "react";

import { ApiError, createContextualChatReply } from "@/lib/api";

import { DashboardPanel, SectionEyebrow, SectionHeading, StatusChip } from "../dashboard/primitives";

type ArtifactTruthState = {
  headline: string;
  detail: string;
  tone: "neutral" | "positive" | "warning";
};

type ContextualChatPanelProps = {
  token: string;
  selectedProfile: RiotProfile | null;
  reportArtifact: ReportArtifact | null;
  artifactTruthState: ArtifactTruthState;
};

type LocalChatMessage = ContextualChatMessage & {
  answerMode?: "grounded" | "limited";
  evidencePoints?: string[];
  limitationPoints?: string[];
  scopeNote?: string;
  traceLabels?: string[];
  suggestedFollowUp?: string | null;
};

const MAX_MESSAGE_HISTORY = 6;

export function ContextualChatPanel({
  token,
  selectedProfile,
  reportArtifact,
  artifactTruthState
}: ContextualChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [latestResponse, setLatestResponse] = useState<ContextualChatResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages([]);
    setLatestResponse(null);
    setError(null);
    setDraft("");
  }, [reportArtifact?.report_run_id, selectedProfile?.id]);

  const chatAvailability = useMemo(() => {
    if (selectedProfile === null) {
      return {
        canAsk: false,
        headline: "Select a Riot profile first",
        detail: "This chat only works when a specific owned Riot profile is selected.",
        tone: "warning" as const
      };
    }

    if (reportArtifact === null) {
      return {
        canAsk: false,
        headline: "Displayed report artifact required",
        detail: "Run the full pipeline or generate a report first. The chat only answers from the currently displayed persisted report artifact.",
        tone: "warning" as const
      };
    }

    if (artifactTruthState.tone === "warning") {
      return {
        canAsk: true,
        headline: "Chat is grounded on a stale or mixed displayed artifact",
        detail: "Answers remain limited to the displayed report artifact and may not reflect newer upstream analytics.",
        tone: "warning" as const
      };
    }

    return {
      canAsk: true,
      headline: "Chat is grounded on the displayed coaching artifact",
      detail: "Answers are limited to the selected profile and the report artifact currently shown on the dashboard.",
      tone: "positive" as const
    };
  }, [artifactTruthState, reportArtifact, selectedProfile]);

  async function handleSubmit() {
    const content = draft.trim();
    if (content === "" || !chatAvailability.canAsk || selectedProfile === null || reportArtifact === null) {
      return;
    }

    const userMessage: LocalChatMessage = {
      role: "user",
      content
    };
    const nextMessages = [...messages, userMessage];
    const payloadMessages = nextMessages
      .slice(-MAX_MESSAGE_HISTORY)
      .map((message) => ({ role: message.role, content: message.content }));

    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await createContextualChatReply(token, {
        riot_profile_id: selectedProfile.id,
        report_run_id: reportArtifact.report_run_id,
        messages: payloadMessages
      });
      const assistantMessage: LocalChatMessage = {
        role: "assistant",
        content: response.reply.answer,
        answerMode: response.reply.answer_mode,
        evidencePoints: response.reply.evidence_points,
        limitationPoints: response.reply.limitation_points,
        scopeNote: response.reply.scope_note,
        traceLabels: response.reply.trace_labels,
        suggestedFollowUp: response.reply.suggested_follow_up
      };
      setMessages((current) => [...current, assistantMessage]);
      setLatestResponse(response);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to create a grounded chat reply right now.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayedGrounding = latestResponse?.grounding ?? (reportArtifact
    ? {
        analytics_run_id: reportArtifact.analytics_run_id,
        analytics_version: reportArtifact.analytics_version,
        context_status: artifactTruthState.tone === "positive" ? "current" : "stale",
        report_run_id: reportArtifact.report_run_id,
        report_version: reportArtifact.report_version
      }
    : null);

  return (
    <DashboardPanel className="p-6 sm:p-7" id="contextual-chat">
      <SectionHeading
        action={
          <div className="flex flex-wrap items-center gap-3">
            {selectedProfile ? <StatusChip label={selectedProfile.riot_id_display} tone="neutral" /> : null}
            {reportArtifact ? <StatusChip label={`Report #${reportArtifact.report_run_id}`} tone="neutral" /> : null}
            <StatusChip label={chatAvailability.headline} tone={chatAvailability.tone} />
          </div>
        }
        description="Ask grounded follow-up questions about the displayed coaching read. This is not a general assistant: it only answers from the selected profile and the persisted report artifact currently visible on the dashboard."
        title="Contextual Coaching Chat"
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-4">
          <DashboardPanel className="border-glow/14 bg-gradient-to-br from-glow/10 via-transparent to-transparent p-5">
            <SectionEyebrow tone="gold">Grounding context</SectionEyebrow>
            <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-white">
              {chatAvailability.headline}
            </h3>
            <p className="mt-4 text-sm leading-7 text-frost/64">{chatAvailability.detail}</p>
            <div className="dashboard-line my-5" />
            <div className="grid gap-4 md:grid-cols-2">
              <ContextTile
                label="Selected profile"
                value={selectedProfile?.riot_id_display ?? "None selected"}
                detail={selectedProfile ? `${selectedProfile.region} / ${selectedProfile.platform_region}` : "Choose an owned Riot profile."}
              />
              <ContextTile
                label="Displayed report"
                value={reportArtifact ? `#${reportArtifact.report_run_id}` : "Unavailable"}
                detail={reportArtifact ? `${reportArtifact.report_version} from analytics #${reportArtifact.analytics_run_id}` : "Generate a report artifact first."}
              />
              <ContextTile
                label="Artifact truth"
                value={artifactTruthState.headline}
                detail={artifactTruthState.detail}
              />
              <ContextTile
                label="Displayed status"
                value={displayedGrounding?.context_status === "current" ? "Current artifact" : displayedGrounding ? "Stale artifact" : "No artifact"}
                detail={displayedGrounding
                  ? `Answers are tied to report #${displayedGrounding.report_run_id} and analytics #${displayedGrounding.analytics_run_id}.`
                  : "Chat stays disabled until a displayed artifact exists."}
              />
            </div>
          </DashboardPanel>

          {error ? (
            <div className="rounded-[1.4rem] border border-gold/20 bg-gold/10 px-4 py-4">
              <p className="text-sm font-semibold text-white">Chat issue</p>
              <p className="mt-2 text-sm leading-7 text-frost/76">{error}</p>
            </div>
          ) : null}

          <DashboardPanel className="p-5">
            <SectionEyebrow tone="steel">Ask from the displayed artifact</SectionEyebrow>
            <div className="mt-5 space-y-3">
              <textarea
                className="min-h-[140px] w-full rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white outline-none transition focus:border-glow/22 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!chatAvailability.canAsk || isSubmitting}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={chatAvailability.canAsk
                  ? "Ask about the displayed report: what is the main coaching priority, what evidence supports it, or what should you do next?"
                  : "Contextual chat unlocks once a selected profile and displayed report artifact are available."}
                value={draft}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm leading-6 text-frost/56">
                  This first T010 pass keeps chat ephemeral. It does not save threads or look beyond the displayed artifact context.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-frost/72 transition hover:border-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={messages.length === 0 || isSubmitting}
                    onClick={() => {
                      setMessages([]);
                      setLatestResponse(null);
                      setError(null);
                    }}
                    type="button"
                  >
                    Clear chat
                  </button>
                  <button
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-night transition hover:bg-frost disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!chatAvailability.canAsk || isSubmitting || draft.trim() === ""}
                    onClick={() => {
                      void handleSubmit();
                    }}
                    type="button"
                  >
                    {isSubmitting ? "Generating grounded reply..." : "Ask grounded question"}
                  </button>
                </div>
              </div>
            </div>
          </DashboardPanel>
        </div>

        <DashboardPanel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SectionEyebrow tone="steel">Conversation</SectionEyebrow>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                Displayed coaching interrogation
              </h3>
            </div>
            {displayedGrounding ? (
              <StatusChip
                label={displayedGrounding.context_status === "current" ? "Grounded on current artifact" : "Grounded on stale artifact"}
                tone={displayedGrounding.context_status === "current" ? "positive" : "warning"}
              />
            ) : null}
          </div>

          <div className="mt-5 space-y-4">
            {messages.length === 0 ? (
              <div className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] px-5 py-5">
                <p className="text-sm font-semibold text-white">No chat messages yet</p>
                <p className="mt-3 text-sm leading-7 text-frost/62">
                  Start by asking what the displayed report thinks your biggest weakness is, what evidence supports the main coaching priority, or what to focus on in the next block of games.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <article
                  key={`${message.role}-${index}`}
                  className={`rounded-[1.45rem] border px-5 py-5 ${
                    message.role === "assistant"
                      ? "border-glow/14 bg-gradient-to-br from-glow/10 via-transparent to-transparent"
                      : "border-white/8 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="dashboard-tactical-label text-frost/34">
                      {message.role === "assistant" ? "Grounded reply" : "Your question"}
                    </p>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <StatusChip
                        label={message.role === "assistant"
                          ? (message.answerMode === "limited" ? "Limited answer" : "Grounded answer")
                          : "Local prompt"}
                        tone={message.role === "assistant"
                          ? (message.answerMode === "limited" ? "warning" : "positive")
                          : "neutral"}
                      />
                      {message.role === "assistant"
                        ? message.traceLabels?.map((label) => (
                          <StatusChip key={`${index}-${label}`} label={formatTraceLabel(label)} tone="neutral" />
                        ))
                        : null}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-frost/78">{message.content}</p>

                  {message.role === "assistant" ? (
                    <div className="mt-5 grid gap-4 xl:grid-cols-3">
                      <MiniList
                        emptyLabel="No explicit evidence points returned."
                        items={message.evidencePoints ?? []}
                        title="Evidence"
                      />
                      <MiniList
                        emptyLabel="No explicit limitations returned."
                        items={message.limitationPoints ?? []}
                        title="Limits"
                      />
                      <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                        <p className="dashboard-tactical-label text-frost/34">Scope bounds</p>
                        <p className="mt-3 text-sm leading-7 text-frost/70">
                          {message.scopeNote ?? "No explicit scope note returned."}
                        </p>
                        <div className="dashboard-line my-4" />
                        <p className="dashboard-tactical-label text-frost/34">Follow-up</p>
                        <p className="mt-3 text-sm leading-7 text-frost/70">
                          {message.suggestedFollowUp ?? "No suggested follow-up for this reply."}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </DashboardPanel>
      </div>
    </DashboardPanel>
  );
}

function formatTraceLabel(value: string) {
  return value
    .replace("artifact_digest.", "")
    .replace("report_input.", "input:")
    .replace(/_/g, " ");
}

function ContextTile({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-4 py-4">
      <p className="dashboard-tactical-label text-frost/34">{label}</p>
      <p className="mt-3 text-sm font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-frost/58">{detail}</p>
    </div>
  );
}

function MiniList({
  title,
  items,
  emptyLabel
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
      <p className="dashboard-tactical-label text-frost/34">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-7 text-frost/58">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm leading-6 text-frost/70">
          {items.map((item) => (
            <li key={`${title}-${item}`} className="rounded-[1rem] border border-white/7 bg-white/[0.025] px-3 py-3">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
