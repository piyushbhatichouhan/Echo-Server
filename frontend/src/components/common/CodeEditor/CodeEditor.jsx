import Editor from "@monaco-editor/react";
import "./CodeEditor.css";

export default function CodeEditor({
  value,
  onChange = () => {},
  height = "500px",
  readOnly = false,
  language,
}) {
  console.log(language);
  return (
    <div className="code-editor">
      <Editor
        height={height}
        language={language}
        theme="vs-dark"
        value={value}
        onChange={(value) => onChange(value ?? "")}
        options={{
          fontSize: 14,
          fontFamily: "Jetbrains-Mono",
          fontLigatures: true,
          wordWrap: "on",
          minimap: {
            enabled: false,
          },
          bracketPairColorization: {
            enabled: true,
          },
          cursorBlinking: "expand",
          formatOnPaste: true,
          suggest: {
            showFields: false,
            showFunctions: false,
          },
        }}
        beforeMount={(monaco) => {
          console.log("Language prop:", language);
          console.log(monaco.languages.getLanguages().map((l) => l.id));
        }}
      />
    </div>
  );
}
