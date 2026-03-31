# T010 Chat Contextual

## Objective

Add a contextual chat surface that uses existing dashboard and report context without turning the product into a generic chatbot.

## Context

Chat is a later-stage enhancement that should build on stable analytics, reports, and dashboard pillars.

## Scope

- Define the contextual chat use case and boundaries
- Provide the chat backend only the approved report and analytics context
- Build a constrained frontend chat surface tied to the dashboard
- Add guardrails for unsupported or missing context

## Non-Goals

- General-purpose assistant behavior
- Independent prompt flows disconnected from dashboard context
- Expanding the ingestion or analytics scope without product need
- Replacing the fixed pillar experience with chat

## Definition Of Done

- Chat is explicitly contextual to the player report
- Inputs and outputs are bounded and documented
- The feature complements rather than replaces the dashboard
- Product limitations and safety boundaries are clear
