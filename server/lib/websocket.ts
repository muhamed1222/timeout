/**
 * WebSocket server for real-time updates
 * Provides live updates for dashboard, shifts, violations, etc.
 */

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger.js';
import { parse } from 'url';

export type WebSocketEventType =
  // Shift events
  | 'shift.started'
  | 'shift.ended'
  | 'shift.paused'
  | 'shift.cancelled'
  | 'shift.updated'
  
  // Break events
  | 'break.started'
  | 'break.ended'
  
  // Violation events
  | 'violation.created'
  | 'violation.detected'
  
  // Exception events
  | 'exception.created'
  | 'exception.resolved'
  
  // Employee events
  | 'employee.created'
  | 'employee.updated'
  | 'employee.status_changed'
  
  // Rating events
  | 'rating.updated'
  
  // Dashboard events
  | 'dashboard.stats_updated'
  
  // System events
  | 'system.notification';

export interface WebSocketEvent<T = any> {
  type: WebSocketEventType;
  data: T;
  timestamp: number;
  companyId?: string;
  employeeId?: string;
}

interface WebSocketClient {
  ws: WebSocket;
  userId?: string;
  companyId?: string;
  employeeId?: string;
  subscriptions: Set<string>;
  isAlive: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, WebSocketClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      // Verify client origin in production
      verifyClient: (info: { origin: string; secure: boolean; req: any }) => {
        const origin = info.origin || info.req.headers.origin;
        
        // In production, verify origin
        if (process.env.NODE_ENV === 'production') {
          const allowedOrigins = [
            process.env.FRONTEND_URL,
            process.env.APP_URL,
          ].filter(Boolean);
          
          return allowedOrigins.some(allowed => origin?.startsWith(allowed || ''));
        }
        
        return true;
      }
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Start heartbeat (ping/pong) to detect dead connections
    this.startHeartbeat();
    
