/**
 * Centralized Connection Manager Service
 * Backend service to coordinate with frontend centralized WebSocket architecture
 * Single Responsibility: Manage session-based connections and reduce server load
 */

import { Injectable, Logger } from '@nestjs/common';
import { 
  ICentralizedConnectionManager,
  CentralizedClientMetadata,
  SessionConnectionInfo,
  CentralizedRoomMembership,
  CentralizedConnectionEvent,
  CentralizedConnectionEventType,
  CentralizedConnectionConfig
} from '../interfaces/centralized-connection.interface';

@Injectable()
export class CentralizedConnectionManagerService implements ICentralizedConnectionManager {
  private readonly logger = new Logger(CentralizedConnectionManagerService.name);
  
  // Core data structures
  private sessions = new Map<string, SessionConnectionInfo>();
  private clients = new Map<string, CentralizedClientMetadata>();
  private rooms = new Map<string, CentralizedRoomMembership>();
  private eventCallbacks = new Set<(event: CentralizedConnectionEvent) => void>();
  
  // Cleanup and monitoring
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly config: CentralizedConnectionConfig;
  
  // Metrics
  private metrics = {
    sessionsCreated: 0,
    sessionsDestroyed: 0,
    clientsConnected: 0,
    clientsDisconnected: 0,
    roomJoins: 0,
    roomLeaves: 0,
    leaderChanges: 0
  };

  constructor(config: Partial<CentralizedConnectionConfig> = {}) {
    this.config = {
      sessionTimeoutMs: 30000, // 30 seconds
      heartbeatIntervalMs: 5000, // 5 seconds
      maxTabsPerSession: 20,
      cleanupIntervalMs: 60000, // 1 minute
      maxInactiveSessionMs: 300000, // 5 minutes
      maxRoomsPerSession: 10,
      roomTimeoutMs: 600000, // 10 minutes
      enableMetrics: true,
      metricsRetentionMs: 3600000, // 1 hour
      debug: false,
      logLevel: 'INFO',
      ...config
    };

    this.startCleanupTimer();
    this.logger.log('CentralizedConnectionManager initialized');
  }

  /**
   * Create a new browser session
   */
  createSession(clientId: string, metadata: Partial<CentralizedClientMetadata>): SessionConnectionInfo {
    const sessionId = this.generateSessionId();
    
    const session: SessionConnectionInfo = {
      sessionId,
      leaderClientId: clientId, // First client becomes leader
      clientIds: new Set([clientId]),
      totalTabs: 1,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      rooms: new Set(),
      metadata: {}
    };

    // Create client metadata
    const clientMetadata: CentralizedClientMetadata = {
      clientId,
      sessionId,
      tabId: metadata.tabId || this.generateTabId(),
      isLeaderTab: true, // First client is leader
      userRole: metadata.userRole || 'COMMON',
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      rooms: new Set(),
      tournamentId: metadata.tournamentId,
      fieldId: metadata.fieldId
    };

    this.sessions.set(sessionId, session);
    this.clients.set(clientId, clientMetadata);
    
    this.metrics.sessionsCreated++;
    this.metrics.clientsConnected++;
    
    this.emitEvent({
      type: 'SESSION_CREATED',
      sessionId,
      clientId,
      timestamp: Date.now(),
      data: { totalTabs: 1 }
    });

    this.logger.log(`Session created: ${sessionId} with leader: ${clientId}`);
    return session;
  }

  /**
   * Destroy a browser session
   */
  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Remove all clients from session
    session.clientIds.forEach(clientId => {
      this.clients.delete(clientId);
      this.metrics.clientsDisconnected++;
    });

    // Leave all rooms
    session.rooms.forEach(roomId => {
      this.leaveSessionFromRoom(sessionId, roomId);
    });

    this.sessions.delete(sessionId);
    this.metrics.sessionsDestroyed++;

    this.emitEvent({
      type: 'SESSION_DESTROYED',
      sessionId,
      clientId: session.leaderClientId || '',
      timestamp: Date.now(),
      data: { totalTabs: session.totalTabs }
    });

