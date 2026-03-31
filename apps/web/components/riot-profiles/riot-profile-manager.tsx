"use client";

import type { RiotProfile } from "@rift/shared-types";
import { FormEvent, useEffect, useState } from "react";

import { ApiError, createRiotProfile, deleteRiotProfile, listRiotProfiles, makePrimaryRiotProfile, verifyRiotProfile } from "@/lib/api";

const supportedRegions = [
  "BR",
  "EUNE",
  "EUW",
  "JP",
  "KR",
  "LAN",
  "LAS",
  "NA",
  "OCE",
  "TR",
  "RU",
  "PH",
  "SG",
  "TH",
  "TW",
  "VN"
];

type MutationState = {
  action: "create" | "delete" | "make-primary" | "verify";
  profileId?: number;
} | null;

export function RiotProfileManager({ token }: { token: string }) {
  const [profiles, setProfiles] = useState<RiotProfile[]>([]);
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("EUW");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mutationState, setMutationState] = useState<MutationState>(null);

  async function loadProfiles() {
    setIsLoading(true);
    try {
      const nextProfiles = await listRiotProfiles(token);
      setError(null);
      setProfiles(nextProfiles);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to load Riot profiles right now.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProfiles();
  }, [token]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMutationState({ action: "create" });

    try {
      await createRiotProfile(token, {
        region,
        riot_id: riotId
      });
      setRiotId("");
      await loadProfiles();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to add this Riot profile.");
      }
    } finally {
      setMutationState(null);
    }
  }

  async function handleDelete(profileId: number) {
    setError(null);
    setMutationState({ action: "delete", profileId });

    try {
      await deleteRiotProfile(token, profileId);
      await loadProfiles();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to delete this Riot profile.");
      }
    } finally {
      setMutationState(null);
    }
  }

  async function handleVerify(profileId: number) {
    setError(null);
    setMutationState({ action: "verify", profileId });

    try {
      await verifyRiotProfile(token, profileId);
      await loadProfiles();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to verify this Riot profile.");
      }
    } finally {
      setMutationState(null);
    }
  }

  async function handleMakePrimary(profileId: number) {
    setError(null);
    setMutationState({ action: "make-primary", profileId });

    try {
      await makePrimaryRiotProfile(token, profileId);
      await loadProfiles();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Unable to promote this Riot profile.");
      }
    } finally {
      setMutationState(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-panel">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">
            Riot Profiles
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Link a Riot profile to your account
          </h2>
          <p className="text-sm leading-6 text-ink/70">
            This step resolves Riot ID to PUUID and stores the owned profile. Secondary workbench controls below handle ingestion, normalization, analytics, and report generation.
          </p>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-[1.4fr_0.7fr_auto]" onSubmit={handleCreate}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink/80">Riot ID</span>
            <input
              className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent"
              onChange={(event) => setRiotId(event.target.value)}
              placeholder="GameName#TagLine"
              required
              value={riotId}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink/80">Region</span>
            <select
              className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm outline-none transition focus:border-accent"
              onChange={(event) => setRegion(event.target.value)}
              value={region}
            >
              {supportedRegions.map((supportedRegion) => (
                <option key={supportedRegion} value={supportedRegion}>
                  {supportedRegion}
                </option>
              ))}
            </select>
          </label>

          <button
            className="mt-7 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={mutationState?.action === "create"}
            type="submit"
          >
            {mutationState?.action === "create" ? "Adding..." : "Add profile"}
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
            Loading Riot profiles...
          </div>
        ) : null}

        {!isLoading && profiles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink/15 bg-white/80 px-6 py-8 text-sm text-ink/65 shadow-panel">
            No Riot profiles linked yet.
          </div>
        ) : null}

        {profiles.map((profile) => {
          const isDeleting = mutationState?.action === "delete" && mutationState.profileId === profile.id;
          const isPromoting =
            mutationState?.action === "make-primary" && mutationState.profileId === profile.id;
          const isVerifying =
            mutationState?.action === "verify" && mutationState.profileId === profile.id;

          return (
            <article
              key={profile.id}
              className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-panel"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold tracking-tight">{profile.riot_id_display}</h3>
                    {profile.is_primary ? (
                      <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                        Primary
                      </span>
                    ) : null}
                  </div>

                  <dl className="grid gap-2 text-sm text-ink/70 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-ink">Region</dt>
                      <dd>
                        {profile.region} | {profile.platform_region} | {profile.account_region_routing}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Last verified</dt>
                      <dd>{profile.last_verified_at}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-ink">PUUID</dt>
                      <dd className="break-all">{profile.puuid}</dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-full border border-ink/10 px-4 py-2 text-sm font-medium text-ink/75 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={profile.is_primary || isPromoting}
                    onClick={() => handleMakePrimary(profile.id)}
                    type="button"
                  >
                    {isPromoting ? "Promoting..." : "Make primary"}
                  </button>
                  <button
                    className="rounded-full border border-ink/10 px-4 py-2 text-sm font-medium text-ink/75 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isVerifying}
                    onClick={() => handleVerify(profile.id)}
                    type="button"
                  >
                    {isVerifying ? "Verifying..." : "Verify"}
                  </button>
                  <button
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isDeleting}
                    onClick={() => handleDelete(profile.id)}
                    type="button"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
