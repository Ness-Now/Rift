# Analytics Package

This package contains deterministic calculations derived from normalized match data.

Design rules:
- keep computations independent from HTTP concerns
- consume clean normalized inputs, not raw Riot payloads
- make outputs testable and stable enough to feed both dashboards and prompts
- persist stable output sections so later prompt/report layers interpret analytics instead of recomputing them
