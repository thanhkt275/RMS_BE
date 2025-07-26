import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsResponse,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { MatchScoresService } from '../match-scores/match-scores.service';
import { GameElementDto } from '../match-scores/dto/create-match-scores.dto';
import { MatchState } from '../utils/prisma-types';
import {
  ScoreUpdateDto,
  PersistScoresDto,
  PersistenceResultDto,
  RankingSubscriptionDto,
  RankingUnsubscriptionDto,
} from './dto';
import { setGlobalEventsGateway } from '../match-scores/ranking-update.service';

interface TimerData {
  duration: number;
  remaining: number;
  isRunning: boolean;
  startedAt?: number;
  pausedAt?: number;
  tournamentId: string;
  fieldId?: string;
}

interface MatchData {
  id: string;
  matchNumber: number;
  status: MatchState;
  tournamentId: string;
  fieldId?: string;
  // Other match properties
}

interface ScoreData {
  matchId: string;
  redAutoScore: number;
  redDriveScore: number;
  redTotalScore: number;
  blueAutoScore: number;
  blueDriveScore: number;
  blueTotalScore: number;
  tournamentId: string;
  fieldId?: string;
  // Other score properties
}

interface MatchStateData {
  matchId: string;
  status: MatchState;
  currentPeriod?: 'auto' | 'teleop' | 'endgame' | null;
  tournamentId: string;
  fieldId?: string;
}

interface AudienceDisplaySettings {
  displayMode: 'match' | 'teams' | 'schedule' | 'rankings' | 'announcement' | 'blank';
  matchId?: string | null;
  showTimer?: boolean;
  showScores?: boolean;
  showTeams?: boolean;
  message?: string;
  tournamentId: string;
  updatedAt: number;
}

interface AnnouncementData {
  message: string;
  tournamentId: string;
  fieldId?: string; // Optional field ID for field-specific announcements
  duration?: number; // How long to show the announcement (in ms)
}

interface JoinRoomData {
  tournamentId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // In production, specify your frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
@Injectable()
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('EventsGateway');

  // Store audience display settings per tournament
  private audienceDisplaySettings: Map<string, AudienceDisplaySettings> = new Map();

  // Store active timers per tournament
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  constructor(
    private readonly matchScoresService: MatchScoresService,
  ) {}

  // Helper method to convert Record<string, number> to GameElementDto[]
  private convertGameElementsToDto(gameElements?: Record<string, number>): GameElementDto[] {
    if (!gameElements) return [];

    return Object.entries(gameElements).map(([element, count]) => ({
      element,
      count,
      pointsEach: 1, // Default value - could be enhanced to get actual point values
      totalPoints: count, // Assuming simple multiplication for now
      operation: 'multiply', // Default operation
    }));
  }

  // Helper method to convert GameElementDto[] to Record<string, number> (if needed)
  private convertDtoToGameElements(gameElements?: GameElementDto[]): Record<string, number> {
    if (!gameElements) return {};

    return gameElements.reduce((acc, item) => {
      acc[item.element] = item.count;
      return acc;
    }, {} as Record<string, number>);
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    // Set global reference for RankingUpdateService
    setGlobalEventsGateway(this);
    this.logger.log('Global EventsGateway reference set for ranking updates');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Join a tournament room
  @SubscribeMessage('join_tournament')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomData
  ): void {
    const { tournamentId } = data;
    client.join(tournamentId);
    this.logger.log(`Client ${client.id} joined room: ${tournamentId}`);

    // Send current audience display settings to the newly joined client
    const currentSettings = this.audienceDisplaySettings.get(tournamentId);
    if (currentSettings) {
      client.emit('display_mode_change', currentSettings);
    }
  }

