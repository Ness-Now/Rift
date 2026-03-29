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
  ComparisonDeck,
  DashboardPanel,
  DataTable,
  InsightList,
  MetricRail,
  OrderedBoard,
  RankedSignalList,
  SectionEyebrow,
  SectionHeading,
  SignalSpotlight,
  StatusChip,
  SurfaceNavigator,
  WorkflowRail
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

type RankedRow = {
  label: string;
  value: string;
  detail?: string;
  emphasis?: number | null;
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
  const bestDuration = bestMetricRow(byDuration);
  const weakestDuration = worstMetricRow(byDuration);
  const bestSession = bestSessionByWinRate(bySession);
  const strongestMacro = strongestMacroContrast(winsMacro, lossesMacro);
  const mainChampion = asRecord(championDistribution[0]);
  const latestWindow = asRecord(recentWindows[0]);
  const secondWindow = asRecord(recentWindows[1]);
  const primaryPriority = asRecord(priorityLevers[0]);
  const primaryRisk = asRecord(riskFlags[0]);
  const primaryStrength = asRecord(strengths[0]);
  const mainChampionSplit = asRecord(
    byChampion.find((entry) => asText(asRecord(entry)?.label) === asText(mainChampion?.champion_name))
  );
  const mainChampionWinRate = asNumberOrNull(mainChampion?.win_rate);
  const overallWinRate = asNumberOrNull(overview?.win_rate);
  const mainPickEdge = mainChampionWinRate !== null && overallWinRate !== null
    ? mainChampionWinRate - overallWinRate
    : null;

  const championSplitRows = byChampion.slice(0, 5).map((entry) => {
    const row = asRecord(entry);
    return [
      asText(row?.label) ?? "Unknown",
      formatMetric(row?.games, 0),
      formatPercent(row?.win_rate),
      formatMetric(row?.avg_kda),
      formatMetric(row?.avg_dpm)
    ];
  });

  const championPoolRanked = championDistribution.slice(0, 5).map((entry, index) =>
    toRankedRow(asRecord(entry), {
      fallbackLabel: index === 0 ? championFocus : `Pool slot ${index + 1}`,
      value: formatPercent(asRecord(entry)?.share),
      detail: `${formatMetric(asRecord(entry)?.games, 0)} games | ${formatPercent(asRecord(entry)?.win_rate)} win rate`,
      emphasis: percentageFromRatio(asRecord(entry)?.share)
    })
  );

  const progressionRanked = mainChampionProgression.map((entry, index) => {
    const row = asRecord(entry);
    const segment = titleCase(asText(row?.segment) ?? `segment ${index + 1}`);
    return {
      label: segment,
      value: formatPercent(row?.win_rate),
      detail: `${formatMetric(row?.games, 0)} games | KDA ${formatMetric(row?.avg_kda)} | DPM ${formatMetric(row?.avg_dpm)}`,
      emphasis: percentageFromRatio(row?.win_rate)
    };
  });

  const recentFormRanked = recentWindows.slice(0, 4).map((entry, index) => {
    const row = asRecord(entry);
    return {
      label: `Last ${formatMetric(row?.window_size, 0) || index + 1}`,
      value: formatPercent(row?.win_rate),
      detail: `${formatMetric(row?.wins, 0)}W / ${formatMetric(row?.losses, 0)}L | KDA ${formatMetric(row?.avg_kda)} | DPM ${formatMetric(row?.avg_dpm)}`,
      emphasis: percentageFromRatio(row?.win_rate)
    };
  });

  const durationRanked = byDuration.slice(0, 4).map((entry) => {
    const row = asRecord(entry);
    return {
      label: formatDurationBucket(row?.label),
      value: formatPercent(row?.win_rate),
      detail: `${formatMetric(row?.games, 0)} games | KDA ${formatMetric(row?.avg_kda)} | DPM ${formatMetric(row?.avg_dpm)}`,
      emphasis: percentageFromRatio(row?.win_rate)
    };
  });

  const sessionRanked = bySession.slice(0, 4).map((entry) => {
    const row = asRecord(entry);
    return {
      label: `Session ${formatMetric(row?.session_id, 0)}`,
      value: formatPercent(row?.win_rate),
      detail: `${formatMetric(row?.games, 0)} games | ${joinTextArray(row?.champions) || "Champion mix pending"}`,
      emphasis: percentageFromRatio(row?.win_rate)
    };
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

  const macroCommandItems = [
    {
      title: strongestMacro ? `${strongestMacro.label} sets the clearest macro swing` : "Primary macro swing pending",
      body: strongestMacro
        ? `Wins average ${formatMetric(strongestMacro.winValue)} while losses allow ${formatMetric(strongestMacro.lossValue)}. This is the clearest deterministic split in the current macro snapshot.`
        : "The command table will sharpen once both win and loss macro buckets are populated.",
      meta: strongestMacro ? formatSignedMetric(strongestMacro.delta) : "N/A"
    },
    {
      title: bestDuration ? `${bestDuration.label} reinforces the winning shape` : "Winning duration pending",
      body: bestDuration
        ? `${bestDuration.winRate} across ${bestDuration.games}. ${weakestDuration ? `The weakest duration window is ${weakestDuration.label} at ${weakestDuration.winRate}.` : "A weaker duration window will appear once enough matches accumulate."}`
        : "Duration reinforcement will appear once enough clean matches are available.",
      meta: bestDuration?.winRate ?? "N/A"
    },
    {
      title: bestSession ? `${bestSession.label} supports the macro read` : "Session reinforcement pending",
      body: bestSession
        ? `${bestSession.winRate} across ${bestSession.games}. ${bestSession.champions || "Champion mix pending."}`
        : "Session reinforcement appears once timestamped session data is available in the current clean snapshot.",
      meta: bestSession?.winRate ?? "N/A"
    }
  ];

  const coachingPriorityItems = toOrderedItems(
    insightRowsFromStructured(
      priorityLevers.map((entry) => asRecord(entry)).filter(Boolean),
      ["title", "theme", "label"],
      ["summary", "reason", "description"],
      "Priority"
    ),
    "Priority"
  );

  const coachingFocusItems = toOrderedItems(
    insightRowsFromStructured(
      coachingFocus.map((entry) => asRecord(entry)).filter(Boolean),
      ["title", "focus", "theme", "label", "action"],
      ["summary", "why", "description", "details"],
      "Focus"
    ),
    "Focus"
  );
  const coachingFocusRows = coachingFocusItems.map((item) => ({
    title: item.title,
    body: item.body
  }));

  const nextActionItems = toOrderedItems(
    insightRowsFromStructured(
      nextActions.map((entry) => asRecord(entry)).filter(Boolean),
      ["action", "title", "label"],
      ["why", "summary", "description"],
      "Action"
    ),
    "Action"
  );
  const immediateAction = nextActionItems[0] ?? null;

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

  const deepDiveRouteItems = [
    {
      label: "Station 01",
      title: "Champion Form",
      href: "#champion-form",
      detail: championFocus !== "Champion focus pending"
        ? `${championFocus} anchors the form read, progression, and lane-checkpoint context.`
        : "Champion identity, form windows, and lane-shape evidence.",
      tone: "glow" as const
    },
    {
      label: "Station 02",
      title: "Macro Lens",
      href: "#macro-lens",
      detail: strongestMacro
        ? `${strongestMacro.label} is the clearest macro swing in the current snapshot.`
        : "Objective conversion, loss shape, and team-context contrast.",
      tone: "gold" as const
    },
    {
      label: "Station 03",
      title: "Coaching Board",
      href: "#coaching-board",
      detail: asText(primaryPriority?.title)
        ?? "Execution priorities, next moves, and evidence guardrails.",
      tone: "ember" as const
    }
  ];

  const deepDiveWorkflowItems = [
    {
      step: "Step 01",
      title: "Evidence station",
      detail: "Champion Form is the first deep read: stable performance evidence, form patterning, and lane-shape context.",
      href: "#champion-form",
      tone: "glow" as const
    },
    {
      step: "Step 02",
      title: "Interpretation station",
      detail: "Macro Lens shows how those outcomes take shape across objectives, duration, and match context.",
      href: "#macro-lens",
      tone: "gold" as const
    },
    {
      step: "Step 03",
      title: "Execution station",
      detail: "Coaching Board turns the interpreted signal into a sequence of next moves with confidence and limits attached.",
      href: "#coaching-board",
      tone: "ember" as const
    }
  ];

  return (
    <div className="space-y-8">
      <SurfaceNavigator items={deepDiveRouteItems} title="Deep-dive stations" />
      <WorkflowRail items={deepDiveWorkflowItems} title="How to move through the deep read" />

      <DashboardPanel className="p-6 sm:p-7" id="champion-form">
        <SectionHeading
          action={
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip label="Station 01" tone="neutral" />
              <StatusChip label="T009 live" tone="positive" />
            </div>
          }
          description="Evidence station. Champion Form is where the player identity, recent form pattern, and lane-shape reads become concrete before wider interpretation."
          title="Champion Form"
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <DashboardPanel className="border-glow/16 bg-gradient-to-br from-glow/12 via-transparent to-transparent p-6">
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-5">
                  <SectionEyebrow tone="accent">Form centerpiece</SectionEyebrow>
                  <div>
                    <h3 className="font-display text-4xl font-semibold tracking-tight text-white">{championFocus}</h3>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-frost/64">
                      {championNarrative[0]?.body ?? `${selectedProfile?.riot_id_display ?? "This profile"} is currently best understood through champion repetition, recent form windows, and lane-shape context from the latest clean snapshot.`}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <SignalSpotlight
                      detail={`${formatMetric(mainChampion?.games, 0)} games tracked | ${formatPercent(mainChampion?.win_rate)} win rate`}
                      eyebrow="Main pick"
                      title={asText(mainChampion?.champion_name) ?? championFocus}
                      tone="glow"
                      value={formatPercent(mainChampion?.share)}
                    />
                    <SignalSpotlight
                      detail={`${formatMetric(latestWindow?.wins, 0)}W / ${formatMetric(latestWindow?.losses, 0)}L | DPM ${formatMetric(latestWindow?.avg_dpm)}`}
                      eyebrow="Recent form"
                      title={`Last ${formatMetric(latestWindow?.window_size, 0)}`}
                      tone="gold"
                      value={formatPercent(latestWindow?.win_rate)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <SignalSpotlight
                    detail={primaryStrength ? asText(primaryStrength.summary) ?? "Primary strength signal from the report artifact." : "Strength read will sharpen as more report artifacts accumulate."}
                    eyebrow="Style read"
                    title={asText(playerProfile?.primary_style) ?? "Structured profile pending"}
                    tone="glow"
                    value={bestHour ? formatHourLabel(bestHour.label) : "No hour split"}
                  />
                  <SignalSpotlight
                    detail={mainPickEdge !== null ? `${formatSignedPercent(mainPickEdge)} vs overall win rate` : "Main-pick edge appears once both champion and overall win-rate baselines are available."}
                    eyebrow="Main-pick edge"
                    title={asText(mainChampion?.champion_name) ?? championFocus}
                    tone="gold"
                    value={mainPickEdge !== null ? formatSignedPercent(mainPickEdge) : "N/A"}
                  />
                  <MetricRail
                    accent="glow"
                    columns={2}
                    items={[
                      {
                        label: "Best weekday",
                        value: bestWeekday?.label ?? "Pending",
                        detail: bestWeekday ? `${bestWeekday.winRate} across ${bestWeekday.games} games` : "No weekday split available"
                      },
                      {
                        label: "Longest session",
                        value: longestSession ? `${longestSession.games} games` : "Pending",
                        detail: longestSession ? `${longestSession.winRate} | ${longestSession.champions}` : "Session data unavailable"
                      },
                      {
                        label: "10m gold diff",
                        value: formatSignedMetric(checkpoint10?.avg_role_opp_gold_diff),
                        detail: `XP ${formatSignedMetric(checkpoint10?.avg_role_opp_xp_diff)} | CS ${formatSignedMetric(checkpoint10?.avg_role_opp_cs_diff)}`
                      },
                      {
                        label: "15m gold diff",
                        value: formatSignedMetric(checkpoint15?.avg_role_opp_gold_diff),
                        detail: `XP ${formatSignedMetric(checkpoint15?.avg_role_opp_xp_diff)} | CS ${formatSignedMetric(checkpoint15?.avg_role_opp_cs_diff)}`
                      }
                    ]}
                  />
                </div>
              </div>
            </DashboardPanel>

            <ComparisonDeck
              cards={[
                {
                  label: "Main pick",
                  headline: asText(mainChampion?.champion_name) ?? championFocus,
                  value: formatPercent(mainChampion?.win_rate),
                  metrics: [
                    { label: "Games", value: formatMetric(mainChampion?.games, 0) },
                    { label: "Share", value: formatPercent(mainChampion?.share) },
                    { label: "KDA", value: formatMetric(mainChampionSplit?.avg_kda) },
                    { label: "DPM", value: formatMetric(mainChampionSplit?.avg_dpm) }
                  ]
                },
                {
                  label: "Overall baseline",
                  headline: selectedProfile?.riot_id_display ?? "Profile baseline",
                  value: formatPercent(overview?.win_rate),
                  metrics: [
                    { label: "Games", value: formatMetric(overview?.total_games, 0) },
                    { label: "Avg KDA", value: formatMetric(overview?.avg_kda) },
                    { label: "Avg DPM", value: formatMetric(overview?.avg_dpm) },
                    { label: "Avg CS/min", value: formatMetric(overview?.avg_cs_per_min) }
                  ]
                },
                {
                  label: "Latest window",
                  headline: `Last ${formatMetric(latestWindow?.window_size, 0)}`,
                  value: formatPercent(latestWindow?.win_rate),
                  metrics: [
                    { label: "Record", value: `${formatMetric(latestWindow?.wins, 0)}W / ${formatMetric(latestWindow?.losses, 0)}L` },
                    { label: "KDA", value: formatMetric(latestWindow?.avg_kda) },
                    { label: "DPM", value: formatMetric(latestWindow?.avg_dpm) },
                    { label: "CS/min", value: formatMetric(latestWindow?.avg_cs_per_min) }
                  ]
                }
              ]}
              title="Main-pick comparison"
              tone="glow"
            />

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <RankedSignalList
                emptyLabel="Champion-pool distribution will appear once matches are present in the clean snapshot."
                items={championPoolRanked}
                title="Champion pool pressure"
                tone="glow"
              />
              <RankedSignalList
                emptyLabel="Recent form windows will appear once enough clean matches are available."
                items={recentFormRanked}
                title="Recent form windows"
                tone="gold"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <RankedSignalList
                emptyLabel="Main-champion progression will appear here once enough champion repetitions exist."
                items={progressionRanked}
                title="Main-pick progression"
                tone="glow"
              />
              <DashboardPanel className="p-6">
                <SectionEyebrow tone="steel">Lane checkpoint context</SectionEyebrow>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <SignalSpotlight
                    detail={`First assist ${formatSecondsToClock(firstActionTimes?.avg_first_assist_time_seconds)}`}
                    eyebrow="Tempo"
                    title="First kill"
                    tone="gold"
                    value={formatSecondsToClock(firstActionTimes?.avg_first_kill_time_seconds)}
                  />
                  <SignalSpotlight
                    detail={`Gold ${formatSignedMetric(finalRoleDiffs?.avg_gold_diff)} | CS ${formatSignedMetric(finalRoleDiffs?.avg_cs_diff)}`}
                    eyebrow="Role-opponent"
                    title="Final damage diff"
                    tone="ember"
                    value={formatSignedMetric(finalRoleDiffs?.avg_damage_to_champions_diff)}
                  />
                </div>
                <div className="dashboard-line my-5" />
                <p className="text-sm leading-7 text-frost/60">
                  {championNarrative[1]?.body ?? "These checkpoint reads stay intentionally conservative: they use the current clean snapshot and highlight only stable early and role-opponent signals."}
                </p>
              </DashboardPanel>
            </div>

            <DataTable
              columns={["Champion", "Games", "Win rate", "KDA", "DPM"]}
              rows={championSplitRows}
              title="Champion split board"
            />
          </div>

          <div className="space-y-6">
            <InsightList
              accent="glow"
              emptyLabel="Champion-form commentary will appear after the first report artifact."
              items={championNarrative.slice(0, 3)}
              title="Interpretation overlay"
            />
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-6 sm:p-7" id="macro-lens">
        <SectionHeading
          action={
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip label="Station 02" tone="neutral" />
              <StatusChip label="T009 live" tone="positive" />
            </div>
          }
          description="Interpretation station. Macro Lens turns deterministic match outcomes into a clearer read of how wins, losses, and objective patterns actually take shape."
          title="Macro Lens"
        />

        <div className="mt-6 space-y-6">
          <DashboardPanel className="border-gold/14 bg-gradient-to-br from-gold/10 via-transparent to-transparent p-6">
            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-4">
                <SectionEyebrow tone="gold">Outcome shape</SectionEyebrow>
                <h3 className="font-display text-3xl font-semibold tracking-tight text-white">
                  {macroNarrative[0]?.title ?? asText(primaryPriority?.title) ?? "Objective conversion read pending"}
                </h3>
                <p className="max-w-2xl text-sm leading-7 text-frost/64">
                  {macroNarrative[0]?.body ?? asText(primaryPriority?.summary) ?? "Macro Lens interprets what winning and losing games look like by pairing objective data with report priorities and weakness signals."}
                </p>
                <ComparisonDeck
                  cards={[
                    {
                      label: "Wins",
                      headline: `Team ${strongestMacro?.label.toLowerCase() ?? "objective control"}`,
                      value: formatMetric(strongestMacro?.winValue ?? winsMacro?.avg_team_dragons),
                      metrics: [
                        { label: "Dragons", value: formatMetric(winsMacro?.avg_team_dragons) },
                        { label: "Heralds", value: formatMetric(winsMacro?.avg_team_heralds) },
                        { label: "Barons", value: formatMetric(winsMacro?.avg_team_barons) },
                        { label: "Towers", value: formatMetric(winsMacro?.avg_team_towers) }
                      ]
                    },
                    {
                      label: "Losses",
                      headline: `Enemy ${strongestMacro?.label.toLowerCase() ?? "objective pressure"}`,
                      value: formatMetric(strongestMacro?.lossValue ?? lossesMacro?.avg_enemy_dragons),
                      metrics: [
                        { label: "Enemy dragons", value: formatMetric(lossesMacro?.avg_enemy_dragons) },
                        { label: "Enemy heralds", value: formatMetric(lossesMacro?.avg_enemy_heralds) },
                        { label: "Enemy barons", value: formatMetric(lossesMacro?.avg_enemy_barons) },
                        { label: "Enemy towers", value: formatMetric(lossesMacro?.avg_enemy_towers) }
                      ]
                    },
                    {
                      label: "Strongest swing",
                      headline: strongestMacro?.label ?? "Objective delta",
                      value: strongestMacro ? formatSignedMetric(strongestMacro.delta) : "N/A",
                      metrics: [
                        { label: "Win-side", value: formatMetric(strongestMacro?.winValue) },
                        { label: "Loss-side", value: formatMetric(strongestMacro?.lossValue) },
                        { label: "Best duration", value: bestDuration ? `${bestDuration.label} ${bestDuration.winRate}` : "Pending" },
                        { label: "Best session", value: bestSession?.winRate ?? "Pending" }
                      ]
                    }
                  ]}
                  title="Win vs loss objective board"
                  tone="gold"
                />
              </div>

              <div className="space-y-4">
                <SignalSpotlight
                  detail={strongestMacro ? `Wins average ${formatMetric(strongestMacro.winValue)} while losses allow ${formatMetric(strongestMacro.lossValue)}.` : "Objective swing will appear once both win and loss macro buckets are populated."}
                  eyebrow="Primary contrast"
                  title={strongestMacro?.label ?? "Objective contrast pending"}
                  tone="gold"
                  value={strongestMacro ? formatSignedMetric(strongestMacro.delta) : "N/A"}
                />
                <OrderedBoard
                  emptyLabel="Command-table reads will appear once enough macro evidence is available."
                  items={macroCommandItems}
                  title="Command table"
                  tone="gold"
                />
              </div>
            </div>
          </DashboardPanel>

          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <DashboardPanel className="p-6">
              <SectionEyebrow tone="steel">Pattern reinforcement</SectionEyebrow>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <SignalSpotlight
                  detail={bestDuration ? `${bestDuration.games} games tracked` : "Duration reinforcement will appear once enough matches are present."}
                  eyebrow="Best duration"
                  title={bestDuration?.label ?? "Pending"}
                  tone="glow"
                  value={bestDuration?.winRate ?? "N/A"}
                />
                <SignalSpotlight
                  detail={weakestDuration ? `${weakestDuration.games} games tracked` : "Weakest duration will appear once enough matches are present."}
                  eyebrow="Weakest duration"
                  title={weakestDuration?.label ?? "Pending"}
                  tone="ember"
                  value={weakestDuration?.winRate ?? "N/A"}
                />
                <SignalSpotlight
                  detail={bestSession ? `${bestSession.games} games | ${bestSession.champions}` : "Session reinforcement appears once timestamped session data is available."}
                  eyebrow="Session reinforcement"
                  title={bestSession?.label ?? "Pending"}
                  tone="gold"
                  value={bestSession?.winRate ?? "N/A"}
                />
              </div>
              <div className="dashboard-line my-5" />
              <MetricRail
                accent="gold"
                columns={2}
                items={[
                  {
                    label: "Damage share",
                    value: formatPercent(carryContext?.avg_damage_share),
                    detail: `Kill share ${formatPercent(carryContext?.avg_kill_share)}`
                  },
                  {
                    label: "Gold share",
                    value: formatPercent(carryContext?.avg_gold_share),
                    detail: `Enemy KDA ${formatMetric(carryContext?.avg_enemy_kda)}`
                  },
                  {
                    label: "Win towers",
                    value: formatMetric(winsMacro?.avg_team_towers),
                    detail: `Loss enemy towers ${formatMetric(lossesMacro?.avg_enemy_towers)}`
                  },
                  {
                    label: "Win barons",
                    value: formatMetric(winsMacro?.avg_team_barons),
                    detail: `Loss enemy barons ${formatMetric(lossesMacro?.avg_enemy_barons)}`
                  }
                ]}
              />
            </DashboardPanel>

            <div className="space-y-6">
              <InsightList
                accent="gold"
                emptyLabel="Macro-oriented report interpretation will appear once report priorities are available."
                items={macroNarrative}
                title="Report overlay"
              />
              <InsightList
                accent="glow"
                emptyLabel="No clear strength signals yet."
                items={strengthItems}
                title="What holds up"
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <RankedSignalList
              emptyLabel="Game-shape splits will appear once enough matches are present in the clean snapshot."
              items={durationRanked}
              title="Game-shape pressure"
              tone="gold"
            />
            <RankedSignalList
              emptyLabel="Session signals will appear once match timestamps are available."
              items={sessionRanked}
              title="Session patterning"
              tone="glow"
            />
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-6 sm:p-7" id="coaching-board">
        <SectionHeading
          action={
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip label="Station 03" tone="neutral" />
              <StatusChip label="T009 live" tone="positive" />
            </div>
          }
          description="Execution station. Coaching Board closes the loop by separating the next move, ordered priority, and the confidence limits that should shape how hard to push the advice."
          title="Coaching Board"
        />

        <div className="mt-6 space-y-6">
          <DashboardPanel className="border-ember/14 bg-gradient-to-br from-ember/10 via-transparent to-transparent p-6">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <SectionEyebrow tone="accent">Lead directive</SectionEyebrow>
                <h3 className="font-display text-3xl font-semibold tracking-tight text-white">
                  {asText(primaryPriority?.title) ?? "Awaiting prioritized coaching lever"}
                </h3>
                <p className="max-w-2xl text-sm leading-7 text-frost/64">
                  {asText(primaryPriority?.summary) ?? "The coaching board will elevate the highest-value report lever here once report generation completes for the selected profile."}
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <SignalSpotlight
                    detail={asText(confidence?.explanation) ?? "Confidence will populate from the structured report artifact."}
                    eyebrow="Confidence"
                    title={asText(confidence?.confidence_level) ?? "Pending"}
                    tone="ember"
                    value={formatMetric(dataQuality?.matches_analyzed, 0)}
                  />
                  <SignalSpotlight
                    detail={immediateAction?.body ?? "The top next action will appear once report generation completes for the selected profile."}
                    eyebrow="Immediate move"
                    title={immediateAction?.title ?? "Awaiting action"}
                    tone="gold"
                    value={immediateAction ? "Do now" : "Pending"}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <MetricRail
                  accent="ember"
                  columns={2}
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
                      label: "Timeline evidence",
                      value: asBoolean(dataQuality?.timeline_metrics_available) ? "Ready" : "Limited",
                      detail: asBoolean(dataQuality?.event_metrics_available) ? "Event evidence ready" : "Event evidence limited"
                    },
                    {
                      label: "Recent form",
                      value: formatPercent(latestWindow?.win_rate),
                      detail: secondWindow ? `Last ${formatMetric(secondWindow.window_size, 0)} ${formatPercent(secondWindow.win_rate)}` : "Additional window pending"
                    }
                  ]}
                />
              </div>
            </div>
          </DashboardPanel>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <OrderedBoard
              emptyLabel="Priority levers will appear here once report generation completes."
              items={coachingPriorityItems}
              title="Priority stack"
              tone="gold"
              leadEmphasis
              badgeLabel="Priority order"
            />
            <OrderedBoard
              emptyLabel="Next actions will appear here once report generation completes."
              items={nextActionItems}
              title="Next actions"
              tone="ember"
              leadEmphasis
              badgeLabel="Action order"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-6">
              <InsightList
                accent="glow"
                emptyLabel="Coaching focus areas will appear here once report generation completes."
                items={coachingFocusRows}
                title="Interpretation overlay"
              />
              <InsightList
                accent="ember"
                emptyLabel="Risk flags will appear here once the report artifact includes them."
                items={riskItems}
                title="Risk flags"
              />
            </div>
            <DashboardPanel className="p-6">
              <SectionEyebrow tone="steel">Evidence and limits</SectionEyebrow>
              <div className="mt-5 flex flex-wrap gap-3">
                <StatusChip
                  label={asBoolean(dataQuality?.timeline_metrics_available) ? "Timeline evidence" : "Timeline limited"}
                  tone={asBoolean(dataQuality?.timeline_metrics_available) ? "positive" : "warning"}
                />
                <StatusChip
                  label={asBoolean(dataQuality?.event_metrics_available) ? "Event evidence" : "Event limited"}
                  tone={asBoolean(dataQuality?.event_metrics_available) ? "positive" : "warning"}
                />
                <StatusChip
                  label={asBoolean(dataQuality?.tracked_duo_available) ? "Tracked duo ready" : "No duo data"}
                  tone={asBoolean(dataQuality?.tracked_duo_available) ? "positive" : "warning"}
                />
              </div>
              <div className="dashboard-line my-5" />
              <MetricRail
                accent="ember"
                columns={2}
                items={[
                  {
                    label: "Confidence",
                    value: asText(confidence?.confidence_level) ?? "Pending",
                    detail: asText(confidence?.explanation) ?? "Confidence explanation will populate from the report artifact."
                  },
                  {
                    label: "Primary risk",
                    value: primaryRisk?.title ? asText(primaryRisk.title) ?? "Primary risk" : "Pending",
                    detail: primaryRisk ? asText(primaryRisk.summary) ?? "Risk framing from the report artifact." : "Risk flags will populate once the report artifact includes them."
                  },
                  {
                    label: "Matches analyzed",
                    value: formatMetric(dataQuality?.matches_analyzed, 0),
                    detail: selectedProfile?.riot_id_display ?? "No profile selected"
                  },
                  {
                    label: "Recent form",
                    value: formatPercent(latestWindow?.win_rate),
                    detail: secondWindow ? `Last ${formatMetric(secondWindow.window_size, 0)} ${formatPercent(secondWindow.win_rate)}` : "Additional window pending"
                  }
                ]}
              />
              <div className="dashboard-line my-5" />
              <div className="grid gap-4 md:grid-cols-2">
                <SignalSpotlight
                  detail={joinTextArray(dataQuality?.limitations) || "No data-quality limitations were reported for this snapshot."}
                  eyebrow="Guardrail note"
                  title="Data limits"
                  tone="gold"
                  value={asBoolean(dataQuality?.timeline_metrics_available) ? "Supported" : "Partial"}
                />
                <SignalSpotlight
                  detail={latestWindow ? `${formatMetric(latestWindow?.wins, 0)}W / ${formatMetric(latestWindow?.losses, 0)}L | KDA ${formatMetric(latestWindow?.avg_kda)}` : "Recent form will appear once enough matches exist in the clean snapshot."}
                  eyebrow="Recent context"
                  title={`Last ${formatMetric(latestWindow?.window_size, 0)}`}
                  tone="ember"
                  value={formatPercent(latestWindow?.win_rate)}
                />
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

function worstMetricRow(entries: unknown[]): { label: string; winRate: string; games: string } | null {
  let worst: Record<string, unknown> | null = null;
  let worstValue = Number.POSITIVE_INFINITY;

  for (const entry of entries) {
    const row = asRecord(entry);
    if (!row || typeof row.win_rate !== "number") {
      continue;
    }
    if (row.win_rate < worstValue) {
      worstValue = row.win_rate;
      worst = row;
    }
  }

  if (!worst) {
    return null;
  }

  return {
    label: asText(worst.label) ?? "N/A",
    winRate: formatPercent(worst.win_rate),
    games: formatMetric(worst.games, 0)
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

function bestSessionByWinRate(entries: unknown[]): MetricRow | null {
  let best: Record<string, unknown> | null = null;
  let bestWinRate = -1;

  for (const entry of entries) {
    const row = asRecord(entry);
    if (!row || typeof row.win_rate !== "number") {
      continue;
    }
    if (row.win_rate > bestWinRate) {
      bestWinRate = row.win_rate;
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

function strongestMacroContrast(
  winsMacro: Record<string, unknown> | null,
  lossesMacro: Record<string, unknown> | null
): { label: string; winValue: number; lossValue: number; delta: number } | null {
  const candidates = [
    {
      label: "Dragons",
      winValue: asNumberOrNull(winsMacro?.avg_team_dragons),
      lossValue: asNumberOrNull(lossesMacro?.avg_enemy_dragons)
    },
    {
      label: "Heralds",
      winValue: asNumberOrNull(winsMacro?.avg_team_heralds),
      lossValue: asNumberOrNull(lossesMacro?.avg_enemy_heralds)
    },
    {
      label: "Barons",
      winValue: asNumberOrNull(winsMacro?.avg_team_barons),
      lossValue: asNumberOrNull(lossesMacro?.avg_enemy_barons)
    },
    {
      label: "Towers",
      winValue: asNumberOrNull(winsMacro?.avg_team_towers),
      lossValue: asNumberOrNull(lossesMacro?.avg_enemy_towers)
    }
  ];

  let strongest: { label: string; winValue: number; lossValue: number; delta: number } | null = null;

  for (const candidate of candidates) {
    if (candidate.winValue === null || candidate.lossValue === null) {
      continue;
    }
    const delta = candidate.winValue - candidate.lossValue;
    if (!strongest || Math.abs(delta) > Math.abs(strongest.delta)) {
      strongest = {
        label: candidate.label,
        winValue: candidate.winValue,
        lossValue: candidate.lossValue,
        delta
      };
    }
  }

  return strongest;
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

function percentageFromRatio(value: unknown): number | null {
  if (typeof value !== "number") {
    return null;
  }
  return value * 100;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function formatSignedPercent(value: number): string {
  const percentage = value * 100;
  const formatted = `${percentage.toFixed(1)}%`;
  return percentage > 0 ? `+${formatted}` : formatted;
}

function toRankedRow(
  row: Record<string, unknown> | null,
  options: {
    fallbackLabel: string;
    value: string;
    detail?: string;
    emphasis?: number | null;
  }
): RankedRow {
  return {
    label: asText(row?.champion_name) ?? asText(row?.label) ?? options.fallbackLabel,
    value: options.value,
    detail: options.detail,
    emphasis: options.emphasis ?? null
  };
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function toOrderedItems(items: InsightRow[], metaLabel: string) {
  return items.map((item) => ({
    title: item.title,
    body: item.body,
    meta: metaLabel
  }));
}
