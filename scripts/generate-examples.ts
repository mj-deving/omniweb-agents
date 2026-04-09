#!/usr/bin/env npx tsx
/**
 * Generate example agent templates from compiler examples.
 * Writes to templates/generated/{name}/ directories.
 */
import { EXAMPLE_INTENTS } from "../src/toolkit/compiler/examples.js";
import { composeTemplate } from "../src/toolkit/compiler/template-composer.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUTPUT_DIR = join(import.meta.dirname, "..", "templates", "generated");

for (const example of EXAMPLE_INTENTS) {
  const template = composeTemplate(example.config);
  const dir = join(OUTPUT_DIR, example.config.name);
  mkdirSync(dir, { recursive: true });
  for (const [filename, content] of template.files) {
    writeFileSync(join(dir, filename), content);
    console.log(`wrote ${join(dir, filename)}`);
  }
}

console.log(`\nGenerated ${EXAMPLE_INTENTS.length} example agents in templates/generated/`);
