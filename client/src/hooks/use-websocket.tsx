import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./use-auth";

export function useWebSocket() {
  const { token } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map());

  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      // Authenticate the connection
      ws.current?.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const handler = messageHandlers.current.get(data.type);
        if (handler) {
          handler(data);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.current?.close();
    };
  }, [token]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((messageType: string, handler: (data: any) => void) => {
    messageHandlers.current.set(messageType, handler);
    
    return () => {
      messageHandlers.current.delete(messageType);
    };
  }, []);

  return { sendMessage, subscribe };
}
