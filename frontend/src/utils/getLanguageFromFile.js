// utils/getLanguageFromFile.js

export default function getLanguageFromFile(filename = "") {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "js":
      return "javascript";

    case "jsx":
      return "javascript";

    case "ts":
      return "typescript";

    case "tsx":
      return "typescript";

    case "json":
      return "json";

    case "html":
      return "html";

    case "css":
      return "css";

    case "scss":
      return "scss";

    case "cpp":
    case "cc":
    case "cxx":
      return "cpp";

    case "c":
      return "c";

    case "h":
    case "hpp":
      return "cpp";

    case "py":
      return "python";

    case "java":
      return "java";

    case "sql":
      return "sql";

    case "xml":
      return "xml";

    case "yml":
    case "yaml":
      return "yaml";

    case "md":
      return "markdown";

    case "dockerfile":
      return "dockerfile";

    case "sh":
      return "shell";

    default:
      return "plaintext";
  }
}
