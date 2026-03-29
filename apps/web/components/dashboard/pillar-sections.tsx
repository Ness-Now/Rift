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

  const nextActionItems = toOrderedItems(
    insightRowsFromStructured(
      nextActions.map((entry) => asRecord(entry)).filter(Boolean),
      ["action", "title", "label"],
      ["why", "summary", "description"],
      "Action"
    ),
    "Action"
  );

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
          action={<StatusChip label="T009 live" tone="positive" />}
          description="Champion Form owns the player's champion identity, recent form pattern, and lane-shape evidence. This pass pushes it toward a true form desk instead of a split dump."
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
              title="Form interpretation"
            />
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-6 sm:p-7" id="macro-lens">
        <SectionHeading
          action={<StatusChip label="T009 live" tone="positive" />}
          description="Macro Lens now foregrounds outcome shape and objective conversion before falling back to supporting splits. The goal is to make macro differences obvious without scanning dense diagnostics."
          title="Macro Lens"
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <DashboardPanel className="border-gold/14 bg-gradient-to-br from-gold/10 via-transparent to-transparent p-6">
              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="space-y-4">
                  <SectionEyebrow tone="gold">Win / loss shape</SectionEyebrow>
                  <h3 className="font-display text-3xl font-semibold tracking-tight text-white">
                    {asText(primaryPriority?.title) ?? "Objective conversion read pending"}
                  </h3>
                  <p className="max-w-2xl text-sm leading-7 text-frost/64">
                    {macroNarrative[0]?.body ?? asText(primaryPriority?.summary) ?? "Macro Lens interprets what winning and losing games look like by pairing objective data with report priorities and weakness signals."}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SignalSpotlight
                      detail={`Enemy dragons in wins ${formatMetric(winsMacro?.avg_enemy_dragons)} | Enemy towers ${formatMetric(winsMacro?.avg_enemy_towers)}`}
                      eyebrow="Wins"
                      title="Team dragons"
                      tone="gold"
                      value={formatMetric(winsMacro?.avg_team_dragons)}
                    />
                    <SignalSpotlight
                      detail={`Team dragons in losses ${formatMetric(lossesMacro?.avg_team_dragons)} | Team towers ${formatMetric(lossesMacro?.avg_team_towers)}`}
                      eyebrow="Losses"
                      title="Enemy dragons"
                      tone="ember"
                      value={formatMetric(lossesMacro?.avg_enemy_dragons)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <MetricRail
                    accent="gold"
                    columns={2}
                    items={[
                      {
                        label: "Win towers",
                        value: formatMetric(winsMacro?.avg_team_towers),
                        detail: `Loss enemy towers ${formatMetric(lossesMacro?.avg_enemy_towers)}`
                      },
                      {
                        label: "Win barons",
                        value: formatMetric(winsMacro?.avg_team_barons),
                        detail: `Loss enemy barons ${formatMetric(lossesMacro?.avg_enemy_barons)}`
                      },
                      {
                        label: "Damage share",
                        value: formatPercent(carryContext?.avg_damage_share),
                        detail: `Kill share ${formatPercent(carryContext?.avg_kill_share)}`
                      },
                      {
                        label: "Gold share",
                        value: formatPercent(carryContext?.avg_gold_share),
                        detail: `Enemy KDA ${formatMetric(carryContext?.avg_enemy_kda)}`
                      }
                    ]}
                  />
                  <SignalSpotlight
                    detail={macroNarrative[1]?.body ?? "Report-backed macro interpretation appears here when the report artifact highlights a second-order macro read."}
                    eyebrow="Supporting read"
                    title={macroNarrative[1]?.title ?? "Secondary macro pressure"}
                    tone="gold"
                    value={formatDurationBucket(asRecord(byDuration[0])?.label)}
                  />
                </div>
              </div>
            </DashboardPanel>

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

          <div className="space-y-6">
            <InsightList
              accent="gold"
              emptyLabel="Macro-oriented report interpretation will appear once report priorities are available."
              items={macroNarrative}
              title="Macro readings"
            />
            <InsightList
              accent="glow"
              emptyLabel="No clear strength signals yet."
              items={strengthItems}
              title="What holds up"
            />
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-6 sm:p-7" id="coaching-board">
        <SectionHeading
          action={<StatusChip label="T009 live" tone="positive" />}
          description="Coaching Board now reads more like an execution surface: decisive lead lever first, then ordered priorities, focus areas, actions, and confidence guardrails."
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
                    detail={primaryRisk ? asText(primaryRisk.summary) ?? "Risk framing from the report artifact." : "Risk flags will populate once the report artifact includes them."}
                    eyebrow="Constraint"
                    title={primaryRisk?.title ? asText(primaryRisk.title) ?? "Primary risk" : "Primary risk"}
                    tone="gold"
                    value={asBoolean(dataQuality?.timeline_metrics_available) ? "Timeline ready" : "Timeline limited"}
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

          <div className="grid gap-6 xl:grid-cols-3">
            <OrderedBoard
              emptyLabel="Priority levers will appear here once report generation completes."
              items={coachingPriorityItems}
              title="Priority stack"
              tone="gold"
            />
            <OrderedBoard
              emptyLabel="Coaching focus areas will appear here once report generation completes."
              items={coachingFocusItems}
              title="Coaching focus"
              tone="glow"
            />
            <OrderedBoard
              emptyLabel="Next actions will appear here once report generation completes."
              items={nextActionItems}
              title="Next actions"
              tone="ember"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <InsightList
              accent="ember"
              emptyLabel="Risk flags will appear here once the report artifact includes them."
              items={riskItems}
              title="Risk flags"
            />

            <DashboardPanel className="p-6">
              <SectionEyebrow tone="steel">Evidence guardrails</SectionEyebrow>
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
