"use client";

import type { AnalyticsSummary, ReportArtifact, RiotProfile } from "@rift/shared-types";

import {
  asArray,
  asBoolean,
  asRecord,
  asText,
  formatCompactNumber,
  formatDurationBucket,
  formatHourLabel,
  formatMetric,
  formatPercent,
  formatSecondsToClock,
  formatSignedMetric
} from "@/lib/dashboard";

import {
  DashboardPanel,
  DataTable,
  InsightList,
  MetricRail,
  SectionEyebrow,
  SectionHeading,
  StatusChip
} from "./primitives";

type PillarSectionsProps = {
  analyticsSummary: AnalyticsSummary | null;
  reportArtifact: ReportArtifact | null;
  selectedProfile: RiotProfile | null;
};

type InsightRow = {
  title: string;
  body: string;
};

export function PillarSections({ analyticsSummary, reportArtifact, selectedProfile }: PillarSectionsProps) {
  const overview = asRecord(analyticsSummary?.overview);
  const progression = asRecord(analyticsSummary?.progression);
  const splits = asRecord(analyticsSummary?.splits);
  const carryContext = asRecord(analyticsSummary?.carry_context);
  const macro = asRecord(analyticsSummary?.macro);
  const earlyMid = asRecord(analyticsSummary?.early_mid);
  const dataQuality = asRecord(analyticsSummary?.data_quality);
  const report = reportArtifact?.report ?? null;

  const playerProfile = asRecord(report?.player_profile);
  const confidence = asRecord(report?.confidence_and_limits);
  const strengths = asArray(report?.strengths);
  const weaknesses = asArray(report?.weaknesses);
  const priorityLevers = asArray(report?.priority_levers);
  const coachingFocus = asArray(report?.coaching_focus);
  const riskFlags = asArray(report?.risk_flags);
  const nextActions = asArray(report?.next_actions);

  const championDistribution = asArray(overview?.champion_pool_distribution);
  const byChampion = asArray(splits?.by_champion);
  const byDuration = asArray(splits?.by_game_duration_bucket);
  const byHour = asArray(splits?.by_hour_of_day);
  const byWeekday = asArray(splits?.by_weekday);
  const bySession = asArray(splits?.by_session);
  const recentWindows = asArray(progression?.recent_windows);
  const mainChampionProgression = asArray(asRecord(progression?.main_champion_progression)?.segments);
  const winsMacro = asRecord(macro?.wins);
  const lossesMacro = asRecord(macro?.losses);
  const checkpoint10 = asRecord(earlyMid?.checkpoint_10);
  const checkpoint15 = asRecord(earlyMid?.checkpoint_15);
  const firstActionTimes = asRecord(earlyMid?.first_action_times);
  const finalRoleDiffs = asRecord(earlyMid?.role_opponent_final_diffs);

  const championFocus = asText(playerProfile?.champion_focus)
    ?? asText(overview?.most_played_champion)
    ?? "Champion focus pending";
  const bestHour = bestMetricRow(byHour);
  const bestWeekday = bestMetricRow(byWeekday);
  const longestSession = longestSessionRow(bySession);

  const championPoolCards = championDistribution.slice(0, 4).map((entry, index) => {
    const row = asRecord(entry);
    return {
      label: index === 0 ? "Main champion" : `Pool slot ${index + 1}`,
      value: asText(row?.champion_name) ?? `Champion ${index + 1}`,
      detail: `${formatMetric(row?.games, 0)} games | ${formatPercent(row?.win_rate)}`
    };
  });

  const championRows = byChampion.slice(0, 5).map((entry) => {
    const row = asRecord(entry);
    return [
      asText(row?.label) ?? "Unknown",
      formatMetric(row?.games, 0),
      formatPercent(row?.win_rate),
      formatMetric(row?.avg_kda),
      formatMetric(row?.avg_dpm)
    ];
  });

  const durationRows = byDuration.slice(0, 4).map((entry) => {
    const row = asRecord(entry);
    return [
      formatDurationBucket(row?.label),
      formatMetric(row?.games, 0),
      formatPercent(row?.win_rate),
      formatMetric(row?.avg_kda),
      formatMetric(row?.avg_dpm)
    ];
  });

  const sessionRows = bySession.slice(0, 4).map((entry) => {
    const row = asRecord(entry);
    return [
      `Session ${formatMetric(row?.session_id, 0)}`,
      formatMetric(row?.games, 0),
      formatPercent(row?.win_rate),
      joinTextArray(row?.champions)
    ];
  });

  const championNarrative = insightRowsFromStructured(
    [playerProfile, ...coachingFocus.map((entry) => asRecord(entry))].filter(Boolean),
    ["primary_style", "champion_focus", "title", "focus", "theme", "label", "action"],
    ["summary", "description", "why", "details", "explanation"],
    "Champion note"
  ).slice(0, 3);

  const macroNarrative = insightRowsFromStructured(
    [...priorityLevers.map((entry) => asRecord(entry)), ...weaknesses.map((entry) => asRecord(entry))].filter(Boolean),
    ["title", "theme", "focus", "label"],
    ["summary", "reason", "description", "why"],
    "Macro signal"
  ).slice(0, 3);

  const coachingPriorityItems = insightRowsFromStructured(
    priorityLevers.map((entry) => asRecord(entry)).filter(Boolean),
    ["title", "theme", "label"],
    ["summary", "reason", "description"],
    "Priority"
  ).slice(0, 3);

  const coachingFocusItems = insightRowsFromStructured(
    coachingFocus.map((entry) => asRecord(entry)).filter(Boolean),
    ["title", "focus", "theme", "label", "action"],
    ["summary", "why", "description", "details"],
    "Focus"
  ).slice(0, 3);

  const nextActionItems = insightRowsFromStructured(
    nextActions.map((entry) => asRecord(entry)).filter(Boolean),
    ["action", "title", "label"],
    ["why", "summary", "description"],
    "Action"
  ).slice(0, 3);

  const riskItems = insightRowsFromStructured(
    riskFlags.map((entry) => asRecord(entry)).filter(Boolean),
    ["title", "label", "theme"],
    ["summary", "reason", "description"],
    "Risk"
  ).slice(0, 3);

  const strengthItems = insightRowsFromStructured(
    strengths.map((entry) => asRecord(entry)).filter(Boolean),
    ["title", "label", "theme"],
    ["summary", "description", "reason"],
    "Strength"
  ).slice(0, 3);

  return (
    <div className="space-y-8">
      <DashboardPanel className="p-6 sm:p-7" id="champion-form">
        <SectionHeading
          description="Champion Form owns the player's pool, repetition, progression, and lane-shape evidence. It should feel like a form desk rather than a general dashboard."
          title="Champion Form"
          action={<StatusChip label="T009 live" tone="positive" />}
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <DashboardPanel className="border-glow/16 bg-gradient-to-br from-glow/10 via-transparent to-transparent p-6">
              <SectionEyebrow tone="accent">Form identity</SectionEyebrow>
              <h3 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">
                {championFocus}
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-frost/64">
                {championNarrative[0]?.body ?? `${selectedProfile?.riot_id_display ?? "This profile"} is now framed through champion distribution, main-pick progression, and early checkpoint context from the latest clean snapshot.`}
              </p>
              <div className="mt-6">
                <MetricRail items={championPoolCards} accent="glow" />
              </div>
            </DashboardPanel>

            <DataTable
              columns={["Champion", "Games", "Win rate", "KDA", "DPM"]}
              rows={championRows}
              title="Champion split board"
            />

            <div className="grid gap-4 lg:grid-cols-3">
              {mainChampionProgression.length === 0 ? (
                <DashboardPanel className="p-5 lg:col-span-3">
                  <p className="text-sm leading-7 text-frost/58">
                    Main-champion progression will appear here once enough champion repetitions exist in the clean snapshot.
                  </p>
                </DashboardPanel>
              ) : (
                mainChampionProgression.map((entry) => {
                  const row = asRecord(entry);
                  const segment = asText(row?.segment) ?? "segment";
                  return (
                    <DashboardPanel key={segment} className="p-5">
                      <p className="dashboard-tactical-label text-glow">{segment}</p>
                      <p className="mt-3 font-display text-3xl font-semibold text-white">{formatPercent(row?.win_rate)}</p>
                      <p className="mt-2 text-sm text-frost/56">{formatMetric(row?.games, 0)} games</p>
                      <div className="mt-4 space-y-2 text-sm text-frost/62">
                        <div className="flex items-center justify-between"><span>KDA</span><span>{formatMetric(row?.avg_kda)}</span></div>
                        <div className="flex items-center justify-between"><span>DPM</span><span>{formatMetric(row?.avg_dpm)}</span></div>
                        <div className="flex items-center justify-between"><span>CS/min</span><span>{formatMetric(row?.avg_cs_per_min)}</span></div>
                      </div>
                    </DashboardPanel>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-6">
            <DashboardPanel className="p-6">
              <SectionEyebrow tone="steel">Lane checkpoint context</SectionEyebrow>
              <div className="mt-5">
                <MetricRail
                  accent="gold"
                  columns={2}
                  items={[
                    {
                      label: "10m gold diff",
                      value: formatSignedMetric(checkpoint10?.avg_role_opp_gold_diff),
                      detail: `XP ${formatSignedMetric(checkpoint10?.avg_role_opp_xp_diff)} | CS ${formatSignedMetric(checkpoint10?.avg_role_opp_cs_diff)}`
                    },
                    {
                      label: "15m gold diff",
                      value: formatSignedMetric(checkpoint15?.avg_role_opp_gold_diff),
                      detail: `XP ${formatSignedMetric(checkpoint15?.avg_role_opp_xp_diff)} | CS ${formatSignedMetric(checkpoint15?.avg_role_opp_cs_diff)}`
                    },
                    {
                      label: "First kill",
                      value: formatSecondsToClock(firstActionTimes?.avg_first_kill_time_seconds),
                      detail: `First assist ${formatSecondsToClock(firstActionTimes?.avg_first_assist_time_seconds)}`
                    },
                    {
                      label: "Final damage diff",
                      value: formatSignedMetric(finalRoleDiffs?.avg_damage_to_champions_diff),
                      detail: `Gold ${formatSignedMetric(finalRoleDiffs?.avg_gold_diff)} | CS ${formatSignedMetric(finalRoleDiffs?.avg_cs_diff)}`
                    }
                  ]}
                />
              </div>
            </DashboardPanel>

            <DashboardPanel className="p-6">
              <SectionEyebrow tone="steel">Time patterning</SectionEyebrow>
              <div className="mt-5 space-y-4">
                <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.028] px-4 py-4">
                  <p className="dashboard-tactical-label text-frost/32">Best hour</p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {bestHour ? formatHourLabel(bestHour.label) : "Awaiting time split data"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-frost/56">
                    {bestHour ? `${formatPercent(bestHour.winRate)} win rate across ${bestHour.games} games` : "No hour-of-day split is available in the current snapshot."}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.028] px-4 py-4">
                  <p className="dashboard-tactical-label text-frost/32">Best weekday</p>
                  <p className="mt-3 text-lg font-semibold text-white">{bestWeekday?.label ?? "Awaiting weekday split data"}</p>
                  <p className="mt-2 text-sm leading-6 text-frost/56">
                    {bestWeekday ? `${formatPercent(bestWeekday.winRate)} win rate across ${bestWeekday.games} games` : "No weekday split is available in the current snapshot."}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.028] px-4 py-4">
                  <p className="dashboard-tactical-label text-frost/32">Longest session</p>
                  <p className="mt-3 text-lg font-semibold text-white">{longestSession ? `${longestSession.games} games` : "Awaiting session data"}</p>
                  <p className="mt-2 text-sm leading-6 text-frost/56">
                    {longestSession ? `${formatPercent(longestSession.winRate)} win rate | ${longestSession.champions}` : "Sessionization appears only when match timestamps are present in the clean snapshot."}
                  </p>
                </div>
              </div>
            </DashboardPanel>

            <InsightList accent="glow" emptyLabel="Champion-form commentary will appear after the first report artifact." items={championNarrative.slice(0, 3)} title="Form notes" />
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-6 sm:p-7" id="macro-lens">
        <SectionHeading
          description="Macro Lens owns objective conversion, team-context pressure, and win/loss shape. It should read like a command-table view of what wins and losses look like."
          title="Macro Lens"
          action={<StatusChip label="T009 live" tone="positive" />}
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <DashboardPanel className="border-gold/14 bg-gradient-to-br from-gold/8 via-transparent to-transparent p-6">
              <SectionEyebrow tone="gold">Objective conversion</SectionEyebrow>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <p className="dashboard-tactical-label text-gold">Wins</p>
                  <div className="mt-3 space-y-2 text-sm text-frost/66">
                    <div className="flex items-center justify-between"><span>Dragons</span><span>{formatMetric(winsMacro?.avg_team_dragons)}</span></div>
                    <div className="flex items-center justify-between"><span>Heralds</span><span>{formatMetric(winsMacro?.avg_team_heralds)}</span></div>
                    <div className="flex items-center justify-between"><span>Barons</span><span>{formatMetric(winsMacro?.avg_team_barons)}</span></div>
                    <div className="flex items-center justify-between"><span>Towers</span><span>{formatMetric(winsMacro?.avg_team_towers)}</span></div>
                  </div>
                </div>
                <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <p className="dashboard-tactical-label text-ember">Losses</p>
                  <div className="mt-3 space-y-2 text-sm text-frost/66">
                    <div className="flex items-center justify-between"><span>Enemy dragons</span><span>{formatMetric(lossesMacro?.avg_enemy_dragons)}</span></div>
                    <div className="flex items-center justify-between"><span>Enemy heralds</span><span>{formatMetric(lossesMacro?.avg_enemy_heralds)}</span></div>
                    <div className="flex items-center justify-between"><span>Enemy barons</span><span>{formatMetric(lossesMacro?.avg_enemy_barons)}</span></div>
                    <div className="flex items-center justify-between"><span>Enemy towers</span><span>{formatMetric(lossesMacro?.avg_enemy_towers)}</span></div>
                  </div>
                </div>
              </div>
            </DashboardPanel>

            <DataTable
              columns={["Duration", "Games", "Win rate", "KDA", "DPM"]}
              rows={durationRows}
              title="Game-shape splits"
            />

            <DataTable
              columns={["Session", "Games", "Win rate", "Champion mix"]}
              rows={sessionRows}
              title="Session board"
            />
          </div>

          <div className="space-y-6">
            <DashboardPanel className="p-6">
              <SectionEyebrow tone="steel">Carry + context</SectionEyebrow>
              <div className="mt-5">
                <MetricRail
                  accent="gold"
                  columns={3}
                  items={[
                    {
                      label: "Damage share",
                      value: formatPercent(carryContext?.avg_damage_share),
                      detail: `Kill share ${formatPercent(carryContext?.avg_kill_share)}`
                    },
                    {
                      label: "Gold share",
                      value: formatPercent(carryContext?.avg_gold_share),
                      detail: `Ally KDA ${formatMetric(carryContext?.avg_ally_kda_excluding_self)}`
                    },
                    {
                      label: "Enemy KDA",
                      value: formatMetric(carryContext?.avg_enemy_kda),
                      detail: `Enemy damage ${formatCompactNumber(carryContext?.avg_enemy_damage_to_champions)}`
                    }
                  ]}
                />
              </div>
            </DashboardPanel>

            <InsightList accent="gold" emptyLabel="Macro-oriented report interpretation will appear once report priorities are available." items={macroNarrative} title="Macro readings" />
            <InsightList accent="glow" emptyLabel="No clear strength signals yet." items={strengthItems} title="What holds up" />
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-6 sm:p-7" id="coaching-board">
        <SectionHeading
          description="Coaching Board owns prioritization, execution, and confidence. It should make the stored report artifact feel like an actionable training surface, not just a text output."
          title="Coaching Board"
          action={<StatusChip label="T009 live" tone="positive" />}
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <DashboardPanel className="border-ember/14 bg-gradient-to-br from-ember/8 via-transparent to-transparent p-6">
              <SectionEyebrow tone="accent">Board status</SectionEyebrow>
              <div className="mt-5">
                <MetricRail
                  accent="ember"
                  columns={4}
                  items={[
                    {
                      label: "Report version",
                      value: reportArtifact?.report_version ?? "N/A",
                      detail: reportArtifact?.analytics_version ?? "No analytics version"
                    },
                    {
                      label: "Matches analyzed",
                      value: formatMetric(dataQuality?.matches_analyzed, 0),
                      detail: selectedProfile?.riot_id_display ?? "No profile selected"
                    },
                    {
                      label: "Timeline",
                      value: asBoolean(dataQuality?.timeline_metrics_available) ? "Ready" : "Limited",
                      detail: asBoolean(dataQuality?.event_metrics_available) ? "Events ready" : "Events limited"
                    },
                    {
                      label: "Confidence",
                      value: asText(confidence?.confidence_level) ?? "Pending",
                      detail: asText(confidence?.explanation) ?? "Confidence will populate from the report artifact."
                    }
                  ]}
                />
              </div>
            </DashboardPanel>

            <div className="grid gap-6 xl:grid-cols-3">
              <InsightList accent="gold" emptyLabel="Priority levers will appear here once report generation completes." items={coachingPriorityItems} title="Priority stack" />
              <InsightList accent="glow" emptyLabel="Coaching focus areas will appear here once report generation completes." items={coachingFocusItems} title="Focus blocks" />
              <InsightList accent="ember" emptyLabel="Next actions will appear here once report generation completes." items={nextActionItems} title="Execution steps" />
            </div>
          </div>

          <div className="space-y-6">
            <InsightList accent="ember" emptyLabel="Risk flags will appear here once the report artifact includes them." items={riskItems} title="Risk flags" />

            <DashboardPanel className="p-6">
              <SectionEyebrow tone="steel">Evidence guardrails</SectionEyebrow>
              <div className="mt-5 flex flex-wrap gap-3">
                <StatusChip label={asBoolean(dataQuality?.timeline_metrics_available) ? "Timeline evidence" : "Timeline limited"} tone={asBoolean(dataQuality?.timeline_metrics_available) ? "positive" : "warning"} />
                <StatusChip label={asBoolean(dataQuality?.event_metrics_available) ? "Event evidence" : "Event limited"} tone={asBoolean(dataQuality?.event_metrics_available) ? "positive" : "warning"} />
                <StatusChip label={asBoolean(dataQuality?.tracked_duo_available) ? "Tracked duo ready" : "No duo data"} tone={asBoolean(dataQuality?.tracked_duo_available) ? "positive" : "warning"} />
              </div>
              <div className="dashboard-line my-5" />
              <p className="text-sm leading-7 text-frost/60">
                {joinTextArray(dataQuality?.limitations) || "No data-quality limitations were reported for this snapshot."}
              </p>
            </DashboardPanel>

            <DashboardPanel className="p-6">
              <SectionEyebrow tone="steel">Recent form context</SectionEyebrow>
              <div className="mt-5 space-y-4">
                {recentWindows.length === 0 ? (
                  <p className="text-sm leading-7 text-frost/58">Recent-window form will appear once enough matches exist in the clean snapshot.</p>
                ) : (
                  recentWindows.slice(0, 3).map((entry) => {
                    const row = asRecord(entry);
                    return (
                      <div key={String(row?.window_size)} className="rounded-[1.25rem] border border-white/8 bg-white/[0.028] px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold text-white">Last {formatMetric(row?.window_size, 0)}</p>
                          <p className="font-display text-xl font-semibold text-frost">{formatPercent(row?.win_rate)}</p>
                        </div>
                        <p className="mt-2 text-sm text-frost/56">
                          {formatMetric(row?.wins, 0)}W / {formatMetric(row?.losses, 0)}L | KDA {formatMetric(row?.avg_kda)} | DPM {formatMetric(row?.avg_dpm)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </DashboardPanel>
          </div>
        </div>
      </DashboardPanel>
    </div>
  );
}

type MetricRow = {
  label: string;
  winRate: string;
  games: string;
  champions: string;
};

function bestMetricRow(entries: unknown[]): { label: string; winRate: string; games: string } | null {
  let best: Record<string, unknown> | null = null;
  let bestValue = -1;

  for (const entry of entries) {
    const row = asRecord(entry);
    if (!row) {
      continue;
    }
    const value = typeof row.win_rate === "number" ? row.win_rate : -1;
    if (value > bestValue) {
      bestValue = value;
      best = row;
    }
  }

  if (!best) {
    return null;
  }

  return {
    label: asText(best.label) ?? "N/A",
    winRate: formatPercent(best.win_rate),
    games: formatMetric(best.games, 0)
  };
}

function longestSessionRow(entries: unknown[]): MetricRow | null {
  let best: Record<string, unknown> | null = null;
  let bestGames = -1;

  for (const entry of entries) {
    const row = asRecord(entry);
    if (!row) {
      continue;
    }
    const value = typeof row.games === "number" ? row.games : -1;
    if (value > bestGames) {
      bestGames = value;
      best = row;
    }
  }

  if (!best) {
    return null;
  }

  return {
    label: `Session ${formatMetric(best.session_id, 0)}`,
    winRate: formatPercent(best.win_rate),
    games: formatMetric(best.games, 0),
    champions: joinTextArray(best.champions)
  };
}

function joinTextArray(value: unknown): string {
  return asArray(value)
    .map((entry) => asText(entry))
    .filter((entry): entry is string => Boolean(entry))
    .join(", ");
}

function insightRowsFromStructured(
  items: Array<Record<string, unknown> | null>,
  titleKeys: string[],
  bodyKeys: string[],
  fallbackTitle: string
): InsightRow[] {
  return items.map((item, index) => ({
    title: pickText(item, titleKeys) ?? `${fallbackTitle} ${index + 1}`,
    body: pickText(item, bodyKeys) ?? "No structured summary provided yet."
  }));
}

function pickText(item: Record<string, unknown> | null, keys: string[]): string | null {
  if (!item) {
    return null;
  }
  for (const key of keys) {
    const value = asText(item[key]);
    if (value) {
      return value;
    }
  }
  return null;
}
