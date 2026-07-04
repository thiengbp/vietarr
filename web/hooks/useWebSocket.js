"use client";

import { useEffect, useRef } from "react";
import { getToken, wsUrl } from "@/lib/clientApi";

export function useWebSocket({ onEvent, enabled = true }) {
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return undefined;
    let socket;
    let closed = false;
    let reconnectMs = 1000;

    function connect() {
      const token = getToken();
      if (!token) return;
      socket = new WebSocket(wsUrl(token));
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);
          handlerRef.current?.(event);
        } catch (_error) {
          // Ignore malformed realtime messages.
        }
      };
      socket.onclose = () => {
        if (closed) return;
        const delay = reconnectMs;
        reconnectMs = Math.min(reconnectMs * 2, 30000);
        window.setTimeout(connect, delay);
      };
      socket.onopen = () => {
        reconnectMs = 1000;
      };
    }

    connect();
    return () => {
      closed = true;
      socket?.close();
    };
  }, [enabled]);
}
