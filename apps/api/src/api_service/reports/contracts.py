from typing import Literal

from pydantic import BaseModel, Field


class ReportSignal(BaseModel):
    key: str
    label: str
    value: str | int | float | bool | None
    evidence: list[str] = Field(default_factory=list)


class PriorityCandidate(BaseModel):
    key: str
    theme: str
    priority: Literal["high", "medium", "low"]
    reason: str
    evidence: list[str] = Field(default_factory=list)


class ReportInputContract(BaseModel):
    report_version: str
    analytics_version: str
    source_snapshot_type: str
    overview_signals: list[ReportSignal] = Field(default_factory=list)
    progression_signals: list[ReportSignal] = Field(default_factory=list)
    split_signals: list[ReportSignal] = Field(default_factory=list)
    carry_context_signals: list[ReportSignal] = Field(default_factory=list)
    macro_signals: list[ReportSignal] = Field(default_factory=list)
    early_mid_signals: list[ReportSignal] = Field(default_factory=list)
    data_quality_flags: list[ReportSignal] = Field(default_factory=list)
    priority_candidates: list[PriorityCandidate] = Field(default_factory=list)


class ReportPoint(BaseModel):
    title: str
    summary: str
    evidence: list[str] = Field(default_factory=list)


class CoachingFocusItem(BaseModel):
    theme: str
    guidance: str
    evidence: list[str] = Field(default_factory=list)


class RiskFlagItem(BaseModel):
    flag: str
    severity: Literal["high", "medium", "low"]
    reason: str


class NextActionItem(BaseModel):
    action: str
    why: str
    timeframe: str


class ExecutiveSummarySection(BaseModel):
    headline: str
    summary: str


class PlayerProfileSection(BaseModel):
    primary_style: str
    supporting_traits: list[str] = Field(default_factory=list)
    champion_focus: str | None = None


class ConfidenceAndLimitsSection(BaseModel):
    confidence_level: Literal["high", "medium", "low"]
    explanation: str
    limitations: list[str] = Field(default_factory=list)


class ReportOutput(BaseModel):
    executive_summary: ExecutiveSummarySection
    player_profile: PlayerProfileSection
    strengths: list[ReportPoint] = Field(default_factory=list)
    weaknesses: list[ReportPoint] = Field(default_factory=list)
    priority_levers: list[ReportPoint] = Field(default_factory=list)
    coaching_focus: list[CoachingFocusItem] = Field(default_factory=list)
    risk_flags: list[RiskFlagItem] = Field(default_factory=list)
    confidence_and_limits: ConfidenceAndLimitsSection
    next_actions: list[NextActionItem] = Field(default_factory=list)
