import unittest
import sys
import types

from pydantic import ValidationError

from api_service.contextual_chat.contracts import ContextualChatGrounding, ContextualChatReply
from api_service.contextual_chat.prompting import load_prompt_asset

analytics_engine_module = types.ModuleType("analytics_engine")
analytics_engine_models_module = types.ModuleType("analytics_engine.models")
for model_name in [
    "AnalyticsSnapshot",
    "CleanEventRecord",
    "CleanMatchRecord",
    "CleanParticipantRecord",
    "CleanTeamRecord",
    "CleanTimelineRecord"
]:
    setattr(analytics_engine_models_module, model_name, type(model_name, (), {}))
analytics_engine_module.models = analytics_engine_models_module
sys.modules.setdefault("analytics_engine", analytics_engine_module)
sys.modules.setdefault("analytics_engine.models", analytics_engine_models_module)

from api_service.contextual_chat.service import ContextualChatService, _derive_evidence_mode


class ContextualChatServiceHelperTests(unittest.TestCase):
    def make_grounding(self, *, context_status: str = "current", latest_completed_analytics_run_id: int | None = None) -> ContextualChatGrounding:
        return ContextualChatGrounding(
            riot_profile_id=7,
            report_run_id=22,
            analytics_run_id=13,
            analytics_version="analytics_v1",
            report_version="report_v1",
            source_snapshot_type="latest_clean_snapshot",
            context_status=context_status,
            latest_completed_analytics_run_id=latest_completed_analytics_run_id,
        )

    def make_reply(self, **overrides: object) -> ContextualChatReply:
        payload = {
            "answer_mode": "grounded",
            "evidence_mode": "interpretive",
            "scope_note": "Bound to the displayed artifact.",
            "trace_labels": ["priority_levers"],
            "answer": "The displayed artifact points to lane setup as the next coaching focus.",
            "action_step": "Review the first three waves before your next queue.",
            "evidence_points": ["Priority levers and coaching focus both emphasize lane setup."],
            "limitation_points": [],
            "suggested_follow_up": "What evidence from the report supports that priority?",
        }
        payload.update(overrides)
        return ContextualChatReply.model_validate(payload)

    def test_derive_evidence_mode_returns_mixed_for_split_trace_labels(self) -> None:
        self.assertEqual(
            _derive_evidence_mode(["report_input.overview", "priority_levers"]),
            "mixed",
        )

    def test_apply_deterministic_limits_forces_stale_grounding_to_limited(self) -> None:
        result = ContextualChatService._apply_deterministic_limits(
            reply=self.make_reply(answer_mode="grounded", trace_labels=["priority_levers"]),
            grounding=self.make_grounding(context_status="stale", latest_completed_analytics_run_id=18),
            latest_user_question="What should I focus on next?",
        )

        self.assertEqual(result.answer_mode, "limited")
        self.assertEqual(result.evidence_mode, "interpretive")
        self.assertIn("newer upstream analytics exist", result.scope_note)
        self.assertTrue(any("newer analytics run #18 exists upstream" in item for item in result.limitation_points))

    def test_apply_deterministic_limits_adds_bounded_comparison_guardrail(self) -> None:
        result = ContextualChatService._apply_deterministic_limits(
            reply=self.make_reply(
                answer_mode="grounded",
                evidence_mode="interpretive",
                trace_labels=["priority_levers"],
                evidence_points=[],
                limitation_points=[],
            ),
            grounding=self.make_grounding(),
            latest_user_question="Is farming better than teamfighting for me right now?",
        )

        self.assertEqual(result.answer_mode, "limited")
        self.assertIn("Comparison remains bounded", result.scope_note)
        self.assertIn("not a proven dominant winner", result.scope_note)
        self.assertTrue(any("bounded comparison" in item for item in result.limitation_points))
        self.assertTrue(any("bounded contrast" in item for item in result.evidence_points))

    def test_contextual_chat_reply_requires_typed_trust_fields(self) -> None:
        with self.assertRaises(ValidationError):
            ContextualChatReply.model_validate(
                {
                    "answer_mode": "grounded",
                    "scope_note": "Bound to the displayed artifact.",
                    "trace_labels": ["not_a_real_trace"],
                    "answer": "Test answer",
                    "action_step": "Test action",
                    "evidence_points": [],
                    "limitation_points": [],
                    "suggested_follow_up": None,
                }
            )

    def test_prompt_asset_keeps_contextual_chat_non_generic_and_artifact_bound(self) -> None:
        prompt = load_prompt_asset().system_prompt

        self.assertIn("You are not a general assistant.", prompt)
        self.assertIn("supplied persisted artifact context", prompt)
        self.assertIn("grounding metadata", prompt)
        self.assertIn("provided conversation history", prompt)


if __name__ == "__main__":
    unittest.main()
