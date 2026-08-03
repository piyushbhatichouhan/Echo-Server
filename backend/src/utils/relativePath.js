const path = require("path");

// normalize DB path to always use /
function normalizeRelativePath(p) {
  return p.replace(/\\/g, "/");
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
  return path.posix.join(...parts.map(normalizeRelativePath));
}

module.exports = {
  normalizeRelativePath,
  relativeDirname,
  relativeBasename,
  relativeExt,
  relativeJoin,
};
