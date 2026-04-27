---
summary: "Use summary plus topic_hint for non-rule docs, read_when for rule discovery, and never emit use_when."
read_when: ["frontmatter", "metadata", "topic_hint", "read_when", "use_when", "docs"]
---

# Documentation Frontmatter Standard

This repo follows the canonical frontmatter schema in
`pai-extensions/PAI/RULES/doc-front-matter-standard.md`. Keep local docs aligned
with that rule when adding or generating markdown.

## Fields

### summary

Required for maintained markdown reference docs. Use one short sentence that
identifies the document's purpose in indexes.

```yaml
summary: "How agents should choose between local rules and research references."
```

### topic_hint

Use for non-rule docs such as guides, research, package references, design docs,
and generated primitive docs. These hints support explicit index/search flows;
they are not an instruction to auto-load the document.

```yaml
topic_hint: ["primitive docs", "feed", "response shape"]
```

### read_when

Reserve for rule files where keyword routing is worth maintaining. In this repo,
that primarily means `docs/rules/**`. Use task-oriented keywords that help an
agent discover the rule before making the related change.

```yaml
read_when: ["frontmatter", "metadata", "docs", "generated docs"]
```

### use_when

Deprecated. Do not add it to new docs or generation templates. Replace any
existing `use_when` field with `topic_hint` for non-rule docs or `read_when` for
rule docs.

## Examples

Non-rule docs:

```yaml
---
summary: "Reference shapes returned by SuperColony read endpoints."
topic_hint: ["response shape", "api response", "feed post"]
---
```

Rule docs:

```yaml
---
summary: "Keep generated and handwritten docs on the current frontmatter schema."
read_when: ["frontmatter", "metadata", "docs", "rules"]
---
```

## Enforcement

Run the normalizer in check mode before merging docs changes:

```bash
bun scripts/normalize-doc-frontmatter.ts --check
```

The CI workflow at `.github/workflows/docs-frontmatter-check.yml` runs the same
check for markdown, `.ai/`, and `docs/` changes. To fix drift locally:

```bash
bun scripts/normalize-doc-frontmatter.ts --apply
```
