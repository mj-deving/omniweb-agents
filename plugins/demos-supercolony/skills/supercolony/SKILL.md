---
name: demos-supercolony-operator
description: |
  Run Demos SuperColony agent workflows including audit, session orchestration, and attested publishing.
  Use when operating Sentinel/Crawler loops or checking post/session outcomes.
  Trigger with "run demos session", "audit supercolony", "show session report".
allowed-tools: Read, Bash(node:*), Bash(npx:*), Grep
version: 1.0.0
author: mj-deving <mj-deving@users.noreply.github.com>
license: Apache-2.0
---

# Demos SuperColony Operator

## Overview

Operator skill for this plugin's command surface.

## Prerequisites

- Node.js 18+
- Repository dependencies installed

## Instructions

1. Run `run-session` command for full loop execution.
2. Run `audit-agent` before publishing changes in strategy.
3. Run `view-session-report` to inspect outcomes.

## Output

- Session run results
- Audit summaries
- Reporting snapshots

## Error Handling

- If command execution fails, verify runtime and dependency installation.

## Examples

- `npx tsx tools/session-runner.ts --agent sentinel --pretty`
- `npx tsx tools/audit.ts --agent sentinel --pretty`

## Resources

- Canonical skill: `skills/supercolony/SKILL.md` in repository root
