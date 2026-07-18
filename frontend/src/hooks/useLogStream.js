import { useEffect } from "react";

export default function useLogStream(projectId, onLog) {
  useEffect(() => {
    if (!projectId) return;

    const token = localStorage.getItem("echohub_token");

    const eventSource = new EventSource(
      `http://localhost:3000/api/projects/${projectId}/logs/live?token=${token}`,
    );

    eventSource.onopen = () => {
      console.log("✅ Connected to log stream");
    };

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
