module.exports = {
  python: process.platform === "win32" ? "python" : "python3",

  pip: process.platform === "win32" ? "pip" : "pip3",

  node: "node",

  npm: process.platform === "win32" ? "npm.cmd" : "npm",

  npx: process.platform === "win32" ? "npx.cmd" : "npx",
};