  // Leave a tournament room
  @SubscribeMessage('leave_tournament')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomData
  ): void {
    const { tournamentId } = data;
    client.leave(tournamentId);
    this.logger.log(`Client ${client.id} left room: ${tournamentId}`);
  }

  // Subscribe to ranking updates for a tournament
  @SubscribeMessage('subscribe_rankings')
  handleSubscribeRankings(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RankingSubscriptionDto
  ): void {
    const { tournamentId, stageId } = data;
    const roomName = `tournament_${tournamentId}`;

    // Join tournament room if not already joined
    client.join(roomName);

    this.logger.log(`Client ${client.id} subscribed to rankings for tournament: ${tournamentId}${stageId ? `, stage: ${stageId}` : ''}`);

    // Send acknowledgment
    client.emit('ranking_subscription_confirmed', {
      tournamentId,
      stageId,
      timestamp: Date.now()
    });
  }

  // Unsubscribe from ranking updates
  @SubscribeMessage('unsubscribe_rankings')
  handleUnsubscribeRankings(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RankingUnsubscriptionDto
  ): void {
    const { tournamentId } = data;
    const roomName = `tournament_${tournamentId}`;

    client.leave(roomName);

    this.logger.log(`Client ${client.id} unsubscribed from rankings for tournament: ${tournamentId}`);

    // Send acknowledgment
    client.emit('ranking_unsubscription_confirmed', {
      tournamentId,
      timestamp: Date.now()
    });
  }
  // Handle match updates (control panel -> audience display)
  @SubscribeMessage('match_update')
  handleMatchUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any // Accept any to allow fieldId
  ): void {
    this.logger.log(`Match update received: ${JSON.stringify(payload)}`);
    if (payload.fieldId) {
      // Use emitToField for field-specific updates
      this.emitToField(payload.fieldId, 'match_update', payload);

      // Also emit to tournament for history/archiving
      if (payload.tournamentId) {
        this.server.to(payload.tournamentId).emit('match_update', payload);
      }
    } else if (payload.tournamentId) {
      // fallback for legacy clients
      client.to(payload.tournamentId).emit('match_update', payload);
    }
  }  // Handle score updates (control panel -> audience display)
  @SubscribeMessage('score_update')
  handleScoreUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any
  ): void {
    this.logger.log(`Score update received: ${JSON.stringify(payload)}`);
    if (payload.fieldId) {
      // Use emitToField for field-specific updates
      this.logger.log(`Emitting score update to field: ${payload.fieldId}`);
      this.emitToField(payload.fieldId, 'score_update', payload);

      // Also emit to tournament for history/archiving
      if (payload.tournamentId) {
        this.logger.log(`Emitting score update to tournament: ${payload.tournamentId}`);
        this.server.to(payload.tournamentId).emit('score_update', payload);
      }
    } else if (payload.tournamentId) {
      this.logger.log(`Emitting score update to tournament room: ${payload.tournamentId}`);
      client.to(payload.tournamentId).emit('score_update', payload);
    } else {
      this.logger.warn('Score update received without fieldId or tournamentId:', payload);
      // Fallback: broadcast to all connected clients
      this.server.emit('score_update', payload);
    }
  }
  // Handle real-time score updates (for immediate synchronization without database persistence)
  @SubscribeMessage('scoreUpdateRealtime')
  handleRealtimeScoreUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ScoreUpdateDto
  ): void {
    this.logger.log(`Real-time score update received: ${JSON.stringify(payload)}`);

    // Validate payload type
    if (!payload || payload.type !== 'realtime') {
      this.logger.warn('Invalid real-time score update payload received');
      return;
    }

    // Prepare event data (add timestamp if not present)
    const eventData = { ...payload, timestamp: payload.timestamp || Date.now() };

    // Broadcast to all clients in the relevant field or tournament room
    if (payload.fieldId) {
      // Field-specific broadcast - use emitToField for consistent field room naming
      this.emitToField(payload.fieldId, 'scoreUpdateRealtime', eventData);
      this.logger.log(`Broadcasted scoreUpdateRealtime to field room: field:${payload.fieldId}`);

      // Also broadcast to tournament room for general monitoring
      if (payload.tournamentId) {
        this.server.to(payload.tournamentId).emit('scoreUpdateRealtime', eventData);
        this.logger.log(`Broadcasted scoreUpdateRealtime to tournament room: ${payload.tournamentId}`);
      }
    } else if (payload.tournamentId) {
      // Tournament-wide broadcast
      this.server.to(payload.tournamentId).emit('scoreUpdateRealtime', eventData);
      this.logger.log(`Broadcasted scoreUpdateRealtime to tournament room: ${payload.tournamentId}`);
    } else {
      // Fallback: broadcast to all
      this.server.emit('scoreUpdateRealtime', eventData);
      this.logger.log('Broadcasted scoreUpdateRealtime to all clients (no field/tournament specified)');
    }
    // No DB write here: this is real-time only
  }


  // Handle score persistence requests (NEW: for database saves when explicitly triggered)
  @SubscribeMessage('persistScores')
  async handlePersistScores(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PersistScoresDto
  ): Promise<WsResponse<PersistenceResultDto>> {
    this.logger.log(`Score persistence request received: ${JSON.stringify(payload)}`);

    // Validate payload type
    if (payload.type !== 'persist') {
      this.logger.warn('Invalid payload type for score persistence:', payload.type);
      const errorResponse: PersistenceResultDto = {
        matchId: payload.matchId,
        success: false,
        error: 'Invalid payload type for score persistence',
        timestamp: Date.now(),
      };
      return { event: 'persistenceResult', data: errorResponse };
    }

    try {
      // Since our create method handles both new and updates, just call create
      const result = await this.matchScoresService.create({
        matchId: payload.matchId,
        redAutoScore: payload.redAutoScore || 0,
        redDriveScore: payload.redDriveScore || 0,
        blueAutoScore: payload.blueAutoScore || 0,
        blueDriveScore: payload.blueDriveScore || 0,
        redTeamCount: payload.redTeamCount || 0,
        blueTeamCount: payload.blueTeamCount || 0,
        redGameElements: this.convertGameElementsToDto(payload.redGameElements),
        blueGameElements: this.convertGameElementsToDto(payload.blueGameElements),
        scoreDetails: payload.scoreDetails || {},
      });

      // Prepare success response
      const successResponse: PersistenceResultDto = {
        matchId: payload.matchId,
        success: true,
        data: result,
        timestamp: Date.now(),
      };

      this.logger.log(`Scores persisted successfully for match: ${payload.matchId}`);

      // Broadcast persistence success to all connected clients (except sender)
      const persistenceEvent = {
        ...payload,
        persistedAt: Date.now(),
        persistedBy: payload.submittedBy,
        success: true,
      };

      if (payload.fieldId) {
        this.emitToField(payload.fieldId, 'scoresPersisted', persistenceEvent);
        if (payload.tournamentId) {
          this.server.to(payload.tournamentId).emit('scoresPersisted', persistenceEvent);
        }
      } else if (payload.tournamentId) {
        this.server.to(payload.tournamentId).emit('scoresPersisted', persistenceEvent);
      } else {
        this.server.emit('scoresPersisted', persistenceEvent);
      }

      // Return success response directly to the requesting client
      return { event: 'persistenceResult', data: successResponse };

    } catch (error: any) {
      this.logger.error(`Failed to persist scores for match ${payload.matchId}:`, error);

      // Prepare error response
      const errorResponse: PersistenceResultDto = {
        matchId: payload.matchId,
        success: false,
        error: error.message || 'Failed to persist scores',
        timestamp: Date.now(),
      };

      // Optionally broadcast persistence failure
      const failureEvent = {
        ...payload,
        persistedAt: Date.now(),
        persistedBy: payload.submittedBy,
        success: false,
        error: error.message || 'Failed to persist scores',
      };

      if (payload.fieldId) {
        this.emitToField(payload.fieldId, 'scoresPersistenceFailed', failureEvent);
        if (payload.tournamentId) {
          this.server.to(payload.tournamentId).emit('scoresPersistenceFailed', failureEvent);
        }
      } else if (payload.tournamentId) {
        this.server.to(payload.tournamentId).emit('scoresPersistenceFailed', failureEvent);
      }

      // Return error response directly to the requesting client
      return { event: 'persistenceResult', data: errorResponse };
    }
  }

  // Handle timer updates (control panel -> audience display)
  @SubscribeMessage('timer_update')
  handleTimerUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any
  ): void {
    this.logger.log(`Timer update received: ${JSON.stringify(payload)}`);
    if (payload.fieldId) {
      // Use emitToField for field-specific updates
      this.emitToField(payload.fieldId, 'timer_update', payload);

      // Also emit to tournament for history/archiving
      if (payload.tournamentId) {
        this.server.to(payload.tournamentId).emit('timer_update', payload);
      }
    } else if (payload.tournamentId) {
      client.to(payload.tournamentId).emit('timer_update', payload);
    }
  }
  // Handle match state changes (control panel -> audience display)
  @SubscribeMessage('match_state_change')
  handleMatchStateChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any
  ): void {
    this.logger.log(`Match state change received: ${JSON.stringify(payload)}`);
    if (payload.fieldId) {
      // Use emitToField for field-specific updates
      this.emitToField(payload.fieldId, 'match_state_change', payload);

      // Also emit to tournament for history/archiving
      if (payload.tournamentId) {
        this.server.to(payload.tournamentId).emit('match_state_change', payload);
      }
    } else if (payload.tournamentId) {
      client.to(payload.tournamentId).emit('match_state_change', payload);
    }
  }

  // Handle display mode changes (control panel -> audience display)
  @SubscribeMessage('display_mode_change')
  handleDisplayModeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AudienceDisplaySettings
  ): void {
    this.logger.log(`Display mode change received: ${JSON.stringify(payload)}`);
    // Store the latest settings for this tournament
    this.audienceDisplaySettings.set(payload.tournamentId, payload);
    if (payload.tournamentId === "all") {
      // Special case: broadcast to ALL connected clients when tournamentId is "all"
      this.logger.log(`Broadcasting display mode change to ALL clients (tournamentId: "all")`);
      this.logger.log(`Total connected clients: ${this.server.sockets.sockets.size}`);
      this.server.emit('display_mode_change', payload);
    } else {
      // Broadcast to all clients in the tournament room including the sender
      this.logger.log(`Sending display mode change to tournament room: ${payload.tournamentId}`);
      this.logger.log(`Number of clients in tournament ${payload.tournamentId}: ${this.server.sockets.adapter.rooms.get(payload.tournamentId)?.size || 0}`);
      this.server.to(payload.tournamentId).emit('display_mode_change', payload);
    }
  }
    // Handle announcements (control panel -> audience display)
  @SubscribeMessage('announcement')
  handleAnnouncement(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AnnouncementData  ): void {
    this.logger.log(`Announcement received: ${JSON.stringify(payload)}`);

    // If fieldId is provided, emit to that specific field, otherwise broadcast to tournament
    if (payload.fieldId) {
      // Create a unique room ID for this field
      const fieldRoomId = `field:${payload.fieldId}`;
      this.logger.log(`Sending field-specific announcement to ${fieldRoomId}`);
      this.logger.log(`Number of clients in ${fieldRoomId}: ${this.server.sockets.adapter.rooms.get(fieldRoomId)?.size || 0}`);

      // Emit to field-specific room
      this.server.to(fieldRoomId).emit('announcement', payload);

      // Also emit to tournament for archiving/history purposes
      this.logger.log(`Also sending to tournament room: ${payload.tournamentId}`);
      this.logger.log(`Number of clients in tournament ${payload.tournamentId}: ${this.server.sockets.adapter.rooms.get(payload.tournamentId)?.size || 0}`);
      this.server.to(payload.tournamentId).emit('announcement', payload);
    } else if (payload.tournamentId === "all") {
      // Special case: broadcast to ALL connected clients when tournamentId is "all"
      this.logger.log(`Broadcasting announcement to ALL clients (tournamentId: "all")`);
      this.logger.log(`Total connected clients: ${this.server.sockets.sockets.size}`);
      this.server.emit('announcement', payload);
    } else {
      // Broadcast to all clients in the tournament room including the sender
      this.logger.log(`Sending tournament-wide announcement to: ${payload.tournamentId}`);
      this.logger.log(`Number of clients in tournament ${payload.tournamentId}: ${this.server.sockets.adapter.rooms.get(payload.tournamentId)?.size || 0}`);
      this.server.to(payload.tournamentId).emit('announcement', payload);
    }
  }
    // Start a timer for a match (control panel)
  @SubscribeMessage('start_timer')
  handleStartTimer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TimerData
  ): void {
    const { tournamentId, fieldId } = payload;

    // Clear any existing timer for this tournament
    if (this.activeTimers.has(tournamentId)) {
      clearInterval(this.activeTimers.get(tournamentId));
    }

    // Calculate the correct start time based on remaining time
    const now = Date.now();
    // If remaining is less than duration, adjust startedAt so that (now - startedAt) = (duration - remaining)
    let startTime = now;
    if (payload.remaining !== undefined && payload.remaining < payload.duration) {
      startTime = now - (payload.duration - payload.remaining);
    }
    // Store the adjusted startTime in the payload for interval calculation
    payload.startedAt = startTime;

    // Create a new timer that emits updates every second
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000) * 1000;
      const remaining = Math.max(0, payload.duration - elapsed);

      const timerUpdate: TimerData = {
        ...payload,
        remaining,
        isRunning: remaining > 0
      };

      // Broadcast timer update - if fieldId is provided, use field-specific broadcasting
      if (fieldId) {
        this.emitToField(fieldId, 'timer_update', timerUpdate);
        // Also broadcast to tournament room for general monitoring
        this.server.to(tournamentId).emit('timer_update', timerUpdate);
      } else {
        // Fallback to tournament-only broadcasting
        this.server.to(tournamentId).emit('timer_update', timerUpdate);
      }

      // Stop the timer when it reaches zero
      if (remaining <= 0) {
        clearInterval(timer);
        this.activeTimers.delete(tournamentId);
      }
    }, 1000);

    this.activeTimers.set(tournamentId, timer);
    this.logger.log(`Timer started for tournament: ${tournamentId}, field: ${fieldId || 'none'}`);

    // Initial broadcast - same logic as interval broadcast
    const initialUpdate = {
      ...payload,
      isRunning: true,
    };

    if (fieldId) {
      this.emitToField(fieldId, 'timer_update', initialUpdate);
      this.server.to(tournamentId).emit('timer_update', initialUpdate);
    } else {
      this.server.to(tournamentId).emit('timer_update', initialUpdate);
    }
  }
    // Pause a timer for a match (control panel)
  @SubscribeMessage('pause_timer')
  handlePauseTimer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TimerData
  ): void {
    const { tournamentId, fieldId } = payload;

    // Clear the active timer for this tournament
    if (this.activeTimers.has(tournamentId)) {
      clearInterval(this.activeTimers.get(tournamentId));
      this.activeTimers.delete(tournamentId);
    }

    // Broadcast the paused timer state
    const pausedUpdate = {
      ...payload,
      isRunning: false,
      pausedAt: Date.now()
    };

    if (fieldId) {
      this.emitToField(fieldId, 'timer_update', pausedUpdate);
      this.server.to(tournamentId).emit('timer_update', pausedUpdate);
    } else {
      this.server.to(tournamentId).emit('timer_update', pausedUpdate);
    }

    this.logger.log(`Timer paused for tournament: ${tournamentId}, field: ${fieldId || 'none'}`);
  }
    // Reset a timer for a match (control panel)
  @SubscribeMessage('reset_timer')
  handleResetTimer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TimerData
  ): void {
    const { tournamentId, fieldId } = payload;

    // Clear the active timer for this tournament
    if (this.activeTimers.has(tournamentId)) {
      clearInterval(this.activeTimers.get(tournamentId));
      this.activeTimers.delete(tournamentId);
    }

    // Broadcast the reset timer state
    const resetUpdate = {
      ...payload,
      remaining: payload.duration,
      isRunning: false,
      startedAt: undefined,
      pausedAt: undefined
    };

    if (fieldId) {
      this.emitToField(fieldId, 'timer_update', resetUpdate);
      this.server.to(tournamentId).emit('timer_update', resetUpdate);
    } else {
      this.server.to(tournamentId).emit('timer_update', resetUpdate);
    }

    this.logger.log(`Timer reset for tournament: ${tournamentId}, field: ${fieldId || 'none'}`);
  }

  // Broadcast a message to all connected clients in a specific tournament
  public broadcastToTournament(tournamentId: string, event: string, payload: any): void {
    this.server.to(tournamentId).emit(event, payload);
    this.logger.log(`Broadcasted ${event} to tournament ${tournamentId}: ${JSON.stringify(payload)}`);
  }

  // Broadcast a message to all connected clients
  public broadcastEvent(event: string, payload: any): void {
    this.server.emit(event, payload);
    this.logger.log(`Broadcasted ${event}: ${JSON.stringify(payload)}`);
  }

  // Add this helper for testability
  public hasActiveTimer(tournamentId: string): boolean {
    return this.activeTimers.has(tournamentId);
  }

  // --- FIELD-SPECIFIC ROOMS ---
  // Join a field-specific room
  @SubscribeMessage('joinFieldRoom')
  handleJoinFieldRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { fieldId: string }
  ): void {
    const { fieldId } = data;
    const fieldRoomId = `field:${fieldId}`;
    client.join(fieldRoomId);
    this.logger.log(`Client ${client.id} joined field room: ${fieldRoomId}`);
  }

  // Leave a field-specific room
  @SubscribeMessage('leaveFieldRoom')
  handleLeaveFieldRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { fieldId: string }
  ): void {
    const { fieldId } = data;
    const fieldRoomId = `field:${fieldId}`;
    client.leave(fieldRoomId);
    this.logger.log(`Client ${client.id} left field room: ${fieldRoomId}`);
  }

  // Emit to a field-specific room (for use by services)
  public emitToField(fieldId: string, event: string, payload: any): void {
    const fieldRoomId = `field:${fieldId}`;
    this.server.to(fieldRoomId).emit(event, payload);
    this.logger.log(`Broadcasted ${event} to ${fieldRoomId}: ${JSON.stringify(payload)}`);
  }
}