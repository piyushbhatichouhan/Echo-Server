import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { markdown } from "@codemirror/lang-markdown";
import { yaml } from "@codemirror/lang-yaml";
import { rust } from "@codemirror/lang-rust";
import { php } from "@codemirror/lang-php";
import { xml } from "@codemirror/lang-xml";

export function getLanguageExtension(filename = "") {
  const ext = filename.split(".").pop().toLowerCase();

  switch (ext) {
    case "js":
    case "jsx":
      return javascript({ jsx: true });

    case "ts":
      return javascript({ typescript: true });

    case "tsx":
      return javascript({
        jsx: true,
        typescript: true,
      });

    case "json":
      return json();

    case "html":
      return html();

    case "css":
    case "scss":
      return css();

    case "py":
      return python();

    case "c":
    case "cpp":
    case "h":
    case "hpp":
      return cpp();

    case "java":
      return java();

    case "md":
      return markdown();

    case "xml":
      return xml();

    case "yaml":
    case "yml":
      return yaml();

    case "rs":
      return rust();

    case "php":
      return php();

    default:
      return [];
  }
}
