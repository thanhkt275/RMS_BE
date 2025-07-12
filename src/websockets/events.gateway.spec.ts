import { EventsGateway } from './events.gateway';
import { Logger } from '@nestjs/common';
import { MatchScoresService } from '../match-scores/match-scores.service';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let mockServer: any;
  let mockClient: any;
  let mockMatchScoresService: jest.Mocked<MatchScoresService>;

  beforeEach(() => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        adapter: {
          rooms: {
            get: jest.fn().mockReturnValue({ size: 5 }), // Mock room with 5 clients
          },
        },
        sockets: {
          size: 10, // Mock total connected clients
        },
      },
    };
    mockClient = {
      id: 'client1',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };
    
    mockMatchScoresService = {
      findByMatchId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as any;
    
    
    gateway = new EventsGateway(mockMatchScoresService);
    gateway.server = mockServer;
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should handle client connection and disconnection', () => {
    expect(() => gateway.handleConnection(mockClient)).not.toThrow();
    expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
  });

  it('should join and leave tournament rooms', () => {
    gateway.handleJoinRoom(mockClient, { tournamentId: 't1' });
    expect(mockClient.join).toHaveBeenCalledWith('t1');
    gateway.handleLeaveRoom(mockClient, { tournamentId: 't1' });
    expect(mockClient.leave).toHaveBeenCalledWith('t1');
  });
  it('should join and leave field-specific rooms', () => {
    gateway.handleJoinFieldRoom(mockClient, { fieldId: 'fieldA' });
    expect(mockClient.join).toHaveBeenCalledWith('field:fieldA');
    gateway.handleLeaveFieldRoom(mockClient, { fieldId: 'fieldA' });
    expect(mockClient.leave).toHaveBeenCalledWith('field:fieldA');
  });
  it('should emit to field-specific room using emitToField', () => {
    gateway.emitToField('fieldA', 'match_update', { foo: 123 });
    expect(mockServer.to).toHaveBeenCalledWith('field:fieldA');
    expect(mockServer.to().emit).toHaveBeenCalledWith('match_update', { foo: 123 });
  });

  it('should emit display_mode_change on join if settings exist', () => {
    const settings = { tournamentId: 't1', displayMode: 'match', updatedAt: Date.now() };
    (gateway as any).audienceDisplaySettings.set('t1', settings as any);
    gateway.handleJoinRoom(mockClient, { tournamentId: 't1' });
    expect(mockClient.emit).toHaveBeenCalledWith('display_mode_change', settings);
  });

  it('should broadcast match, score, timer, match state, display mode, and announcement updates', () => {
    const payload = { tournamentId: 't1' };
    gateway.handleMatchUpdate(mockClient, payload as any);
    expect(mockClient.to).toHaveBeenCalledWith('t1');
    expect(mockClient.to().emit).toHaveBeenCalledWith('match_update', payload);

    gateway.handleScoreUpdate(mockClient, payload as any);
    expect(mockClient.to().emit).toHaveBeenCalledWith('score_update', payload);

    gateway.handleTimerUpdate(mockClient, payload as any);
    expect(mockClient.to().emit).toHaveBeenCalledWith('timer_update', payload);

    gateway.handleMatchStateChange(mockClient, payload as any);
    expect(mockClient.to().emit).toHaveBeenCalledWith('match_state_change', payload);

    gateway.handleDisplayModeChange(mockClient, { ...payload, displayMode: 'match', updatedAt: Date.now() } as any);
    expect(mockServer.to).toHaveBeenCalledWith('t1');
    expect(mockServer.to().emit).toHaveBeenCalledWith('display_mode_change', expect.objectContaining({ tournamentId: 't1' }));

    gateway.handleAnnouncement(mockClient, payload as any);
    expect(mockServer.to).toHaveBeenCalledWith('t1');
    expect(mockServer.to().emit).toHaveBeenCalledWith('announcement', payload);
  });
  it('should start, pause, and reset timers correctly', () => {
    jest.useFakeTimers();
    const payload = { tournamentId: 't1', duration: 2000, remaining: 2000, isRunning: false };
    gateway.handleStartTimer(mockClient, { ...payload });
    expect(gateway.hasActiveTimer('t1')).toBe(true);
    expect(mockServer.to().emit).toHaveBeenCalledWith('timer_update', expect.objectContaining({ tournamentId: 't1', isRunning: true }));
    jest.advanceTimersByTime(2000);
    jest.runOnlyPendingTimers();
    expect(gateway.hasActiveTimer('t1')).toBe(false);
    gateway.handlePauseTimer(mockClient, payload);
    expect(mockServer.to().emit).toHaveBeenCalledWith('timer_update', expect.objectContaining({ isRunning: false }));
    gateway.handleResetTimer(mockClient, payload);
    expect(mockServer.to().emit).toHaveBeenCalledWith('timer_update', expect.objectContaining({ remaining: 2000, isRunning: false }));
    jest.useRealTimers();
  });

  it('should start, pause, and reset timers with field-specific broadcasting', () => {
    jest.useFakeTimers();
    const payload = { tournamentId: 't1', fieldId: 'fieldA', duration: 2000, remaining: 2000, isRunning: false };
    
    // Test start timer with fieldId
    gateway.handleStartTimer(mockClient, { ...payload });
    expect(gateway.hasActiveTimer('t1')).toBe(true);
    expect(mockServer.to).toHaveBeenCalledWith('field:fieldA');
    expect(mockServer.to().emit).toHaveBeenCalledWith('timer_update', expect.objectContaining({ 
      tournamentId: 't1', 
      fieldId: 'fieldA', 
      isRunning: true 
    }));
    
    // Test pause timer with fieldId
    gateway.handlePauseTimer(mockClient, payload);
    expect(mockServer.to).toHaveBeenCalledWith('field:fieldA');
    expect(mockServer.to().emit).toHaveBeenCalledWith('timer_update', expect.objectContaining({ 
      isRunning: false,
      fieldId: 'fieldA'
    }));
    
    // Test reset timer with fieldId
    gateway.handleResetTimer(mockClient, payload);
    expect(mockServer.to).toHaveBeenCalledWith('field:fieldA');
    expect(mockServer.to().emit).toHaveBeenCalledWith('timer_update', expect.objectContaining({ 
      remaining: 2000, 
      isRunning: false,
      fieldId: 'fieldA'
    }));
    
    jest.useRealTimers();
  });

  it('should broadcast to tournament and all clients', () => {
    gateway.broadcastToTournament('t1', 'event', { foo: 1 });
    expect(mockServer.to).toHaveBeenCalledWith('t1');
    expect(mockServer.to().emit).toHaveBeenCalledWith('event', { foo: 1 });
    gateway.broadcastEvent('event', { bar: 2 });
    expect(mockServer.emit).toHaveBeenCalledWith('event', { bar: 2 });
  });

  it('should clear previous timers on start, pause, and reset', () => {
    jest.useFakeTimers();
    const payload = { tournamentId: 't1', duration: 1000, remaining: 1000, isRunning: false };
    gateway.handleStartTimer(mockClient, payload);
    expect(gateway.hasActiveTimer('t1')).toBe(true);
    gateway.handleStartTimer(mockClient, payload);
    expect(gateway.hasActiveTimer('t1')).toBe(true);
    gateway.handlePauseTimer(mockClient, payload);
    expect(gateway.hasActiveTimer('t1')).toBe(false);
    gateway.handleStartTimer(mockClient, payload);
    gateway.handleResetTimer(mockClient, payload);
    expect(gateway.hasActiveTimer('t1')).toBe(false);
    jest.useRealTimers();
  });

  it('should handle edge cases for timer start (remaining < duration)', () => {
    jest.useFakeTimers();
    const payload = { tournamentId: 't1', duration: 5000, remaining: 3000, isRunning: false };
    gateway.handleStartTimer(mockClient, payload);
    expect(gateway.hasActiveTimer('t1')).toBe(true);
    jest.useRealTimers();
  });
  it('should emit match, score, timer, and match state updates to field-specific room if fieldId is present', () => {
    const payload = { fieldId: 'fieldA', tournamentId: 't1', foo: 42 };
    gateway.handleMatchUpdate(mockClient, payload);
    expect(mockServer.to).toHaveBeenCalledWith('field:fieldA');
    expect(mockServer.to().emit).toHaveBeenCalledWith('match_update', payload);

    gateway.handleScoreUpdate(mockClient, payload);
    expect(mockServer.to).toHaveBeenCalledWith('field:fieldA');
    expect(mockServer.to().emit).toHaveBeenCalledWith('score_update', payload);

    gateway.handleTimerUpdate(mockClient, payload);
    expect(mockServer.to).toHaveBeenCalledWith('field:fieldA');
    expect(mockServer.to().emit).toHaveBeenCalledWith('timer_update', payload);

    gateway.handleMatchStateChange(mockClient, payload);
    expect(mockServer.to).toHaveBeenCalledWith('field:fieldA');
    expect(mockServer.to().emit).toHaveBeenCalledWith('match_state_change', payload);
  });

  it('should fallback to tournament room if only tournamentId is present', () => {
    const payload = { tournamentId: 't1', foo: 99 };
    gateway.handleMatchUpdate(mockClient, payload);
    expect(mockClient.to).toHaveBeenCalledWith('t1');
    expect(mockClient.to().emit).toHaveBeenCalledWith('match_update', payload);

    gateway.handleScoreUpdate(mockClient, payload);
    expect(mockClient.to).toHaveBeenCalledWith('t1');
    expect(mockClient.to().emit).toHaveBeenCalledWith('score_update', payload);

    gateway.handleTimerUpdate(mockClient, payload);
    expect(mockClient.to).toHaveBeenCalledWith('t1');
    expect(mockClient.to().emit).toHaveBeenCalledWith('timer_update', payload);

    gateway.handleMatchStateChange(mockClient, payload);
    expect(mockClient.to).toHaveBeenCalledWith('t1');
    expect(mockClient.to().emit).toHaveBeenCalledWith('match_state_change', payload);
  });

  // Tests for new real-time score synchronization functionality
  describe('Real-time Score Synchronization', () => {
    describe('scoreUpdateRealtime handler', () => {
      it('should broadcast real-time score updates with field-specific routing', () => {
        const payload = {
          type: 'realtime' as const,
          matchId: 'match1',
          fieldId: 'fieldA',
          tournamentId: 't1',
          redAutoScore: 10,
          blueAutoScore: 8,
          redGameElements: { ball: 3, cube: 2 },
          blueGameElements: { ball: 2, cube: 3 },
          timestamp: Date.now(),
        };        gateway.handleRealtimeScoreUpdate(mockClient, payload);

        // Should emit to field-specific room first
        expect(mockServer.to).toHaveBeenCalledWith('field:fieldA');
        expect(mockServer.to().emit).toHaveBeenCalledWith('scoreUpdateRealtime', expect.objectContaining({
          ...payload,
          timestamp: expect.any(Number),
        }));
        
        // Should also emit to tournament room
        expect(mockServer.to).toHaveBeenCalledWith('t1');
        expect(mockServer.to().emit).toHaveBeenCalledWith('scoreUpdateRealtime', expect.objectContaining({
          ...payload,
          timestamp: expect.any(Number),
        }));
      });      it('should broadcast real-time score updates to tournament room when no fieldId', () => {
        const payload = {
          type: 'realtime' as const,
          matchId: 'match1',
          tournamentId: 't1',
          redAutoScore: 10,
          blueAutoScore: 8,
          timestamp: Date.now(),
        };        gateway.handleRealtimeScoreUpdate(mockClient, payload);

        // Should emit to tournament room only
        expect(mockServer.to).toHaveBeenCalledWith('t1');
        expect(mockServer.to().emit).toHaveBeenCalledWith('scoreUpdateRealtime', expect.objectContaining({
          ...payload,
          timestamp: expect.any(Number),
        }));
      });      it('should broadcast to all clients when no field or tournament ID', () => {
        const payload = {
          type: 'realtime' as const,
          matchId: 'match1',
          redAutoScore: 10,
          blueAutoScore: 8,
          timestamp: Date.now(),
        };

        gateway.handleRealtimeScoreUpdate(mockClient, payload);

        // Should emit to all clients
        expect(mockServer.emit).toHaveBeenCalledWith('scoreUpdateRealtime', expect.objectContaining({
          ...payload,
          timestamp: expect.any(Number),
        }));
      });
    });

    describe('persistScores handler', () => {
      it('should create new scores when none exist', async () => {
        const payload = {
          type: 'persist' as const,
          matchId: 'match1',
          fieldId: 'fieldA',
          tournamentId: 't1',
          redAutoScore: 10,
          blueAutoScore: 8,
          redGameElements: { ball: 3, cube: 2 },
          blueGameElements: { ball: 2, cube: 3 },
          finalScores: true,
          submittedBy: 'referee1',
          timestamp: Date.now(),
        };

        const createdScores = { id: 'score1', ...payload };
        mockMatchScoresService.create.mockResolvedValueOnce(createdScores as any);

        await gateway.handlePersistScores(mockClient, payload);

        // Should not check for existing scores - create method handles upsert internally
        expect(mockMatchScoresService.findByMatchId).not.toHaveBeenCalled();
        // Should create new scores with converted game elements
        expect(mockMatchScoresService.create).toHaveBeenCalledWith({
          matchId: 'match1',
          redAutoScore: 10,
          redDriveScore: 0,
          blueAutoScore: 8,
          blueDriveScore: 0,
          redTeamCount: 0,
          blueTeamCount: 0,
          redGameElements: [
            { element: 'ball', count: 3, pointsEach: 1, totalPoints: 3, operation: 'multiply' },
            { element: 'cube', count: 2, pointsEach: 1, totalPoints: 2, operation: 'multiply' }
          ],
          blueGameElements: [
            { element: 'ball', count: 2, pointsEach: 1, totalPoints: 2, operation: 'multiply' },
            { element: 'cube', count: 3, pointsEach: 1, totalPoints: 3, operation: 'multiply' }
          ],
          scoreDetails: {},
        });

        // The method returns the response instead of calling client.emit
        // Success response is returned by the method for framework to handle

        // Should broadcast persistence success to field and tournament
        expect(mockServer.to).toHaveBeenCalledWith('field:fieldA');
        expect(mockServer.to().emit).toHaveBeenCalledWith('scoresPersisted', expect.objectContaining({
          matchId: 'match1',
          persistedBy: 'referee1',
          success: true,
        }));
      });

      it('should create/update scores using create method (upsert behavior)', async () => {
        const payload = {
          type: 'persist' as const,
          matchId: 'match1',
          tournamentId: 't1',
          redAutoScore: 15,
          blueAutoScore: 12,
          redGameElements: { ball: 4 },
          finalScores: false,
          submittedBy: 'referee1',
          timestamp: Date.now(),
        };

        const resultScores = { id: 'score1', ...payload };
        mockMatchScoresService.create.mockResolvedValueOnce(resultScores as any);

        await gateway.handlePersistScores(mockClient, payload);

        // Should not check for existing scores - create method handles upsert internally
        expect(mockMatchScoresService.findByMatchId).not.toHaveBeenCalled();
        
        // Should call create method with converted game elements (create handles upsert internally)
        expect(mockMatchScoresService.create).toHaveBeenCalledWith({
          matchId: 'match1',
          redAutoScore: 15,
          redDriveScore: 0,
          blueAutoScore: 12,
          blueDriveScore: 0,
          redTeamCount: 0,
          blueTeamCount: 0,
          redGameElements: [
            { element: 'ball', count: 4, pointsEach: 1, totalPoints: 4, operation: 'multiply' }
          ],
          blueGameElements: [],
          scoreDetails: {},
        });

        // Should emit success response
        // Note: The method returns the response instead of calling client.emit directly
      });

      it('should handle persistence errors gracefully', async () => {
        const payload = {
          type: 'persist' as const,
          matchId: 'match1',
          tournamentId: 't1',
          finalScores: true,
          submittedBy: 'referee1',
          timestamp: Date.now(),
        };

        const errorMessage = 'Database connection failed';
        mockMatchScoresService.create.mockRejectedValueOnce(new Error(errorMessage));

        await gateway.handlePersistScores(mockClient, payload);

        // Should not check for existing scores - create method handles upsert internally
        expect(mockMatchScoresService.findByMatchId).not.toHaveBeenCalled();

        // Should emit error response to client
        // Note: The method returns the response instead of calling client.emit directly

        // Should broadcast persistence failure
        expect(mockServer.to).toHaveBeenCalledWith('t1');
        expect(mockServer.to().emit).toHaveBeenCalledWith('scoresPersistenceFailed', expect.objectContaining({
          matchId: 'match1',
          persistedBy: 'referee1',
          success: false,
          error: errorMessage,
        }));
      });

      it('should handle field-specific persistence broadcasting', async () => {
        const payload = {
          type: 'persist' as const,
          matchId: 'match1',
          fieldId: 'fieldB',
          tournamentId: 't1',
          finalScores: true,
          submittedBy: 'referee1',
          timestamp: Date.now(),
        };

        const createdScores = { id: 'score1', ...payload };
        mockMatchScoresService.create.mockResolvedValueOnce(createdScores as any);

        await gateway.handlePersistScores(mockClient, payload);

        // Should broadcast to field-specific room
        expect(mockServer.to).toHaveBeenCalledWith('field:fieldB');
        expect(mockServer.to().emit).toHaveBeenCalledWith('scoresPersisted', expect.objectContaining({
          fieldId: 'fieldB',
          tournamentId: 't1',
        }));

        // Should also broadcast to tournament room
        expect(mockServer.to).toHaveBeenCalledWith('t1');
        expect(mockServer.to().emit).toHaveBeenCalledWith('scoresPersisted', expect.any(Object));
      });
    });

    describe('Game Elements Conversion Helpers', () => {
      it('should convert Record<string, number> to GameElementDto[]', () => {
        const gameElements = { ball: 3, cube: 2, cone: 1 };
        const result = (gateway as any).convertGameElementsToDto(gameElements);

        expect(result).toEqual([
          { element: 'ball', count: 3, pointsEach: 1, totalPoints: 3, operation: 'multiply' },
          { element: 'cube', count: 2, pointsEach: 1, totalPoints: 2, operation: 'multiply' },
          { element: 'cone', count: 1, pointsEach: 1, totalPoints: 1, operation: 'multiply' },
        ]);
      });

      it('should return empty array when gameElements is undefined', () => {
        const result = (gateway as any).convertGameElementsToDto(undefined);
        expect(result).toEqual([]);
      });

      it('should return empty array when gameElements is empty object', () => {
        const result = (gateway as any).convertGameElementsToDto({});
        expect(result).toEqual([]);
      });

      it('should convert GameElementDto[] to Record<string, number>', () => {
        const gameElements = [
          { element: 'ball', count: 3, pointsEach: 2, totalPoints: 6, operation: 'multiply' },
          { element: 'cube', count: 2, pointsEach: 1, totalPoints: 2, operation: 'add' },
        ];
        const result = (gateway as any).convertDtoToGameElements(gameElements);

        expect(result).toEqual({
          ball: 3,
          cube: 2,
        });
      });

      it('should return empty object when gameElements array is undefined', () => {
        const result = (gateway as any).convertDtoToGameElements(undefined);
        expect(result).toEqual({});
      });

      it('should return empty object when gameElements array is empty', () => {
        const result = (gateway as any).convertDtoToGameElements([]);
        expect(result).toEqual({});
      });
    });
  });
});