    logger.info('WebSocket server initialized on /ws');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: any): void {
    const { query } = parse(request.url || '', true);
    
    const client: WebSocketClient = {
      ws,
      userId: query.userId as string | undefined,
      companyId: query.companyId as string | undefined,
      employeeId: query.employeeId as string | undefined,
      subscriptions: new Set(),
      isAlive: true,
    };
    
    this.clients.set(ws, client);
    
    logger.info('WebSocket client connected', {
      userId: client.userId,
      companyId: client.companyId,
      clientsCount: this.clients.size,
    });
    
    // Send welcome message
    this.sendToClient(ws, {
      type: 'system.notification',
      data: { message: 'Connected to WebSocket server' },
      timestamp: Date.now(),
    });

    // Handle messages from client
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    // Handle pong (heartbeat response)
    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.isAlive = true;
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', error);
      this.handleDisconnect(ws);
    });
  }

  /**
   * Handle message from client
   */
  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      const client = this.clients.get(ws);
      
      if (!client) return;

      // Handle subscription requests
      if (message.type === 'subscribe') {
        const channels = Array.isArray(message.channels) 
          ? message.channels 
          : [message.channels];
        
        channels.forEach((channel: string) => {
          client.subscriptions.add(channel);
        });
        
        logger.debug('Client subscribed', {
          userId: client.userId,
          channels,
        });
        
        this.sendToClient(ws, {
          type: 'system.notification',
          data: { message: `Subscribed to ${channels.join(', ')}` },
          timestamp: Date.now(),
        });
      }
      
      // Handle unsubscribe requests
      if (message.type === 'unsubscribe') {
        const channels = Array.isArray(message.channels) 
          ? message.channels 
          : [message.channels];
        
        channels.forEach((channel: string) => {
          client.subscriptions.delete(channel);
        });
        
        logger.debug('Client unsubscribed', {
          userId: client.userId,
          channels,
        });
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', error);
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    
    if (client) {
      logger.info('WebSocket client disconnected', {
        userId: client.userId,
        companyId: client.companyId,
        clientsCount: this.clients.size - 1,
      });
    }
    
    this.clients.delete(ws);
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (!client.isAlive) {
          logger.debug('Terminating dead WebSocket connection');
          ws.terminate();
          return;
        }
        
        client.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: WebSocketEvent): void {
    this.clients.forEach((client, ws) => {
      // Filter by company if event has companyId
      if (event.companyId && client.companyId !== event.companyId) {
        return;
      }
      
      // Filter by employee if event has employeeId
      if (event.employeeId && client.employeeId !== event.employeeId) {
        return;
      }
      
      this.sendToClient(ws, event);
    });
    
    logger.debug('Broadcasted event', {
      type: event.type,
      recipientCount: this.getRecipientCount(event),
    });
  }

  /**
   * Send event to specific company
   */
  broadcastToCompany(companyId: string, event: WebSocketEvent): void {
    let count = 0;
    
    this.clients.forEach((client, ws) => {
      if (client.companyId === companyId) {
        this.sendToClient(ws, event);
        count++;
      }
    });
    
    logger.debug('Broadcasted to company', {
      companyId,
      type: event.type,
      recipientCount: count,
    });
  }

  /**
   * Send event to specific user
   */
  sendToUser(userId: string, event: WebSocketEvent): void {
    this.clients.forEach((client, ws) => {
      if (client.userId === userId) {
        this.sendToClient(ws, event);
      }
    });
  }

  /**
   * Send event to specific employee
   */
  sendToEmployee(employeeId: string, event: WebSocketEvent): void {
    this.clients.forEach((client, ws) => {
      if (client.employeeId === employeeId) {
        this.sendToClient(ws, event);
      }
    });
  }

  /**
   * Send event to clients subscribed to a channel
   */
  broadcastToChannel(channel: string, event: WebSocketEvent): void {
    let count = 0;
    
    this.clients.forEach((client, ws) => {
      if (client.subscriptions.has(channel)) {
        this.sendToClient(ws, event);
        count++;
      }
    });
    
    logger.debug('Broadcasted to channel', {
      channel,
      type: event.type,
      recipientCount: count,
    });
  }

  /**
   * Send event to single WebSocket client
   */
  private sendToClient(ws: WebSocket, event: WebSocketEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(event));
      } catch (error) {
        logger.error('Error sending WebSocket message', error);
      }
    }
  }

  /**
   * Get count of recipients for an event
   */
  private getRecipientCount(event: WebSocketEvent): number {
    let count = 0;
    
    this.clients.forEach((client) => {
      if (event.companyId && client.companyId !== event.companyId) {
        return;
      }
      if (event.employeeId && client.employeeId !== event.employeeId) {
        return;
      }
      count++;
    });
    
    return count;
  }

  /**
   * Get connection stats
   */
  getStats(): {
    totalConnections: number;
    connectionsByCompany: Record<string, number>;
    connectionsByUser: Record<string, number>;
  } {
    const stats = {
      totalConnections: this.clients.size,
      connectionsByCompany: {} as Record<string, number>,
      connectionsByUser: {} as Record<string, number>,
    };
    
    this.clients.forEach((client) => {
      if (client.companyId) {
        stats.connectionsByCompany[client.companyId] = 
          (stats.connectionsByCompany[client.companyId] || 0) + 1;
      }
      
      if (client.userId) {
        stats.connectionsByUser[client.userId] = 
          (stats.connectionsByUser[client.userId] || 0) + 1;
      }
    });
    
    return stats;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Close all connections
    this.clients.forEach((client, ws) => {
      this.sendToClient(ws, {
        type: 'system.notification',
        data: { message: 'Server is shutting down' },
        timestamp: Date.now(),
      });
      
      ws.close();
    });
    
    if (this.wss) {
      this.wss.close();
    }
    
    logger.info('WebSocket server shut down');
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();

/**
 * Helper functions for common events
 */

import type { ShiftResponse, ViolationResponse, DashboardStatsResponse } from '../../shared/types/api';

interface EmployeeStatusData {
  employeeId: string;
  oldStatus: string;
  newStatus: string;
}

export function notifyShiftStarted(companyId: string, shiftData: ShiftResponse): void {
  wsManager.broadcastToCompany(companyId, {
    type: 'shift.started',
    data: shiftData,
    timestamp: Date.now(),
    companyId,
  });
}

export function notifyShiftEnded(companyId: string, shiftData: ShiftResponse): void {
  wsManager.broadcastToCompany(companyId, {
    type: 'shift.ended',
    data: shiftData,
    timestamp: Date.now(),
    companyId,
  });
}

export function notifyViolationDetected(companyId: string, violationData: ViolationResponse): void {
  wsManager.broadcastToCompany(companyId, {
    type: 'violation.detected',
    data: violationData,
    timestamp: Date.now(),
    companyId,
  });
}

export function notifyDashboardStatsUpdated(companyId: string, stats: DashboardStatsResponse): void {
  wsManager.broadcastToCompany(companyId, {
    type: 'dashboard.stats_updated',
    data: stats,
    timestamp: Date.now(),
    companyId,
  });
}

export function notifyEmployeeStatusChanged(
  companyId: string, 
  employeeId: string, 
  statusData: EmployeeStatusData
): void {
  wsManager.broadcastToCompany(companyId, {
    type: 'employee.status_changed',
    data: statusData,
    timestamp: Date.now(),
    companyId,
    employeeId,
  });
}

