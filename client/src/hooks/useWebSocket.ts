/**
 * React hook for WebSocket connection
 * Provides real-time updates for dashboard and other components
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type WebSocketEventType =
  | 'shift.started'
  | 'shift.ended'
  | 'shift.paused'
  | 'shift.cancelled'
  | 'shift.updated'
  | 'break.started'
  | 'break.ended'
  | 'violation.created'
  | 'violation.detected'
  | 'exception.created'
  | 'exception.resolved'
  | 'employee.created'
  | 'employee.updated'
  | 'employee.status_changed'
  | 'rating.updated'
  | 'dashboard.stats_updated'
  | 'system.notification';

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  data: T;
  timestamp: number;
  companyId?: string;
  employeeId?: string;
}

interface UseWebSocketOptions {
  /**
   * User ID for authentication
   */
  userId?: string;
  
  /**
   * Company ID to filter events
   */
  companyId?: string;
  
  /**
   * Employee ID to filter events
   */
  employeeId?: string;
  
  /**
   * Channels to subscribe to
   */
  channels?: string[];
  
  /**
   * Auto-reconnect on disconnect
   */
  autoReconnect?: boolean;
  
  /**
   * Reconnect interval in ms
   */
  reconnectInterval?: number;
  
  /**
   * Max reconnection attempts
   */
  maxReconnectAttempts?: number;
  
  /**
   * Callback when connected
   */
  onConnect?: () => void;
  
  /**
   * Callback when disconnected
   */
  onDisconnect?: () => void;
  
  /**
   * Callback when error occurs
   */
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  /**
   * Connection state
   */
  isConnected: boolean;
  
  /**
   * Last error
   */
  error: Event | null;
  
  /**
   * Subscribe to event type
   */
  subscribe: (
    eventType: WebSocketEventType,
    handler: (event: WebSocketEvent) => void
  ) => () => void;
  
  /**
   * Subscribe to channel
   */
  subscribeToChannel: (channel: string) => void;
  
  /**
   * Unsubscribe from channel
   */
  unsubscribeFromChannel: (channel: string) => void;
  
  /**
   * Manually reconnect
   */
  reconnect: () => void;
  
  /**
   * Disconnect
   */
  disconnect: () => void;
}

/**
 * WebSocket hook for real-time updates
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    userId,
    companyId,
    employeeId,
    channels = [],
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const eventHandlersRef = useRef<Map<WebSocketEventType, Set<(event: WebSocketEvent) => void>>>(
    new Map()
  );

  /**
   * Build WebSocket URL with query params
   */
  const buildUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const params = new URLSearchParams();
    
    if (userId) params.append('userId', userId);
    if (companyId) params.append('companyId', companyId);
    if (employeeId) params.append('employeeId', employeeId);
    
    return `${protocol}//${host}/ws?${params.toString()}`;
  }, [userId, companyId, employeeId]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    try {
      const url = buildUrl();
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Subscribe to channels
        if (channels.length > 0) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            channels,
          }));
        }
        
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          
          // Call event handlers
          const handlers = eventHandlersRef.current.get(data.type);
          handlers?.forEach(handler => handler(data));
        } catch (err) {
          console.error('[WebSocket] Error parsing message', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] Error', event);
        setError(event);
        onError?.(event);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        onDisconnect?.();
        
        // Auto-reconnect
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(
            `[WebSocket] Reconnecting (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Connection error', err);
    }
  }, [
    buildUrl,
    channels,
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    onConnect,
    onDisconnect,
    onError,
  ]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  /**
   * Subscribe to event type
   */
  const subscribe = useCallback((
    eventType: WebSocketEventType,
    handler: (event: WebSocketEvent) => void
  ) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    
    eventHandlersRef.current.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = eventHandlersRef.current.get(eventType);
      handlers?.delete(handler);
    };
  }, []);

  /**
   * Subscribe to channel
   */
  const subscribeToChannel = useCallback((channel: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        channels: [channel],
      }));
    }
  }, []);

  /**
   * Unsubscribe from channel
   */
  const unsubscribeFromChannel = useCallback((channel: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        channels: [channel],
      }));
    }
  }, []);

  /**
   * Manually reconnect
   */
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    subscribe,
    subscribeToChannel,
    unsubscribeFromChannel,
    reconnect,
    disconnect,
  };
}

/**
 * Hook to listen to specific event type
 */
export function useWebSocketEvent<T = unknown>(
  eventType: WebSocketEventType,
  handler: (data: T) => void,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const ws = useWebSocket(options);
  
  useEffect(() => {
    const unsubscribe = ws.subscribe(eventType, (event) => {
      handler(event.data as T);
    });
    
    return unsubscribe;
  }, [eventType, handler, ws]);
  
  return ws;
}

interface DashboardStats {
  activeShifts: number;
  totalEmployees: number;
  todayViolations: number;
  averageRating: number;
}

/**
 * Hook for dashboard real-time updates
 */
export function useDashboardUpdates(
  companyId: string,
  onStatsUpdate: (stats: DashboardStats) => void
): UseWebSocketReturn {
  return useWebSocketEvent<DashboardStats>('dashboard.stats_updated', onStatsUpdate, {
    companyId,
  });
}

interface Shift {
  id: string;
  employee_id: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  planned_start_at: string;
  planned_end_at: string;
  actual_start_at?: string;
  actual_end_at?: string;
}

/**
 * Hook for shift updates
 */
export function useShiftUpdates(
  companyId: string,
  onShiftUpdate: (shift: Shift) => void
): UseWebSocketReturn {
  const ws = useWebSocket({ companyId });
  
  useEffect(() => {
    const unsubscribers = [
      ws.subscribe('shift.started', (e) => onShiftUpdate(e.data as Shift)),
      ws.subscribe('shift.ended', (e) => onShiftUpdate(e.data as Shift)),
      ws.subscribe('shift.paused', (e) => onShiftUpdate(e.data as Shift)),
      ws.subscribe('shift.updated', (e) => onShiftUpdate(e.data as Shift)),
    ];
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [ws, onShiftUpdate]);
  
  return ws;
}

interface Violation {
  id: string;
  employee_id: string;
  company_id: string;
  rule_id: string;
  source: 'auto' | 'manual';
  reason?: string;
  detected_at: string;
}

/**
 * Hook for violation updates
 */
export function useViolationUpdates(
  companyId: string,
  onViolation: (violation: Violation) => void
): UseWebSocketReturn {
  return useWebSocketEvent<Violation>('violation.detected', onViolation, {
    companyId,
  });
}

