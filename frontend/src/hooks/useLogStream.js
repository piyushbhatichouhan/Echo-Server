import { useEffect, useState, useRef } from "react";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function useLogStream(projectId, onLog) {
  const [isConnected, setIsConnected] = useState(false);
  const onLogRef = useRef(onLog);

  // Keep onLog callback fresh in ref without triggering useEffect reconnection
  useEffect(() => {
    onLogRef.current = onLog;
  }, [onLog]);

  useEffect(() => {
    if (!projectId) return;

    const token =
      localStorage.getItem("echoserver_token") ||
      localStorage.getItem("echohub_token");

    if (!token) return;

    let isUnmounted = false;
    let eventSource = null;
    let reconnectTimer = null;

    const connect = () => {
      if (isUnmounted) return;

      try {
        eventSource = new EventSource(
          `${API_URL}/api/projects/${projectId}/logs/live?token=${token}`,
        );

        eventSource.onopen = () => {
          if (!isUnmounted) {
            setIsConnected(true);
          }
        };

        eventSource.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const log = JSON.parse(event.data);

            // Ignore the initial handshake message
            if (log.message === "Connected to log stream") {
              setIsConnected(true);
              return;
            }

            if (onLogRef.current) {
              onLogRef.current(log);
            }
          } catch (err) {
            console.error("Error parsing log event:", err);
          }
        };

        eventSource.onerror = () => {
          if (!isUnmounted) {
            setIsConnected(false);
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
            // Debounce / backoff reconnection by 3 seconds so it never loops rapidly
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        console.warn("[useLogStream] Failed to initialize EventSource:", err);
        if (!isUnmounted) {
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      clearTimeout(reconnectTimer);
      if (eventSource) {
        eventSource.close();
      }
      setIsConnected(false);
    };
  }, [projectId]); // Strictly depend ONLY on projectId!

  return { isConnected };
}
