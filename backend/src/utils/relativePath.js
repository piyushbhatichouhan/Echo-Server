const path = require("path");

// normalize DB path to always use /
function normalizeRelativePath(p) {
  if (p === null || p === undefined) return "";
  if (typeof p !== "string") {
    throw new TypeError(
      `Expected relative path to be a string, got ${typeof p}`,
    );
  }

  let normalized = p.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    normalized = normalized.replace(/^\/+/, "");
  }
  return normalized;
}

// dirname using POSIX rules
function relativeDirname(p) {
  return path.posix.dirname(normalizeRelativePath(p));
}

// basename using POSIX rules
function relativeBasename(p) {
  return path.posix.basename(normalizeRelativePath(p));
}

// extension using POSIX rules
function relativeExt(p) {
  return path.posix.extname(normalizeRelativePath(p));
}

// join using POSIX rules
function relativeJoin(...parts) {
  const filtered = parts
    .filter((part) => part !== null && part !== undefined)
    .map(normalizeRelativePath)
    .filter((part) => part !== "" && part !== ".");

  if (filtered.length === 0) return "";
  return path.posix.join(...filtered);
}

module.exports = {
  normalizeRelativePath,
  relativeDirname,
  relativeBasename,
  relativeExt,
  relativeJoin,
};
