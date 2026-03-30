"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AnalyticsRunManager } from "@/components/analytics/analytics-run-manager";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";
import { StatusChip } from "@/components/dashboard/primitives";
import { IngestionRunManager } from "@/components/ingestion/ingestion-run-manager";
import { NormalizationRunManager } from "@/components/normalization/normalization-run-manager";
import { ReportRunManager } from "@/components/reports/report-run-manager";
import { RiotProfileManager } from "@/components/riot-profiles/riot-profile-manager";

import { useAuth } from "./auth-provider";

const primaryNavigation = [
  { label: "Overview Desk", href: "#overview", state: "live" },
  { label: "Champion Form", href: "#champion-form", state: "live" },
  { label: "Macro Lens", href: "#macro-lens", state: "live" },
  { label: "Coaching Board", href: "#coaching-board", state: "live" },
  { label: "Contextual Chat", href: "#contextual-chat", state: "live" }
] as const;

export function ProtectedAppShell() {
  const router = useRouter();
  const { isLoading, logout, token, user } = useAuth();

  useEffect(() => {
    if (!isLoading && user === null) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  if (isLoading || user === null) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="dashboard-panel rounded-[1.8rem] px-6 py-5 text-sm text-frost/68">
          Loading your performance desk...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto grid max-w-[1680px] gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="dashboard-panel rounded-[2.2rem] p-6 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
          <div className="flex h-full flex-col">
            <div>
              <div className="rounded-[1.7rem] border border-white/8 bg-gradient-to-br from-white/[0.06] via-white/[0.025] to-transparent p-5">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 rounded-[1.2rem] border border-glow/18 bg-white/[0.03]">
                    <div className="absolute inset-2 rounded-[0.9rem] border border-white/10" />
                    <div className="absolute inset-0 flex items-center justify-center font-display text-lg font-semibold text-glow">
                      R
                    </div>
                  </div>
                  <div>
                    <p className="dashboard-tactical-label text-gold">Rift</p>
                    <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
                      Performance analysis desk
                    </h1>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-frost/60">
                  Premium scouting surface built on owned profiles, persisted analytics, and structured coaching reports.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <StatusChip label="Overview live" tone="positive" />
                  <StatusChip label="Pillars live" tone="positive" />
                </div>
              </div>

              <nav className="mt-8 space-y-2">
                {primaryNavigation.map((item, index) => (
                  <a
                    key={item.label}
                    className={`group flex items-center justify-between rounded-[1.3rem] border px-4 py-3 transition ${index === 0 ? "border-glow/20 bg-glow/10" : "border-white/6 bg-white/[0.025] hover:border-glow/20 hover:bg-white/[0.05]"}`}
                    href={item.href}
                  >
                    <div>
                      <span className="dashboard-tactical-label text-frost/30">{String(index + 1).padStart(2, "0")}</span>
                      <p className="mt-1 text-sm font-semibold text-frost/78 transition group-hover:text-white">
                        {item.label}
                      </p>
                    </div>
                    <StatusChip label="Live" tone="positive" />
                  </a>
                ))}
              </nav>
            </div>

            <div className="mt-8 space-y-4">
              <div className="dashboard-line" />
              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="dashboard-tactical-label text-frost/34">Account</p>
                <p className="mt-3 text-sm font-semibold text-white">{user.email}</p>
                <p className="mt-2 text-sm leading-6 text-frost/58">
                  Ownership, ingestion, analytics, and reports all resolve from this signed-in account.
                </p>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-6">
              <Link
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-center text-sm font-medium text-frost/72 transition hover:border-white/18 hover:text-white"
                href="/"
              >
                Back home
              </Link>
              <button
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-night transition hover:bg-frost"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
                type="button"
              >
                Log out
              </button>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <header className="dashboard-panel rounded-[2.2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="dashboard-tactical-label text-glow">T010 contextual grounding</p>
                <div>
                  <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Grounded coaching chat now sits on top of the live dashboard
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-frost/62">
                    The overview, pillar surfaces, and orchestration remain stable. This first T010 pass adds a contextual chat surface that is explicitly grounded in the selected profile and the displayed persisted coaching artifact.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-frost/72 transition hover:border-white/18 hover:text-white"
                  href="#workbench"
                >
                  Open workbench
                </a>
                <StatusChip label="Grounded chat live" tone="positive" />
              </div>
            </div>
          </header>

          {token ? <OverviewDashboard token={token} userEmail={user.email} /> : null}

          <section className="space-y-4" id="workbench">
            <div className="dashboard-panel rounded-[2rem] p-4">
              <details>
                <summary className="cursor-pointer list-none rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-5 py-4 text-sm font-semibold text-white marker:hidden">
                  Operational workbench
                  <span className="mt-2 block text-sm font-normal leading-6 text-frost/56">
                    Existing data controls remain available here for profile linking, ingestion, normalization, analytics, and report generation.
                  </span>
                </summary>

                {token ? (
                  <div className="mt-6 space-y-6">
                    <RiotProfileManager token={token} />
                    <IngestionRunManager token={token} />
                    <NormalizationRunManager token={token} />
                    <AnalyticsRunManager token={token} />
                    <ReportRunManager token={token} />
                  </div>
                ) : null}
              </details>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
