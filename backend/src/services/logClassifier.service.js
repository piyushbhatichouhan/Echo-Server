/**
 * Log Classifier & Formatter Service
 * Filters out unnecessary low-level noise and categorizes logs with levels and categories.
 */

// Regex to strip ANSI escape codes and control characters
const ANSI_REGEX =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// Patterns representing low-value internal daemon noise that shouldn't clutter the user terminal
const NOISE_PATTERNS = [
  /^--->\s+(?:Using cache|[0-9a-f]{12}|Running in\s+[0-9a-f]+)/i,
  /^Removing intermediate container\s+[0-9a-f]+/i,
  /^(?:sha256:)?[0-9a-f]{64}$/i,
  /^\{"(?:stream|status|id|progress)":/i,
  /^\[object Object\]$/i,
  /^Build files:\s+\[/i,
  /^Build files:$/i,
  /^Returning image:/i,
  /^Docker build started$/i,
];

/**
 * Strips ANSI escapes and control characters from text.
 */
const stripAnsi = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.replace(ANSI_REGEX, "").replace(CONTROL_CHARS_REGEX, "").trim();
};

/**
 * Checks if a cleaned log line is unnecessary noise.
 */
const isNoise = (clean) => {
  if (!clean || clean.length === 0) return true;
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(clean)) return true;
  }
  return false;
};

/**
 * Classifies a log message into level and category, stripping unnecessary prefixes.
 *
 * @param {string} rawMessage - Raw log string from stdout, stderr, or system pipeline
 * @param {string|null} explicitLevel - Explicit level override ('info' | 'warn' | 'error' | 'success' | 'step')
 * @param {string|null} explicitCategory - Explicit category override ('system' | 'build' | 'runtime' | 'health')
 * @returns {{ isNoise: boolean, message: string, level: string, category: string }}
 */
const classify = (rawMessage, explicitLevel = null, explicitCategory = null) => {
  const clean = stripAnsi(String(rawMessage || ""));

  if (isNoise(clean)) {
    return {
      isNoise: true,
      message: clean,
      level: "info",
      category: explicitCategory || "system",
    };
  }

  let level = explicitLevel;
  let category = explicitCategory;
  let displayMessage = clean;

  // 1. Detect Stage / Step Headers
  if (clean.startsWith("==========") && clean.endsWith("==========")) {
    displayMessage = clean.replace(/^=+\s*|\s*=+/g, "");
    level = "step";
    category = category || "system";
  } else if (/^Step\s+\d+\/\d+\s*:/i.test(clean)) {
    level = "step";
    category = "build";
  }

  // 2. Strip standard leading tag prefixes and infer level if not explicitly provided
  if (!level) {
    if (/^\[ERROR\]\s*/i.test(clean)) {
      displayMessage = clean.replace(/^\[ERROR\]\s*/i, "");
      level = "error";
    } else if (/^\[WARN\]\s*/i.test(clean)) {
      displayMessage = clean.replace(/^\[WARN\]\s*/i, "");
      level = "warn";
    } else if (/^\[INFO\]\s*/i.test(clean)) {
      displayMessage = clean.replace(/^\[INFO\]\s*/i, "");
      level = "info";
    }
  }

  // 3. Heuristic Level Detection
  if (!level) {
    const lower = clean.toLowerCase();
    if (
      lower.includes("error:") ||
      lower.includes("fatal:") ||
      lower.includes("exception:") ||
      lower.includes("failed to") ||
      lower.includes("econnrefused") ||
      lower.includes("unhandledrejection") ||
      lower.includes("npm err!") ||
      /^\s*at\s+[\w\.\/\\<>-]+\s+\(/.test(clean) // stack trace
    ) {
      level = "error";
    } else if (
      lower.includes("warn:") ||
      lower.includes("warning:") ||
      lower.includes("deprecated") ||
      lower.includes("npm warn")
    ) {
      level = "warn";
    } else if (
      lower.includes("successfully") ||
      lower.includes("ready in") ||
      lower.includes("active online") ||
      lower.includes("listening on") ||
      lower.includes("health check passed") ||
      lower.includes("connected to")
    ) {
      level = "success";
    } else {
      level = "info";
    }
  }

  // 4. Heuristic Category Detection
  if (!category) {
    const lower = clean.toLowerCase();
    if (
      lower.includes("npm") ||
      lower.includes("yarn") ||
      lower.includes("pnpm") ||
      lower.includes("pip") ||
      lower.includes("docker") ||
      lower.includes("compil") ||
      lower.includes("bundl") ||
      lower.includes("vite") ||
      lower.includes("webpack") ||
      lower.includes("tsc") ||
      /^step\s+\d+\/\d+/i.test(clean)
    ) {
      category = "build";
    } else if (
      lower.includes("health") ||
      lower.includes("probe") ||
      lower.includes("readiness") ||
      lower.includes("auto-detected application listening") ||
      /port\s+\d+/i.test(clean)
    ) {
      category = "health";
    } else if (
      lower.includes("pipeline") ||
      lower.includes("workspace") ||
      lower.includes("sandbox") ||
      lower.includes("container started") ||
      lower.includes("container stopped") ||
      lower.includes("git")
    ) {
      category = "system";
    } else {
      // Default to runtime for application container output
      category = "runtime";
    }
  }

  return {
    isNoise: false,
    message: displayMessage,
    level,
    category,
  };
};

module.exports = {
  stripAnsi,
  isNoise,
  classify,
};
