"use client";

import type { AnalyticsRun, ReportArtifact, ReportRun, RiotProfile } from "@rift/shared-types";
import { FormEvent, useEffect, useState } from "react";

import {
  ApiError,
  createReportRun,
  getReportArtifact,
  listAnalyticsRuns,
  listReportRuns,
  listRiotProfiles
} from "@/lib/api";

export function ReportRunManager({ token }: { token: string }) {
  const [profiles, setProfiles] = useState<RiotProfile[]>([]);
  const [analyticsRuns, setAnalyticsRuns] = useState<AnalyticsRun[]>([]);
  const [reportRuns, setReportRuns] = useState<ReportRun[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedAnalyticsRunId, setSelectedAnalyticsRunId] = useState<number | null>(null);
  const [selectedReportRunId, setSelectedReportRunId] = useState<number | null>(null);
  const [reportArtifact, setReportArtifact] = useState<ReportArtifact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableAnalyticsRuns = analyticsRuns.filter(
    (run) => run.riot_profile_id === selectedProfileId && run.status === "completed"
  );

  async function loadReport(runId: number | null) {
    if (runId === null) {
      setSelectedReportRunId(null);
      setReportArtifact(null);
      return;
    }

    setIsLoadingReport(true);
    try {
      const nextArtifact = await getReportArtifact(token, runId);
      setSelectedReportRunId(runId);
      setReportArtifact(nextArtifact);
      setError(null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to load the structured report.");
      }
    } finally {
      setIsLoadingReport(false);
    }
  }

  async function loadData() {
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

      const preferredProfile =
        nextProfiles.find((profile) => profile.id === selectedProfileId)
        ?? nextProfiles.find((profile) => profile.is_primary)
        ?? nextProfiles[0]
        ?? null;
      const nextProfileId = preferredProfile?.id ?? null;
      setSelectedProfileId(nextProfileId);

      const preferredAnalyticsRun =
        nextAnalyticsRuns.find(
          (run) => run.id === selectedAnalyticsRunId && run.riot_profile_id === nextProfileId && run.status === "completed"
        )
        ?? nextAnalyticsRuns.find((run) => run.riot_profile_id === nextProfileId && run.status === "completed")
        ?? null;
      setSelectedAnalyticsRunId(preferredAnalyticsRun?.id ?? null);

      const preferredReportRun =
        nextReportRuns.find((run) => run.id === selectedReportRunId && run.status === "completed")
        ?? nextReportRuns.find((run) => run.status === "completed")
        ?? null;
      await loadReport(preferredReportRun?.id ?? null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to load report data right now.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token]);

  useEffect(() => {
    if (selectedProfileId === null) {
      setSelectedAnalyticsRunId(null);
      return;
    }
    const preferredRun =
      analyticsRuns.find(
        (run) => run.id === selectedAnalyticsRunId && run.riot_profile_id === selectedProfileId && run.status === "completed"
      )
      ?? analyticsRuns.find((run) => run.riot_profile_id === selectedProfileId && run.status === "completed")
      ?? null;
    setSelectedAnalyticsRunId(preferredRun?.id ?? null);
  }, [analyticsRuns, selectedAnalyticsRunId, selectedProfileId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedProfileId === null) {
      setError("Select a Riot profile before generating a report.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const run = await createReportRun(token, {
        riot_profile_id: selectedProfileId,
        analytics_run_id: selectedAnalyticsRunId ?? undefined
      });
      await loadData();
      if (run.status === "completed") {
        await loadReport(run.id);
      }
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to generate the report.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const report = reportArtifact?.report ?? null;
  const executiveSummary = asRecord(report?.executive_summary);
  const playerProfile = asRecord(report?.player_profile);
  const strengths = asArray(report?.strengths);
  const weaknesses = asArray(report?.weaknesses);
  const nextActions = asArray(report?.next_actions);
  const riskFlags = asArray(report?.risk_flags);
  const confidence = asRecord(report?.confidence_and_limits);

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-panel">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
            Structured Reports
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Generate coaching interpretation from analytics
          </h2>
          <p className="text-sm leading-6 text-ink/70">
            This uses a persisted analytics summary as the source of truth, builds a narrower report contract, and stores a structured coaching report.
          </p>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink/80">Owned Riot profile</span>
            <select
              className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent"
              disabled={profiles.length === 0 || isSubmitting}
              onChange={(event) => setSelectedProfileId(Number(event.target.value))}
              value={selectedProfileId ?? ""}
            >
              {profiles.length === 0 ? <option value="">No profiles available</option> : null}
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.riot_id_display}{profile.is_primary ? " (Primary)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink/80">Analytics run</span>
            <select
              className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent"
              disabled={availableAnalyticsRuns.length === 0 || isSubmitting}
              onChange={(event) => setSelectedAnalyticsRunId(Number(event.target.value))}
              value={selectedAnalyticsRunId ?? ""}
            >
              {availableAnalyticsRuns.length === 0 ? <option value="">Use latest completed analytics run</option> : null}
              {availableAnalyticsRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  Run #{run.id} | {run.matches_analyzed} matches | {run.analytics_version}
                </option>
              ))}
            </select>
          </label>

          <button
            className="mt-7 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={profiles.length === 0 || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Generating..." : "Generate report"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-3xl border border-white/70 bg-white/90 px-6 py-5 text-sm text-ink/70 shadow-panel">
              Loading report runs...
            </div>
          ) : null}

          {!isLoading && reportRuns.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/15 bg-white/80 px-6 py-8 text-sm text-ink/65 shadow-panel">
              No report runs yet.
            </div>
          ) : null}

          {reportRuns.map((run) => {
            const profile = profiles.find((item) => item.id === run.riot_profile_id);
            const isSelected = selectedReportRunId === run.id;
            const statusTone =
              run.status === "completed"
                ? "bg-accent text-white"
                : run.status === "failed"
                  ? "bg-red-100 text-red-700"
                  : "bg-gold/20 text-ink";

            return (
              <article key={run.id} className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-panel">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold tracking-tight">Run #{run.id}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone}`}>
                      {run.status}
                    </span>
                    {isSelected ? (
                      <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                        Preview
                      </span>
                    ) : null}
                  </div>

                  <dl className="grid gap-2 text-sm text-ink/70 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-ink">Riot profile</dt>
                      <dd>{profile?.riot_id_display ?? `Profile ${run.riot_profile_id}`}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Analytics run</dt>
                      <dd>Run #{run.analytics_run_id}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Analytics version</dt>
                      <dd>{run.analytics_version}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Report version</dt>
                      <dd>{run.report_version}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Snapshot</dt>
                      <dd>{run.source_snapshot_type}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Started</dt>
                      <dd>{run.started_at}</dd>
                    </div>
                    {run.completed_at ? (
                      <div>
                        <dt className="font-medium text-ink">Completed</dt>
                        <dd>{run.completed_at}</dd>
                      </div>
                    ) : null}
                    {run.error_message ? (
                      <div className="sm:col-span-2">
                        <dt className="font-medium text-ink">Error</dt>
                        <dd>{run.error_message}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {run.status === "completed" ? (
                    <button
                      className="rounded-full border border-ink/10 px-4 py-2 text-sm font-medium text-ink/75 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isLoadingReport && selectedReportRunId === run.id}
                      onClick={() => {
                        void loadReport(run.id);
                      }}
                      type="button"
                    >
                      {isLoadingReport && selectedReportRunId === run.id ? "Loading..." : "Preview report"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-panel">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
              Report Preview
            </p>
            <h3 className="text-2xl font-extrabold tracking-tight">
              Stored coaching output
            </h3>
            <p className="text-sm leading-6 text-ink/70">
              This is a simple preview of the persisted structured report, not the final presentation layer.
            </p>
          </div>

          {isLoadingReport ? (
            <div className="mt-6 text-sm text-ink/70">Loading report...</div>
          ) : null}

          {!isLoadingReport && reportArtifact === null ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-mist/70 px-4 py-5 text-sm text-ink/65">
              Generate a report to preview the structured coaching output.
            </div>
          ) : null}

          {reportArtifact && report ? (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Prompt" value={`${reportArtifact.prompt_id}/${reportArtifact.prompt_version}`} />
                <MetricCard label="Version" value={reportArtifact.report_version} />
              </div>

              <div className="rounded-2xl bg-mist/70 px-4 py-4">
                <p className="text-sm font-semibold text-ink">Executive summary</p>
                <p className="mt-3 text-sm leading-6 text-ink/75">
                  {asText(executiveSummary?.headline) ?? "N/A"}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  {asText(executiveSummary?.summary) ?? "No summary available."}
                </p>
              </div>

              <div className="rounded-2xl bg-mist/70 px-4 py-4">
                <p className="text-sm font-semibold text-ink">Player profile</p>
                <dl className="mt-3 space-y-2 text-sm text-ink/70">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-ink">Primary style</dt>
                    <dd>{asText(playerProfile?.primary_style) ?? "N/A"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-ink">Champion focus</dt>
                    <dd>{asText(playerProfile?.champion_focus) ?? "N/A"}</dd>
                  </div>
                </dl>
              </div>

              <SectionList title="Strengths" items={strengths} />
              <SectionList title="Weaknesses" items={weaknesses} />
              <SectionList title="Next actions" items={nextActions} primaryField="action" secondaryField="why" />

              <div className="rounded-2xl bg-mist/70 px-4 py-4">
                <p className="text-sm font-semibold text-ink">Confidence and limits</p>
                <dl className="mt-3 space-y-2 text-sm text-ink/70">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-ink">Confidence</dt>
                    <dd>{asText(confidence?.confidence_level) ?? "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink">Explanation</dt>
                    <dd className="mt-1">{asText(confidence?.explanation) ?? "N/A"}</dd>
                  </div>
                </dl>
                {riskFlags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {riskFlags.map((item, index) => {
                      const row = asRecord(item);
                      const label = asText(row?.flag) ?? `risk-${index + 1}`;
                      return (
                        <span
                          key={`${label}-${index}`}
                          className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink/70"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-mist/70 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/55">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
    </div>
  );
}

function SectionList({
  title,
  items,
  primaryField = "title",
  secondaryField = "summary"
}: {
  title: string;
  items: unknown[];
  primaryField?: string;
  secondaryField?: string;
}) {
  return (
    <div className="rounded-2xl bg-mist/70 px-4 py-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3 space-y-3 text-sm text-ink/70">
        {items.length === 0 ? (
          <p>No entries available.</p>
        ) : (
          items.slice(0, 3).map((item, index) => {
            const row = asRecord(item);
            return (
              <div key={index}>
                <p className="font-medium text-ink">{asText(row?.[primaryField]) ?? `Item ${index + 1}`}</p>
                <p className="mt-1">{asText(row?.[secondaryField]) ?? "N/A"}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
