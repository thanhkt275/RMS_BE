import { TeamStatsService } from './team-stats.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma.service';

describe('TeamStatsService', () => {
  let service: TeamStatsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    service = new TeamStatsService(prisma as any);
    jest.clearAllMocks();
  });

  it('should do nothing if no match or teamIds', async () => {
    await expect(service.recalculateTeamStats(null as any, [])).resolves.toBeUndefined();
    await expect(service.recalculateTeamStats({ stage: { tournament: { id: 't1' } } }, [])).resolves.toBeUndefined();
    await expect(service.recalculateTeamStats(null as any, ['t1'])).resolves.toBeUndefined();
  });

  it('should handle no matches found', async () => {
    prisma.match.findMany.mockResolvedValue([]);
    prisma.teamStats.upsert.mockResolvedValue({} as any);
    const match = { stage: { tournament: { id: 'tournament1' } } } as any;
    await expect(service.recalculateTeamStats(match, ['t1', 't2'])).resolves.toBeUndefined();
    expect(prisma.match.findMany).toHaveBeenCalled();
    expect(prisma.teamStats.upsert).toHaveBeenCalledTimes(2);
  });

  it('should recalculate stats for teams with wins/losses/ties', async () => {
    prisma.match.findMany.mockResolvedValue([
      {
        id: 'm1',
        alliances: [
          { color: 'RED', teamAlliances: [{ teamId: 't1' }] },
          { color: 'BLUE', teamAlliances: [{ teamId: 't2' }] },
        ],
        winningAlliance: 'RED',
        status: 'COMPLETED',
      },
      {
        id: 'm2',
        alliances: [
          { color: 'RED', teamAlliances: [{ teamId: 't1' }] },
          { color: 'BLUE', teamAlliances: [{ teamId: 't2' }] },
        ],
        winningAlliance: null,
        status: 'COMPLETED',
      },
    ] as any);
    prisma.teamStats.findMany.mockResolvedValue([]); // Mock for calculateOpponentWinPercentage
    prisma.teamStats.upsert.mockResolvedValue({} as any);
    const match = { stage: { id: 'stage1', tournament: { id: 'tournament1' } } } as any;
    await expect(service.recalculateTeamStats(match, ['t1', 't2'])).resolves.toBeUndefined();
    expect(prisma.match.findMany).toHaveBeenCalled();
    expect(prisma.teamStats.upsert).toHaveBeenCalledTimes(2);
    const upsertCalls = prisma.teamStats.upsert.mock.calls;
    expect(upsertCalls[0][0].create).toMatchObject({ teamId: 't1', wins: 1, ties: 1, losses: 0, matchesPlayed: 2 });
    expect(upsertCalls[1][0].create).toMatchObject({ teamId: 't2', wins: 0, ties: 1, losses: 1, matchesPlayed: 2 });
  });

  it('should handle upsert errors gracefully', async () => {
    prisma.match.findMany.mockResolvedValue([
      {
        id: 'm1',
        alliances: [
          { color: 'RED', teamAlliances: [{ teamId: 't1' }] },
          { color: 'BLUE', teamAlliances: [{ teamId: 't2' }] },
        ],
        winningAlliance: 'RED',
      },
    ] as any);
    prisma.teamStats.findMany.mockResolvedValue([]); // Mock for calculateOpponentWinPercentage
    prisma.teamStats.upsert.mockRejectedValueOnce(new Error('DB error'));
    const match = { stage: { id: 'stage1', tournament: { id: 'tournament1' } } } as any;
    await expect(service.recalculateTeamStats(match, ['t1', 't2'])).rejects.toThrow('DB error');
  });

  it('should call upsert with correct tournamentId and teamId', async () => {
    prisma.match.findMany.mockResolvedValue([
      {
        id: 'm1',
        alliances: [
          { color: 'RED', teamAlliances: [{ teamId: 't1' }] },
        ],
        winningAlliance: 'RED',
      },
    ] as any);
    prisma.teamStats.findMany.mockResolvedValue([]); // Mock for calculateOpponentWinPercentage
    prisma.teamStats.upsert.mockResolvedValue({} as any);
    const match = { stage: { id: 'stage1', tournament: { id: 'tournament1' } } } as any;
    await service.recalculateTeamStats(match, ['t1']);
    expect(prisma.teamStats.upsert).toHaveBeenCalledWith({
      where: { teamId_tournamentId: { teamId: 't1', tournamentId: 'tournament1' } },
      create: expect.objectContaining({ teamId: 't1', tournamentId: 'tournament1' }),
      update: expect.objectContaining({ wins: expect.any(Number), losses: expect.any(Number), ties: expect.any(Number), matchesPlayed: expect.any(Number) }),
    });
  });

  it('should update existing team stats with new match results', async () => {
    // Simulate existing stats for t1 (1 win, 0 loss, 0 tie, 1 match played)
    prisma.match.findMany.mockResolvedValue([
      {
        id: 'm1',
        alliances: [
          { color: 'RED', teamAlliances: [{ teamId: 't1' }] },
          { color: 'BLUE', teamAlliances: [{ teamId: 't2' }] },
        ],
        winningAlliance: 'RED',
        status: 'COMPLETED',
      },
      {
        id: 'm2',
        alliances: [
          { color: 'RED', teamAlliances: [{ teamId: 't1' }] },
          { color: 'BLUE', teamAlliances: [{ teamId: 't2' }] },
        ],
        winningAlliance: 'BLUE',
        status: 'COMPLETED',
      },
    ] as any);
    prisma.teamStats.findMany.mockResolvedValue([]); // Mock for calculateOpponentWinPercentage
    prisma.teamStats.upsert.mockResolvedValue({} as any);
    const match = { stage: { id: 'stage1', tournament: { id: 'tournament1' } } } as any;
    await service.recalculateTeamStats(match, ['t1', 't2']);
    expect(prisma.teamStats.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId_tournamentId: { teamId: 't1', tournamentId: 'tournament1' } },
        create: expect.objectContaining({ teamId: 't1', wins: 1, losses: 1, ties: 0, matchesPlayed: 2 }),
        update: expect.objectContaining({ wins: 1, losses: 1, ties: 0, matchesPlayed: 2 }),
      })
    );
    expect(prisma.teamStats.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId_tournamentId: { teamId: 't2', tournamentId: 'tournament1' } },
        create: expect.objectContaining({ teamId: 't2', wins: 1, losses: 1, ties: 0, matchesPlayed: 2 }),
        update: expect.objectContaining({ wins: 1, losses: 1, ties: 0, matchesPlayed: 2 }),
      })
    );
  });
});
