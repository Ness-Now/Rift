# Product Spec

## Product Summary

Rift is a secure analytics and coaching platform for League of Legends players. A user provides a Riot ID, the backend fetches ranked Solo/Duo match data from Riot, the system normalizes the data into clean tables, computes deterministic analytics, and then generates structured AI commentary for a React dashboard.

## Problem

Players can access raw match history, but they usually do not get a dependable layer that separates factual performance analysis from generic advice. We want a product that can explain recent ranked play using audited calculations first and AI narrative second.

## Primary User

A League of Legends player who wants a clear, trustworthy view of ranked Solo/Duo performance trends and coaching signals.

## Account, Profile, Ingestion, Normalization, Analytics, And Report Foundation

The MVP now includes a simple email/password account shell, user-owned Riot profiles, raw ranked match ingestion, clean normalization runs, deterministic analytics runs, and structured report generation. The backend is the source of truth for user identity, that identity owns Riot profiles, ingestion starts from an explicit owned Riot profile, normalization operates only on persisted raw payloads, analytics operates only on the latest clean snapshot, and reporting interprets persisted analytics summaries rather than recomputing them.

This step intentionally does not include:
- social auth
- magic links
- password reset
- advanced authorization rules

## Intended Product Shape

1. User creates an account and signs in.
2. User adds one or more Riot profiles by submitting Riot ID plus region.
3. Backend resolves Riot ID to PUUID and stores the owned Riot profile.
4. User selects an owned Riot profile and triggers ranked Solo/Duo ingestion.
5. Backend fetches recent queue-420 match ids, match details, and timelines.
6. Raw payloads are preserved separately from normalized tables.
7. User triggers normalization for an owned Riot profile.
8. Backend deduplicates raw matches by `match_id`, chooses a deterministic canonical raw source, and writes clean relational tables.
9. User triggers deterministic analytics for an owned Riot profile.
10. Backend computes stable overview, progression, split, carry/context, macro, early/mid, and data-quality sections from clean tables.
11. User triggers report generation for an owned Riot profile and a completed analytics run.
12. Backend builds a narrower report-input contract from the persisted analytics summary and generates a structured coaching report.
13. The frontend eventually renders dashboard pillars and report surfaces from persisted analytics and report artifacts.

## In Scope For The Product

- Email/password account ownership foundation
- User-owned Riot profile creation and management
- Ranked Solo/Duo raw ingestion runs
- Raw payload retention
- Normalization runs and clean tables derived from persisted raw payloads
- Deterministic analytics runs and persisted analytics summaries
- Structured report generation from persisted analytics summaries
- Versioned prompts and controlled AI commentary
- React dashboard presentation

## Out Of Scope For This Step

- OpenAI integration
- Password reset
- Full RBAC or team permissions
- Full dashboard feature set
- Queue or Redis implementation

## Product Principles

- Deterministic analytics come before AI interpretation.
- Raw vendor payloads must remain conceptually separate from clean internal tables.
- Clean tables must be reproducible from persisted raw payloads.
- Prompt assets must be versioned outside application logic.
- User ownership must exist before player-linked data and generated artifacts are introduced.
- Riot profiles must be globally unique by PUUID and owned by exactly one user.
- Raw match and timeline payloads must be persisted before clean normalization.
- Analytics should depend on clean tables, not directly on raw Riot JSON.
- Analytics summaries should be persisted in a structured form before prompt-based interpretation.
- Report generation should consume persisted analytics outputs and use the model only for interpretation, prioritization, explanation, and coaching advice.
- The first iterations should favor clarity and auditability over breadth.
