const textExtensions = [
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "html",
  "css",
  "scss",
  "md",
  "txt",
  "env",
  "yml",
  "yaml",
  "xml",
  "gitignore",
  "dockerfile",
  "sh",
];

export function isTextFile(filename) {
  const lower = filename.toLowerCase();

  if (lower === "dockerfile") return true;
  if (lower.endsWith(".gitignore")) return true;
  if (lower.endsWith(".env")) return true;

  const ext = lower.split(".").pop();

  return textExtensions.includes(ext);
}
