/**
 * Toolkit utility barrel — reusable primitives for any loop or template.
 */

export { toErrorMessage } from "./errors.js";
export { escapeRegExp } from "./strings.js";
export { createLimiter } from "./limiter.js";
export { runSubprocessSafe } from "./subprocess.js";
export type { SubprocessOptions, SubprocessResult } from "./subprocess.js";
export { withBudget } from "./timed-phase.js";
export type { TimedResult } from "./timed-phase.js";
