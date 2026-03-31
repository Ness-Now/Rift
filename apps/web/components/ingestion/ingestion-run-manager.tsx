"use client";

import type { IngestionRun, RiotProfile } from "@rift/shared-types";
import { FormEvent, useEffect, useState } from "react";

import {
  ApiError,
  createIngestionRun,
  listIngestionRuns,
  listRiotProfiles
} from "@/lib/api";
import { selectPreferredProfile } from "@/lib/profiles";

const DEFAULT_MAX_MATCHES = 50;

export function IngestionRunManager({ token }: { token: string }) {
  const [profiles, setProfiles] = useState<RiotProfile[]>([]);
  const [runs, setRuns] = useState<IngestionRun[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [maxMatches, setMaxMatches] = useState(String(DEFAULT_MAX_MATCHES));
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  async function loadData() {
    setIsLoading(true);

    try {
      const [nextProfiles, nextRuns] = await Promise.all([
        listRiotProfiles(token),
        listIngestionRuns(token)
      ]);
      setProfiles(nextProfiles);
      setRuns(nextRuns);
      setError(null);
      setSelectedProfileId((current) => selectPreferredProfile(nextProfiles, current)?.id ?? null);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to load ingestion data right now.");
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
      setError("Select a Riot profile before starting ingestion.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createIngestionRun(token, {
        riot_profile_id: selectedProfileId,
        max_matches: Number(maxMatches)
      });
      await loadData();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to start the ingestion run.");
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
            Ranked Match Ingestion
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Fetch recent ranked Solo/Duo raw data
          </h2>
          <p className="text-sm leading-6 text-ink/70">
            Choose an owned Riot profile and ingest recent queue 420 matches. This stores raw match and timeline payloads only.
          </p>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.7fr_auto]" onSubmit={handleSubmit}>
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
            <span className="text-sm font-medium text-ink/80">Max matches</span>
            <input
              className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent"
              disabled={isSubmitting}
              max={200}
              min={1}
              onChange={(event) => setMaxMatches(event.target.value)}
              step={1}
              type="number"
              value={maxMatches}
            />
          </label>

          <button
            className="mt-7 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={profiles.length === 0 || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Ingesting..." : "Start ingestion"}
          </button>
        </form>

        <div className="mt-4 text-sm text-ink/65">
          {selectedProfile ? (
            <p>
              Selected routing: {selectedProfile.region} | {selectedProfile.account_region_routing} | {selectedProfile.platform_region}
            </p>
          ) : (
            <p>Add a Riot profile first to start ingestion.</p>
          )}
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-3xl border border-white/70 bg-white/90 px-6 py-5 text-sm text-ink/70 shadow-panel">
            Loading ingestion runs...
          </div>
        ) : null}

        {!isLoading && runs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink/15 bg-white/80 px-6 py-8 text-sm text-ink/65 shadow-panel">
            No ingestion runs yet.
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
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                      <dt className="font-medium text-ink">Requested</dt>
                      <dd>{run.requested_max_matches} matches, queue {run.queue_id}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">IDs returned</dt>
                      <dd>{run.match_ids_requested}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Stored raw payloads</dt>
                      <dd>
                        {run.match_payloads_ingested_count} match / {run.timeline_payloads_ingested_count} timeline
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Queue-420 ingested</dt>
                      <dd>{run.match_ids_ingested_count}</dd>
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
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
