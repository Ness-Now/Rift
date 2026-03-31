"use client";

import type { NormalizationRun, RiotProfile } from "@rift/shared-types";
import { FormEvent, useEffect, useState } from "react";

import {
  ApiError,
  createNormalizationRun,
  listNormalizationRuns,
  listRiotProfiles
} from "@/lib/api";
import { selectPreferredProfile } from "@/lib/profiles";

export function NormalizationRunManager({ token }: { token: string }) {
  const [profiles, setProfiles] = useState<RiotProfile[]>([]);
  const [runs, setRuns] = useState<NormalizationRun[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);

    try {
      const [nextProfiles, nextRuns] = await Promise.all([
        listRiotProfiles(token),
        listNormalizationRuns(token)
      ]);
      setProfiles(nextProfiles);
      setRuns(nextRuns);
      setError(null);

      setSelectedProfileId((current) => selectPreferredProfile(nextProfiles, current)?.id ?? null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to load normalization data right now.");
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
      setError("Select a Riot profile before starting normalization.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createNormalizationRun(token, {
        riot_profile_id: selectedProfileId
      });
      await loadData();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to start the normalization run.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-panel">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
            Clean Normalization
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Build stable clean tables from raw payloads
          </h2>
          <p className="text-sm leading-6 text-ink/70">
            Normalize persisted raw Riot payloads for one owned profile. Duplicate raw rows are deduplicated by match id before clean rows are written.
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
            {isSubmitting ? "Normalizing..." : "Start normalization"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-3xl border border-white/70 bg-white/90 px-6 py-5 text-sm text-ink/70 shadow-panel">
            Loading normalization runs...
          </div>
        ) : null}

        {!isLoading && runs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink/15 bg-white/80 px-6 py-8 text-sm text-ink/65 shadow-panel">
            No normalization runs yet.
          </div>
        ) : null}

        {runs.map((run) => {
          const profile = profiles.find((item) => item.id === run.riot_profile_id);
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
                </div>

                <dl className="grid gap-2 text-sm text-ink/70 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-ink">Riot profile</dt>
                    <dd>{profile?.riot_id_display ?? `Profile ${run.riot_profile_id}`}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink">Raw rows scanned</dt>
                    <dd>{run.raw_match_rows_scanned}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink">Unique matches normalized</dt>
                    <dd>{run.unique_matches_normalized}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink">Participants written</dt>
                    <dd>{run.participants_rows_written}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink">Teams written</dt>
                    <dd>{run.teams_rows_written}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink">Timeline rows written</dt>
                    <dd>{run.timeline_rows_written}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink">Events written</dt>
                    <dd>{run.events_rows_written}</dd>
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
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
