const TEXT_EXTENSIONS = [
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "css",
  "scss",
  "html",
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
  "sql",
  "sh",
  "bash",
];

const MARKDOWN_EXTENSIONS = ["md", "markdown"];

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

const PDF_EXTENSIONS = ["pdf"];

const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "mov", "mkv"];

const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "flac", "aac"];

export function getFileType(filename = "") {
  const parts = filename.split(".");

  const extension =
    parts.length > 1 ? parts.pop().toLowerCase() : filename.toLowerCase();

  if (IMAGE_EXTENSIONS.includes(extension)) {
    return "image";
  }

  if (PDF_EXTENSIONS.includes(extension)) {
    return "pdf";
  }

  if (VIDEO_EXTENSIONS.includes(extension)) {
    return "video";
  }

  if (AUDIO_EXTENSIONS.includes(extension)) {
    return "audio";
  }

  if (MARKDOWN_EXTENSIONS.includes(extension)) {
    return "markdown";
  }

  if (
    TEXT_EXTENSIONS.includes(extension) ||
    filename.toLowerCase() === "dockerfile"
  ) {
    return "text";
  }

  return "binary";
}
