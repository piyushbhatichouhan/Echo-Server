import { useEffect } from "react";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function useLogStream(projectId, onLog) {
  useEffect(() => {
    if (!projectId) return;

    const token = localStorage.getItem("echohub_token");

    const eventSource = new EventSource(
      `${API_URL}/api/projects/${projectId}/logs/live?token=${token}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);

        // Ignore the initial connection message
        if (log.message === "Connected to log stream") return;

        onLog(log);
      } catch (err) {
        console.error(err);
      }
    };

    eventSource.onerror = () => {
      console.log("❌ Log stream disconnected");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [projectId, onLog]);
}
