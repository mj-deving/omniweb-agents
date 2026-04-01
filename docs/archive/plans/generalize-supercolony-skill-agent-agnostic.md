# Plan: Generalize SuperColony Skill — Agent-Agnostic

## Context

The DEMOS/SuperColony skill currently hardcodes "isidore" throughout — agent name, persona path, wallet path, working directory. Any agent should be able to use the same skill by swapping a config file. Isidore remains the default; behavior is identical post-change.

## Approach: Config File in Skill Directory

**New file:** `~/.claude/skills/DEMOS/SuperColony/agent-config.json`

```json
{
  "activeAgent": "isidore",
  "agents": {
    "isidore": {
      "name": "isidore",
      "persona": "Personas/isidore.md",
      "envPath": "~/projects/DEMOS-Work/.env",
      "workDir": "~/projects/DEMOS-Work",
      "publishScript": "src/isidore-publish.ts",
      "testHarness": "src/isidore-full-test.ts",
      "description": "Observing SuperColony ecosystem mechanics and agent interactions",
      "specialties": ["observation", "analysis"]
    }
  }
}
```

**Move persona:** `IsidorePersona.md` → `Personas/isidore.md` (content unchanged)

## Changes (8 files)

### 1. `Tools/SuperColony.ts` (3 changes)
- **ENV_PATH:** Replace hardcoded `projects/DEMOS-Work/.env` with config-driven resolution + `--env-path` flag override + fallback to original path
- **cmdRegister defaults:** Read name/description/specialties from config instead of hardcoding "isidore"
- **Error message (line 89):** "Run register-isidore.ts" → "Set up agent wallet (see agent-config.json)"
- Add `import.meta.url` → `__dirname` derivation for config path resolution

### 2. `SuperColony/SKILL.md` (description, Quick Reference, Core Paths, examples)
- Replace "isidore" references with "active/configured agent"
- Add "Agent Configuration" section explaining config file
- Core Paths table: persona, wallet, publish CLI → "per agent-config.json"
- Keep "isidore" in USE WHEN triggers (it's a valid trigger word)

### 3. `DEMOS/SKILL.md` (parent router)
- Description line: "via the isidore agent" → "Active agent defined in agent-config.json"
- Example: "Read IsidorePersona.md" → "Read persona file per config"

### 4. `Workflows/Publish.md`
- "Isidore persona" → "agent persona (from config)"
- "Read IsidorePersona.md" → "Read active agent's persona file"
- "Isidore's voice" → "agent's voice"
- Add note: working directory and publish script from agent-config.json

### 5. `Workflows/Engage.md`
- "Isidore's voice (use IsidorePersona.md)" → "active agent's voice (read persona from config)"

### 6. `Workflows/Manage.md`
- "Register isidore" → "Register the active agent"
- `--name "isidore"` → `--name "{from config}"`

### 7. `Workflows/Attest.md`
- `isidore-publish.ts` → "agent's publish script (from config)"

### 8. `OperationalPlaybook.md`
- "building and running the isidore agent" → "building and running SuperColony agents"
- Move isidore-specific stats to persona file
- Add note that script inventory is isidore-workspace-specific

## Not Changed
- Scripts in `~/projects/DEMOS-Work/src/` — these are isidore's workspace, not the generic skill
- `~/projects/DEMOS-Work/CLAUDE.md` — project-specific
- "isidore" stays in USE WHEN triggers (it IS a valid agent name trigger)

## Backward Compatibility
- SuperColony.ts falls back to `~/projects/DEMOS-Work/.env` if config missing
- `--env-path` flag overrides everything
- Auth cache already works multi-agent (keyed by address)
- All existing bash commands still work as-is

## Execution Order
1. Create `agent-config.json` (new file, no deps)
2. Create `Personas/` dir + move `IsidorePersona.md`
3. Update `SuperColony.ts` (config reading + fallback)
4. Update `SuperColony/SKILL.md`
5. Update all 5 workflow files
6. Update `DEMOS/SKILL.md` (parent)
7. Update `OperationalPlaybook.md`
8. Verify: run `npx tsx Tools/SuperColony.ts balance --pretty` to confirm config reads correctly

## Verification
- `npx tsx Tools/SuperColony.ts balance --pretty` — still reads correct wallet
- `npx tsx Tools/SuperColony.ts register --pretty` — defaults to isidore from config
- Persona file exists at new path `Personas/isidore.md`
- Old path `IsidorePersona.md` no longer exists
- Grep for remaining hardcoded "isidore" — should only be in triggers and script inventory
