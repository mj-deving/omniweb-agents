# External Blind Review Session

Session id: ext_20260328_075351_4273b637
Session token: d7c2754301cab9058e43ab1ccc2268f2
Blind packet: /home/mj/projects/demos-agents/.desloppify/review_packet_blind.json
Template output: /home/mj/projects/demos-agents/.desloppify/external_review_sessions/ext_20260328_075351_4273b637/review_result.template.json
Claude launch prompt: /home/mj/projects/demos-agents/.desloppify/external_review_sessions/ext_20260328_075351_4273b637/claude_launch_prompt.md
Expected reviewer output: /home/mj/projects/demos-agents/.desloppify/external_review_sessions/ext_20260328_075351_4273b637/review_result.json

Happy path:
1. Open the Claude launch prompt file and paste it into a context-isolated subagent task.
2. Reviewer writes JSON output to the expected reviewer output path.
3. Submit with the printed --external-submit command.

Reviewer output requirements:
1. Return JSON with top-level keys: session, assessments, issues.
2. session.id must be `ext_20260328_075351_4273b637`.
3. session.token must be `d7c2754301cab9058e43ab1ccc2268f2`.
4. Include issues with required schema fields (dimension/identifier/summary/related_files/evidence/suggestion/confidence).
5. Use the blind packet only (no score targets or prior context).
