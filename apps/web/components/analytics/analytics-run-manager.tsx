"use client";

import type { AnalyticsRun, AnalyticsSummary, RiotProfile } from "@rift/shared-types";
import { FormEvent, useEffect, useState } from "react";

import {
  ApiError,
  createAnalyticsRun,
  getAnalyticsSummary,
  listAnalyticsRuns,
  listRiotProfiles
} from "@/lib/api";

export function AnalyticsRunManager({ token }: { token: string }) {
  const [profiles, setProfiles] = useState<RiotProfile[]>([]);
  const [runs, setRuns] = useState<AnalyticsRun[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedSummaryRunId, setSelectedSummaryRunId] = useState<number | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary(runId: number | null) {
    if (runId === null) {
      setSelectedSummaryRunId(null);
      setSummary(null);
      return;
    }

    setIsLoadingSummary(true);
    try {
      const nextSummary = await getAnalyticsSummary(token, runId);
      setSelectedSummaryRunId(runId);
      setSummary(nextSummary);
      setError(null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to load the analytics summary.");
      }
    } finally {
      setIsLoadingSummary(false);
    }
  }

  async function loadData() {
    setIsLoading(true);

    try {
      const [nextProfiles, nextRuns] = await Promise.all([
        listRiotProfiles(token),
        listAnalyticsRuns(token)
      ]);
      setProfiles(nextProfiles);
      setRuns(nextRuns);
      setError(null);

      if (nextProfiles.length > 0) {
        const preferredProfile = nextProfiles.find((profile) => profile.is_primary) ?? nextProfiles[0];
        setSelectedProfileId((current) => current ?? preferredProfile.id);
      } else {
        setSelectedProfileId(null);
      }

      const preferredSummaryRun =
        nextRuns.find((run) => run.id === selectedSummaryRunId && run.status === "completed")
        ?? nextRuns.find((run) => run.status === "completed")
        ?? null;
      await loadSummary(preferredSummaryRun?.id ?? null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to load analytics data right now.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedProfileId === null) {
      setError("Select a Riot profile before starting analytics.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const run = await createAnalyticsRun(token, {
        riot_profile_id: selectedProfileId
      });
      await loadData();
      if (run.status === "completed") {
        await loadSummary(run.id);
      }
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to start the analytics run.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const overview = asRecord(summary?.overview);
  const dataQuality = asRecord(summary?.data_quality);
  const mostPlayedChampion = asText(overview?.most_played_champion);
  const recentWindows = asArray(asRecord(summary?.progression)?.recent_windows);
  const limitations = asArray(dataQuality?.limitations);

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-panel">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
            Deterministic Analytics
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Compute stable analytics from the clean snapshot
          </h2>
          <p className="text-sm leading-6 text-ink/70">
            This reads the latest clean tables only and stores a structured summary for later report generation and dashboard use.
          </p>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-[1.3fr_auto]" onSubmit={handleSubmit}>
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

          <button
            className="mt-7 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={profiles.length === 0 || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Computing..." : "Start analytics"}
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
              Loading analytics runs...
            </div>
          ) : null}

          {!isLoading && runs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/15 bg-white/80 px-6 py-8 text-sm text-ink/65 shadow-panel">
              No analytics runs yet.
            </div>
          ) : null}

          {runs.map((run) => {
            const profile = profiles.find((item) => item.id === run.riot_profile_id);
            const isSelected = selectedSummaryRunId === run.id;
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
                      <dt className="font-medium text-ink">Matches analyzed</dt>
                      <dd>{run.matches_analyzed}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Snapshot</dt>
                      <dd>{run.source_snapshot_type}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Analytics version</dt>
                      <dd>{run.analytics_version}</dd>
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
                      disabled={isLoadingSummary && selectedSummaryRunId === run.id}
                      onClick={() => {
                        void loadSummary(run.id);
                      }}
                      type="button"
                    >
                      {isLoadingSummary && selectedSummaryRunId === run.id ? "Loading..." : "Preview summary"}
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
              Summary Preview
            </p>
            <h3 className="text-2xl font-extrabold tracking-tight">
              Latest structured snapshot
            </h3>
            <p className="text-sm leading-6 text-ink/70">
              This is a basic preview of the persisted analytics sections, not the final dashboard.
            </p>
          </div>

          {isLoadingSummary ? (
            <div className="mt-6 text-sm text-ink/70">Loading analytics summary...</div>
          ) : null}

          {!isLoadingSummary && summary === null ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-mist/70 px-4 py-5 text-sm text-ink/65">
              Run analytics to preview the current clean snapshot summary.
            </div>
          ) : null}

          {summary ? (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Games" value={formatValue(overview?.total_games)} />
                <MetricCard label="Win rate" value={formatPercent(overview?.win_rate)} />
                <MetricCard label="Avg KDA" value={formatValue(overview?.avg_kda)} />
                <MetricCard label="Avg DPM" value={formatValue(overview?.avg_dpm)} />
              </div>

              <div className="rounded-2xl bg-mist/70 px-4 py-4">
                <p className="text-sm font-semibold text-ink">Overview</p>
                <dl className="mt-3 space-y-2 text-sm text-ink/70">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-ink">Most played champion</dt>
                    <dd>{mostPlayedChampion ?? "N/A"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-ink">Most played win rate</dt>
                    <dd>{formatPercent(overview?.most_played_champion_win_rate)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-ink">Tracked duo</dt>
                    <dd>{asBoolean(dataQuality?.tracked_duo_available) ? "Available" : "Unavailable"}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl bg-mist/70 px-4 py-4">
                <p className="text-sm font-semibold text-ink">Recent windows</p>
                <div className="mt-3 space-y-2 text-sm text-ink/70">
                  {recentWindows.length === 0 ? (
                    <p>No recent-window splits available yet.</p>
                  ) : (
                    recentWindows.slice(0, 4).map((windowRow, index) => {
                      const row = asRecord(windowRow);
                      return (
                        <div key={index} className="flex items-center justify-between gap-4">
                          <span className="font-medium text-ink">
                            Last {formatValue(row?.window_size)} matches
                          </span>
                          <span>{formatPercent(row?.win_rate)} win rate</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-mist/70 px-4 py-4">
                <p className="text-sm font-semibold text-ink">Data quality</p>
                <dl className="mt-3 space-y-2 text-sm text-ink/70">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-ink">Timeline metrics</dt>
                    <dd>{asBoolean(dataQuality?.timeline_metrics_available) ? "Available" : "Unavailable"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-ink">Event metrics</dt>
                    <dd>{asBoolean(dataQuality?.event_metrics_available) ? "Available" : "Unavailable"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-ink">Sessionization</dt>
                    <dd>{asBoolean(dataQuality?.sessionization_available) ? "Available" : "Unavailable"}</dd>
                  </div>
                </dl>
                {limitations.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {limitations.map((entry, index) => (
                      <span
                        key={`${entry}-${index}`}
                        className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink/70"
                      >
                        {String(entry)}
                      </span>
                    ))}
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

function asBoolean(value: unknown): boolean {
  return value === true;
}

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return "N/A";
}

function formatPercent(value: unknown): string {
  if (typeof value !== "number") {
    return "N/A";
  }
  return `${(value * 100).toFixed(1)}%`;
}