    this.logger.log(`Session destroyed: ${sessionId}`);
  }

  /**
   * Add a new tab (client) to existing session
   */
  addClientToSession(sessionId: string, clientId: string, metadata: Partial<CentralizedClientMetadata>): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Cannot add client to non-existent session: ${sessionId}`);
      return;
    }

    if (session.clientIds.size >= this.config.maxTabsPerSession) {
      this.logger.warn(`Session ${sessionId} has reached max tabs limit: ${this.config.maxTabsPerSession}`);
      return;
    }

    // Create client metadata
    const clientMetadata: CentralizedClientMetadata = {
      clientId,
      sessionId,
      tabId: metadata.tabId || this.generateTabId(),
      isLeaderTab: false, // New tabs are not leaders
      userRole: metadata.userRole || 'COMMON',
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      rooms: new Set(session.rooms), // Inherit session rooms
      tournamentId: metadata.tournamentId,
      fieldId: metadata.fieldId
    };

    session.clientIds.add(clientId);
    session.totalTabs++;
    session.lastActivity = Date.now();
    
    this.clients.set(clientId, clientMetadata);
    this.metrics.clientsConnected++;

    this.emitEvent({
      type: 'TAB_ADDED',
      sessionId,
      clientId,
      timestamp: Date.now(),
      data: { totalTabs: session.totalTabs }
    });

    this.logger.log(`Client added to session: ${clientId} -> ${sessionId} (${session.totalTabs} tabs)`);
  }

  /**
   * Remove a tab (client) from session
   */
  removeClientFromSession(sessionId: string, clientId: string): void {
    const session = this.sessions.get(sessionId);
    const client = this.clients.get(clientId);
    
    if (!session || !client) return;

    session.clientIds.delete(clientId);
    session.totalTabs--;
    session.lastActivity = Date.now();
    
    this.clients.delete(clientId);
    this.metrics.clientsDisconnected++;

    // Handle leader change if needed
    if (session.leaderClientId === clientId) {
      const newLeader = this.selectNewLeader(sessionId);
      if (newLeader) {
        this.setSessionLeader(sessionId, newLeader);
      }
    }

    // Destroy session if no clients left
    if (session.clientIds.size === 0) {
      this.destroySession(sessionId);
      return;
    }

    this.emitEvent({
      type: 'TAB_REMOVED',
      sessionId,
      clientId,
      timestamp: Date.now(),
      data: { totalTabs: session.totalTabs }
    });

    this.logger.log(`Client removed from session: ${clientId} <- ${sessionId} (${session.totalTabs} tabs)`);
  }

  /**
   * Set session leader
   */
  setSessionLeader(sessionId: string, clientId: string): void {
    const session = this.sessions.get(sessionId);
    const client = this.clients.get(clientId);
    
    if (!session || !client || !session.clientIds.has(clientId)) return;

    const oldLeader = session.leaderClientId;
    
    // Update old leader
    if (oldLeader && this.clients.has(oldLeader)) {
      this.clients.get(oldLeader)!.isLeaderTab = false;
    }

    // Update new leader
    session.leaderClientId = clientId;
    client.isLeaderTab = true;
    session.lastActivity = Date.now();
    
    this.metrics.leaderChanges++;

    this.emitEvent({
      type: 'LEADER_CHANGED',
      sessionId,
      clientId,
      timestamp: Date.now(),
      data: { oldLeader, newLeader: clientId }
    });

    this.logger.log(`Leader changed in session ${sessionId}: ${oldLeader} -> ${clientId}`);
  }

  /**
   * Join session to room
   */
  joinSessionToRoom(sessionId: string, roomId: string, roomType: 'tournament' | 'field' | 'match'): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.rooms.size >= this.config.maxRoomsPerSession) {
      this.logger.warn(`Session ${sessionId} has reached max rooms limit: ${this.config.maxRoomsPerSession}`);
      return;
    }

    // Add to session
    session.rooms.add(roomId);
    session.lastActivity = Date.now();

    // Update all clients in session
    session.clientIds.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client) {
        client.rooms.add(roomId);
      }
    });

    // Update room membership
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        roomType,
        sessionCount: 0,
        clientCount: 0,
        sessions: new Map(),
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      this.rooms.set(roomId, room);
    }

    room.sessions.set(sessionId, session);
    room.sessionCount = room.sessions.size;
    room.clientCount = Array.from(room.sessions.values()).reduce((sum, s) => sum + s.totalTabs, 0);
    room.lastActivity = Date.now();
    
    this.metrics.roomJoins++;

    this.emitEvent({
      type: 'ROOM_SESSION_JOINED',
      sessionId,
      clientId: session.leaderClientId || '',
      timestamp: Date.now(),
      data: { roomId, roomType, sessionCount: room.sessionCount, clientCount: room.clientCount }
    });

    this.logger.log(`Session joined room: ${sessionId} -> ${roomId} (${room.sessionCount} sessions, ${room.clientCount} clients)`);
  }

  /**
   * Leave session from room
   */
  leaveSessionFromRoom(sessionId: string, roomId: string): void {
    const session = this.sessions.get(sessionId);
    const room = this.rooms.get(roomId);
    
    if (!session || !room) return;

    // Remove from session
    session.rooms.delete(roomId);
    session.lastActivity = Date.now();

    // Update all clients in session
    session.clientIds.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client) {
        client.rooms.delete(roomId);
      }
    });

    // Update room membership
    room.sessions.delete(sessionId);
    room.sessionCount = room.sessions.size;
    room.clientCount = Array.from(room.sessions.values()).reduce((sum, s) => sum + s.totalTabs, 0);
    room.lastActivity = Date.now();
    
    this.metrics.roomLeaves++;

    // Remove room if empty
    if (room.sessionCount === 0) {
      this.rooms.delete(roomId);
    }

    this.emitEvent({
      type: 'ROOM_SESSION_LEFT',
      sessionId,
      clientId: session.leaderClientId || '',
      timestamp: Date.now(),
      data: { roomId, sessionCount: room.sessionCount, clientCount: room.clientCount }
    });

    this.logger.log(`Session left room: ${sessionId} <- ${roomId} (${room.sessionCount} sessions, ${room.clientCount} clients)`);
  }

  // Getters
  getSession(sessionId: string): SessionConnectionInfo | null {
    return this.sessions.get(sessionId) || null;
  }

  getAllSessions(): SessionConnectionInfo[] {
    return Array.from(this.sessions.values());
  }

  getClientMetadata(clientId: string): CentralizedClientMetadata | null {
    return this.clients.get(clientId) || null;
  }

  getSessionLeader(sessionId: string): string | null {
    return this.sessions.get(sessionId)?.leaderClientId || null;
  }

  getRoomMembership(roomId: string): CentralizedRoomMembership | null {
    return this.rooms.get(roomId) || null;
  }

  getSessionRooms(sessionId: string): string[] {
    return Array.from(this.sessions.get(sessionId)?.rooms || []);
  }

  updateClientMetadata(clientId: string, updates: Partial<CentralizedClientMetadata>): void {
    const client = this.clients.get(clientId);
    if (client) {
      Object.assign(client, updates);
      client.lastHeartbeat = Date.now();
      
      // Update session activity
      const session = this.sessions.get(client.sessionId);
      if (session) {
        session.lastActivity = Date.now();
      }
    }
  }

  handleLeaderDisconnect(sessionId: string, clientId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.leaderClientId !== clientId) return null;

    const newLeader = this.selectNewLeader(sessionId);
    if (newLeader) {
      this.setSessionLeader(sessionId, newLeader);
    }
    
    return newLeader;
  }

  getConnectionStats() {
    const totalSessions = this.sessions.size;
    const totalClients = this.clients.size;
    const averageTabsPerSession = totalSessions > 0 ? totalClients / totalSessions : 0;
    
    const roomStats: Record<string, { sessions: number; clients: number }> = {};
    this.rooms.forEach((room, roomId) => {
      roomStats[roomId] = {
        sessions: room.sessionCount,
        clients: room.clientCount
      };
    });

    return {
      totalSessions,
      totalClients,
      averageTabsPerSession,
      roomStats
    };
  }

  onConnectionEvent(callback: (event: CentralizedConnectionEvent) => void): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  cleanupInactiveSessions(maxInactiveMs: number): number {
    const now = Date.now();
    let cleanedCount = 0;

    this.sessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > maxInactiveMs) {
        this.destroySession(sessionId);
        cleanedCount++;
      }
    });

    return cleanedCount;
  }

  cleanupEmptyRooms(): number {
    let cleanedCount = 0;
    
    this.rooms.forEach((room, roomId) => {
      if (room.sessionCount === 0) {
        this.rooms.delete(roomId);
        cleanedCount++;
      }
    });

    return cleanedCount;
  }

  // Private methods
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private selectNewLeader(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.clientIds.size === 0) return null;

    // Select the oldest client as new leader
    let oldestClient: string | null = null;
    let oldestTime = Date.now();

    session.clientIds.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.connectedAt < oldestTime) {
        oldestTime = client.connectedAt;
        oldestClient = clientId;
      }
    });

    return oldestClient;
  }

  private emitEvent(event: CentralizedConnectionEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        this.logger.error('Error in connection event callback:', error);
      }
    });
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      const cleanedSessions = this.cleanupInactiveSessions(this.config.maxInactiveSessionMs);
      const cleanedRooms = this.cleanupEmptyRooms();
      
      if (cleanedSessions > 0 || cleanedRooms > 0) {
        this.logger.log(`Cleanup completed: ${cleanedSessions} sessions, ${cleanedRooms} rooms`);
      }
    }, this.config.cleanupIntervalMs);
  }
}
