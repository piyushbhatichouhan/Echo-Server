import React, { useState, useRef, useEffect } from "react";
import "./ProjectTerminal.css";
import { executeTerminalCommand } from "../../../services/project.api";
import { Terminal, Send, Trash2, AlertCircle, Play, CornerDownLeft } from "lucide-react";

export default function ProjectTerminal({ projectId, isRunning }) {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState([
    {
      type: "system",
      text: "EchoServer Web Shell Terminal v2.0 initialized. Type commands to execute inside your active container.",
    },
  ]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleRunCommand = async (cmdToRun) => {
    const trimmed = (cmdToRun || command).trim();
    if (!trimmed || executing) return;

    if (trimmed === "clear") {
      setHistory([]);
      setCommand("");
      return;
    }

    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setHistory((prev) => [...prev, { type: "command", text: trimmed }]);
    setCommand("");
    setExecuting(true);

    try {
      const result = await executeTerminalCommand(projectId, trimmed);
      const output = result.output?.trim() || "";
      const isError = result.exitCode !== 0;

      setHistory((prev) => [
        ...prev,
        {
          type: isError ? "error" : "output",
          text: output || (isError ? `Command failed with exit code ${result.exitCode}` : "(Command executed with no output)"),
        },
      ]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          type: "error",
          text: err.response?.data?.message || err.message || "Failed to execute command in container.",
        },
      ]);
    } finally {
      setExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRunCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setCommand(commandHistory[nextIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= commandHistory.length) {
        setHistoryIndex(-1);
        setCommand("");
      } else {
        setHistoryIndex(nextIdx);
        setCommand(commandHistory[nextIdx]);
      }
    }
  };

  const quickCommands = ["ls -la", "pwd", "node -v", "python --version", "df -h", "ps aux"];

  return (
    <div className="eh-web-terminal-container">
      <div className="eh-terminal-window">
        {/* Terminal Title Bar */}
        <div className="eh-terminal-titlebar">
          <div className="eh-terminal-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="eh-terminal-title">
            <Terminal size={14} />
            <span>container-shell: {projectId.slice(0, 8)}</span>
          </div>
          <button
            type="button"
            className="eh-terminal-clear-btn"
            onClick={() => setHistory([])}
            title="Clear output"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        </div>

        {!isRunning && (
          <div className="eh-terminal-offline-banner">
            <AlertCircle size={18} />
            <span>
              Container is currently offline. Deploy or start the project to open an interactive container shell.
            </span>
          </div>
        )}

        {/* Terminal Quick Commands */}
        <div className="eh-terminal-quick-bar">
          <span className="eh-quick-label">Quick:</span>
          {quickCommands.map((qc) => (
            <button
              key={qc}
              type="button"
              className="eh-quick-cmd-btn"
              onClick={() => handleRunCommand(qc)}
              disabled={!isRunning || executing}
            >
              {qc}
            </button>
          ))}
        </div>

        {/* Terminal Output Area */}
        <div className="eh-terminal-screen">
          {history.map((item, idx) => (
            <div key={idx} className={`eh-terminal-row ${item.type}`}>
              {item.type === "command" && (
                <span className="eh-terminal-prompt">echoserver@app:~$ </span>
              )}
              <span className="eh-terminal-text">{item.text}</span>
            </div>
          ))}
          {executing && (
            <div className="eh-terminal-row system">
              <span className="eh-terminal-cursor">Executing in container...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Input Box */}
        <div className="eh-terminal-input-bar">
          <span className="eh-terminal-prompt">echoserver@app:~$ </span>
          <input
            ref={inputRef}
            type="text"
            className="eh-terminal-input"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRunning ? "Type command (e.g. ls -la, node -v, cat .env)..." : "Container offline"}
            disabled={!isRunning || executing}
            autoFocus
          />
          <button
            type="button"
            className="eh-terminal-send-btn"
            onClick={() => handleRunCommand()}
            disabled={!isRunning || !command.trim() || executing}
          >
            <CornerDownLeft size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
