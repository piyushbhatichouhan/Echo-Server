import "./LogsCard.css";

import Card from "../../common/Card/Card";
import { useRef } from "react";
import { useEffect, useState } from "react";

export default function LogsCard({ logs }) {
  const consoleRef = useRef(null);

  const bottomRef = useRef(null);
  const [latestLogId, setLatestLogId] = useState(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [logs]);

  useEffect(() => {
    consoleRef.current?.scrollTo({
      top: consoleRef.current.scrollHeight,

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
          <h3>Live Logs</h3>

          <div className="eh-connected">
            <span className="eh-live-dot"></span>
            LIVE
          </div>
        </div>

        <div className="eh-log-console" ref={consoleRef}>
          {logs.length === 0 ? (
            <p>No logs yet.</p>
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
