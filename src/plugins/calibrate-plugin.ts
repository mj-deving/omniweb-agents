/**
 * Calibrate plugin — score prediction calibration and offset adjustment.
 *
 * Compares predicted scores/reactions against actual outcomes and adjusts
 * a calibration offset stored in ~/.{agent}-improvements.json. The offset
 * is applied to future confidence scoring to improve prediction accuracy.
 *
 * beforeSense hook: archived no-op.
 *
 * The retired root audit command used to update calibration here. The active
 * colony-operator route does not use this extension for calibration.
 */

import type { FrameworkPlugin, RunToolFn } from "../types.js";
import type { BeforeSenseContext } from "../lib/util/extensions.js";

/**
 * Create a beforeSense hook for calibrate with injected runTool dependency.
 */
export function createCalibrateBeforeSense(_runTool: RunToolFn) {
  return async (ctx: BeforeSenseContext): Promise<void> => {
    ctx.logger?.info("Extension: calibrate archived for the colony-operator route.");
  };
}

export function createCalibratePlugin(): FrameworkPlugin {
  return {
    name: "calibrate",
    version: "1.0.0",
    description: "Score prediction calibration and offset adjustment",
    hooks: {},
  };
}
