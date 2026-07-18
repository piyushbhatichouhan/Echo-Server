import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";

export default function CodeEditor({
  value,
  onChange,
  onSave,
  extensions = [],
}) {
  const saveKeymap = Prec.high(
    keymap.of([
      {
        key: "Mod-s",
        run() {
          onSave?.();
          return true;
        },
      },
    ]),
  );

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={oneDark}
      extensions={[
        ...(Array.isArray(extensions) ? extensions : [extensions]),
        saveKeymap,
      ]}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: true,
        autocompletion: true,
        bracketMatching: true,
        closeBrackets: true,
        searchKeymap: true,
        indentOnInput: true,
        history: true,
      }}
    />
  );
}
