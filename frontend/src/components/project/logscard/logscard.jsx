import "./logscard.css";

import Card from "../../common/card/card";
import { useRef } from "react";
import { useEffect, useState } from "react";
import Button from "../../common/button/button";
import {
  Rocket,
  RefreshCw,
  Play,
  Square,
  RotateCw,
  Trash2,
  Terminal,
} from "lucide-react";

export default function LogsCard({ logs, onClear }) {
  const consoleRef = useRef(null);

  const bottomRef = useRef(null);
  const [latestLogId, setLatestLogId] = useState(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [logs]);

  useEffect(() => {
    if (logs.length === 0) return;

    const newest = logs[logs.length - 1];

    setLatestLogId(newest.id);

    const timer = setTimeout(() => {
      setLatestLogId(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [logs]);

  return (
    <Card>
      <div className="eh-logs-card">
        <div className="eh-logs-header">
          <div className="eh-logs-title">
            <h3>Deployment Logs</h3>

            <p className="eh-log-subtitle">
              Live deployment and runtime output
            </p>
          </div>

          <div className="eh-log-actions">
            <Button variant="secondary" icon={Trash2} onClick={onClear}>
              Clear
            </Button>

            <div className="eh-connected">
              <span className="eh-live-dot"></span>
              LIVE
            </div>
          </div>
        </div>

        <div className="eh-log-console" ref={consoleRef}>
          {logs.length === 0 ? (
            <div className="eh-log-empty">
              <Terminal size={40} />

              <h4>No deployment logs</h4>

              <p>Deploy your project to begin streaming logs.</p>
            </div>
          ) : (
            <div className="eh-log-container">
              {logs.length === 0 ? (
                <div className="eh-log-empty">No logs yet.</div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={log.id}
                    className={`eh-log-line ${
                      log.id === latestLogId ? "eh-log-latest" : ""
                    }`}
                  >
                    <span className="eh-log-index">
                      {(index + 1).toString().padStart(3, "0")}
                    </span>

                    <span className="eh-log-time">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>

                    <span className="eh-log-message">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
