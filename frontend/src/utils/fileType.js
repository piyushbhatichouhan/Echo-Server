const TEXT_EXTENSIONS = [
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "css",
  "scss",
  "html",
  "md",
  "txt",
  "cpp",
  "c",
  "h",
  "hpp",
  "py",
  "java",
  "go",
  "rs",
  "yml",
  "yaml",
  "xml",
  "env",
];

const IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "svg",
  "webp",
  "ico",
];

export function getFileType(filename) {
  const parts = filename.split(".");

  const extension =
    parts.length > 1 ? parts.pop().toLowerCase() : filename.toLowerCase();

  if (IMAGE_EXTENSIONS.includes(extension)) {
    return "image";
  }

  if (
    TEXT_EXTENSIONS.includes(extension) ||
    filename.toLowerCase() === "dockerfile"
  ) {
    return "text";
  }

  return "binary";
}
