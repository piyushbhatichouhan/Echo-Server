import { useEffect, useState } from "react";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function useLogStream(projectId, onLog) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const token =
      localStorage.getItem("echoserver_token") ||
      localStorage.getItem("echohub_token");

    const eventSource = new EventSource(
      `${API_URL}/api/projects/${projectId}/logs/live?token=${token}`,
    );

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);

        // Ignore the initial handshake message
        if (log.message === "Connected to log stream") {
          setIsConnected(true);
          return;
        }

        onLog(log);
      } catch (err) {
        console.error("Error parsing log event:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [projectId, onLog]);

  return { isConnected };
}
