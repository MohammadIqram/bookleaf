'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface SSEEvent {
  type: string;
  data: any;
}

export function useSSE(onEvent?: (event: SSEEvent) => void) {
  const token = useAuthStore((s) => s.token);
  const [connected, setConnected] = useState(false);
  const [isPollingFallback, setIsPollingFallback] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);

  onEventRef.current = onEvent;

  const triggerEvent = useCallback((type: string, data: any) => {
    if (onEventRef.current) {
      onEventRef.current({ type, data });
    }
  }, []);

  useEffect(() => {
    if (!token) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
      setIsPollingFallback(false);
      return;
    }

    const sseUrl = `${API_BASE}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setConnected(true);
      setIsPollingFallback(false);
    });

    es.addEventListener('ticket:created', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        triggerEvent('ticket:created', data);
      } catch (_err) {
        // Parse error ignored
      }
    });

    es.addEventListener('ticket:updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        triggerEvent('ticket:updated', data);
      } catch (_err) {
        // Parse error ignored
      }
    });

    es.addEventListener('ticket:message', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        triggerEvent('ticket:message', data);
      } catch (_err) {
        // Parse error ignored
      }
    });

    es.onerror = () => {
      setConnected(false);
      setIsPollingFallback(true);
      es.close();
      eventSourceRef.current = null;
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [token, triggerEvent]);

  // Fallback Polling (triggers callback every 10s if SSE disconnected)
  useEffect(() => {
    if (!isPollingFallback || !token) return;

    const interval = setInterval(() => {
      triggerEvent('poll:tick', { timestamp: Date.now() });
    }, 10000);

    return () => clearInterval(interval);
  }, [isPollingFallback, token, triggerEvent]);

  return { connected, isPollingFallback };
}

export default useSSE;
