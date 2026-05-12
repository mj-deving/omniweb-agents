## Summary

- 

## Validation

- 

## Review

- Request a real GitHub review before merge for any non-doc or non-trivial PR.
- For each meaningful new push, request review again on the latest diff and settle all findings before merge.
- The `codex-review` check must pass on the latest head before merge. Explicit Codex `CHANGES_REQUESTED` still blocks merge; when Codex fails to attach any signal at all, the gate now soft-passes instead of blocking bounded PRs indefinitely.
- Do not merge until required checks are green and all review conversations are resolved.
