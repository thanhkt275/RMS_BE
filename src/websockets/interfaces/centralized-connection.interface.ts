/**
 * Backend interfaces for supporting centralized WebSocket connections
 * Coordinates with frontend centralized architecture
 */

/**
 * Client connection metadata for centralized tracking
 */
export interface CentralizedClientMetadata {
  clientId: string;
  sessionId: string; // Browser session identifier
  tabId: string; // Individual tab identifier
  isLeaderTab: boolean; // Whether this is the leader tab for the session
  userRole: string;
  connectedAt: number;
  lastHeartbeat: number;
  rooms: Set<string>; // Rooms this client has joined
  tournamentId?: string;
  fieldId?: string;
}

/**
 * Session-based connection tracking
 */
export interface SessionConnectionInfo {
  sessionId: string;
  leaderClientId: string | null;
  clientIds: Set<string>;
  totalTabs: number;
  createdAt: number;
  lastActivity: number;
  rooms: Set<string>;
  metadata: Record<string, any>;
}

/**
 * Enhanced room membership with session awareness
 */
export interface CentralizedRoomMembership {
  roomId: string;
  roomType: 'tournament' | 'field' | 'match';
  sessionCount: number; // Number of browser sessions
  clientCount: number; // Total number of clients (tabs)
  sessions: Map<string, SessionConnectionInfo>;
  createdAt: number;
  lastActivity: number;
}

/**
 * Connection event types for centralized coordination
 */
export type CentralizedConnectionEventType = 
  | 'SESSION_CREATED'
  | 'SESSION_DESTROYED'
  | 'LEADER_CHANGED'
  | 'TAB_ADDED'
  | 'TAB_REMOVED'
  | 'ROOM_SESSION_JOINED'
  | 'ROOM_SESSION_LEFT';

/**
 * Connection event data
 */
export interface CentralizedConnectionEvent {
  type: CentralizedConnectionEventType;
  sessionId: string;
  clientId: string;
  timestamp: number;
  data?: any;
}

/**
 * Interface for centralized connection management
 */
export interface ICentralizedConnectionManager {
  // Session Management
  createSession(clientId: string, metadata: Partial<CentralizedClientMetadata>): SessionConnectionInfo;
  destroySession(sessionId: string): void;
  getSession(sessionId: string): SessionConnectionInfo | null;
  getAllSessions(): SessionConnectionInfo[];
  
  // Client Management
  addClientToSession(sessionId: string, clientId: string, metadata: Partial<CentralizedClientMetadata>): void;
  removeClientFromSession(sessionId: string, clientId: string): void;
  updateClientMetadata(clientId: string, updates: Partial<CentralizedClientMetadata>): void;
  getClientMetadata(clientId: string): CentralizedClientMetadata | null;
  
  // Leader Management
  setSessionLeader(sessionId: string, clientId: string): void;
  getSessionLeader(sessionId: string): string | null;
  handleLeaderDisconnect(sessionId: string, clientId: string): string | null; // Returns new leader
  
  // Room Management
  joinSessionToRoom(sessionId: string, roomId: string, roomType: 'tournament' | 'field' | 'match'): void;
  leaveSessionFromRoom(sessionId: string, roomId: string): void;
  getRoomMembership(roomId: string): CentralizedRoomMembership | null;
  getSessionRooms(sessionId: string): string[];
  
  // Statistics & Monitoring
  getConnectionStats(): {
    totalSessions: number;
    totalClients: number;
    averageTabsPerSession: number;
    roomStats: Record<string, { sessions: number; clients: number }>;
  };
  
  // Event Handling
  onConnectionEvent(callback: (event: CentralizedConnectionEvent) => void): () => void;
  
  // Cleanup
  cleanupInactiveSessions(maxInactiveMs: number): number;
  cleanupEmptyRooms(): number;
}

/**
 * Enhanced broadcasting interface for centralized connections
 */
export interface ICentralizedBroadcaster {
  // Session-based broadcasting
  broadcastToSession(sessionId: string, event: string, data: any): void;
  broadcastToSessionLeader(sessionId: string, event: string, data: any): void;
  broadcastToAllSessions(event: string, data: any): void;
  
  // Room-based broadcasting with session awareness
  broadcastToRoomSessions(roomId: string, event: string, data: any): void;
  broadcastToRoomLeaders(roomId: string, event: string, data: any): void;
  
  // Selective broadcasting
  broadcastToRole(role: string, event: string, data: any): void;
  broadcastToTournament(tournamentId: string, event: string, data: any): void;
  broadcastToField(fieldId: string, event: string, data: any): void;
  
  // Statistics
  getBroadcastStats(): {
    totalBroadcasts: number;
    sessionBroadcasts: number;
    roomBroadcasts: number;
    lastBroadcastTime: number;
  };
}

/**
 * Configuration for centralized connection management
 */
export interface CentralizedConnectionConfig {
  // Session settings
  sessionTimeoutMs: number;
  heartbeatIntervalMs: number;
  maxTabsPerSession: number;
  
  // Cleanup settings
  cleanupIntervalMs: number;
  maxInactiveSessionMs: number;
  
  // Room settings
  maxRoomsPerSession: number;
  roomTimeoutMs: number;
  
  // Monitoring settings
  enableMetrics: boolean;
  metricsRetentionMs: number;
  
  // Debug settings
  debug: boolean;
  logLevel: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
}

/**
 * Metrics for centralized connection monitoring
 */
export interface CentralizedConnectionMetrics {
  // Connection metrics
  totalConnections: number;
  totalSessions: number;
  averageTabsPerSession: number;
  connectionRate: number; // connections per minute
  disconnectionRate: number; // disconnections per minute
  
  // Room metrics
  totalRooms: number;
  averageSessionsPerRoom: number;
  roomJoinRate: number;
  roomLeaveRate: number;
  
  // Performance metrics
  averageResponseTime: number;
  broadcastLatency: number;
  memoryUsage: number;
  
  // Error metrics
  connectionErrors: number;
  broadcastErrors: number;
  sessionErrors: number;
  
  // Timestamps
  startTime: number;
  lastUpdateTime: number;
  uptime: number;
}

/**
 * Health check interface for centralized connections
 */
export interface ICentralizedHealthChecker {
  // Health checks
  checkConnectionHealth(): Promise<boolean>;
  checkSessionHealth(): Promise<boolean>;
  checkRoomHealth(): Promise<boolean>;
  checkBroadcastHealth(): Promise<boolean>;
  
  // Diagnostics
  getDiagnostics(): Promise<{
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    checks: Record<string, { status: boolean; message?: string; duration: number }>;
    metrics: CentralizedConnectionMetrics;
    timestamp: number;
  }>;
  
  // Recovery
  attemptRecovery(): Promise<boolean>;
  resetConnections(): Promise<void>;
}
