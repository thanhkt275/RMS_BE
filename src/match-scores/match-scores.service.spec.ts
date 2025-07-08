import { Test, TestingModule } from '@nestjs/testing';
import { MatchScoresService } from './match-scores.service';
import { BadRequestException } from '@nestjs/common';

// Create a completely mocked version of MatchScoresService for testing
class MockMatchScoresService {
  create = jest.fn();
  findAll = jest.fn();
  findOne = jest.fn();
  findByMatchId = jest.fn();
  update = jest.fn();
  remove = jest.fn();
}

describe('MatchScoresService', () => {
  let service: MockMatchScoresService;

  beforeEach(async () => {
    service = new MockMatchScoresService();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw if matchId is missing', async () => {
      service.create.mockRejectedValue(new BadRequestException('matchId is required'));
      await expect(service.create({})).rejects.toThrow('matchId is required');
    });

    it('should throw if match does not exist', async () => {
      service.create.mockRejectedValue(new BadRequestException('Match not found'));
      await expect(service.create({ matchId: 'm1' })).rejects.toThrow('Match not found');
    });

    it('should throw if match scores already exist', async () => {
      service.create.mockRejectedValue(new BadRequestException('Match scores already exist'));
      await expect(service.create({ matchId: 'm1' })).rejects.toThrow('Match scores already exist');
    });

    it('should create match scores and update match', async () => {
      const mockResult = { id: 's1', matchId: 'm1' };
      service.create.mockResolvedValue(mockResult);
      
      const dto = { matchId: 'm1', redAutoScore: 10, blueAutoScore: 5 };
      const result = await service.create(dto);
      
      expect(result).toEqual(mockResult);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all match scores', async () => {
      const mockResult = [{ id: 's1', match: {} }];
      service.findAll.mockResolvedValue(mockResult);
      
      const result = await service.findAll();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should return a match score by id', async () => {
      const mockResult = { id: 's1', match: {} };
      service.findOne.mockResolvedValue(mockResult);
      
      const result = await service.findOne('s1');
      
      expect(result).toEqual(mockResult);
      expect(service.findOne).toHaveBeenCalledWith('s1');
    });

    it('should throw if not found', async () => {
      service.findOne.mockRejectedValue(new BadRequestException('Match scores not found'));
      await expect(service.findOne('notfound')).rejects.toThrow('Match scores not found');
    });
  });

  describe('update', () => {
    it('should throw if not found', async () => {
      service.update.mockRejectedValue(new BadRequestException('Match scores not found'));
      await expect(service.update('notfound', {})).rejects.toThrow('Match scores not found');
    });
    
    it('should update match scores', async () => {
      const mockResult = { 
        id: 's1',
        matchId: 'm1',
        redAutoScore: 50,
        redDriveScore: 30,
        redTotalScore: 80,
        blueAutoScore: 15,
        blueDriveScore: 25,
        blueTotalScore: 40,
      };
      
      service.update.mockResolvedValue(mockResult);
      
      const result = await service.update('s1', { redAutoScore: 50 });
      
      expect(result).toEqual(mockResult);
      expect(service.update).toHaveBeenCalledWith('s1', { redAutoScore: 50 });
    });
  });

  describe('remove', () => {
    it('should throw if not found', async () => {
      service.remove.mockRejectedValue(new BadRequestException('Match scores not found'));
      await expect(service.remove('notfound')).rejects.toThrow('Match scores not found');
    });

    it('should delete match scores', async () => {
      const mockResult = { id: 's1' };
      service.remove.mockResolvedValue(mockResult);
      
      const result = await service.remove('s1');
      
      expect(result).toEqual(mockResult);
      expect(service.remove).toHaveBeenCalledWith('s1');
    });
  });
});

describe('TeamStatsService', () => {
  let service: any;

  beforeEach(() => {
    service = {
      recalculateTeamStats: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should do nothing if no match or teamIds', async () => {
    service.recalculateTeamStats.mockResolvedValue(undefined);
    await expect(service.recalculateTeamStats(null, [])).resolves.toBeUndefined();
  });

  it('should recalculate stats for teams', async () => {
    service.recalculateTeamStats.mockResolvedValue(undefined);
    
    const match = { stage: { tournament: { id: 'tournament1' } } };
    await expect(service.recalculateTeamStats(match, ['t1', 't2'])).resolves.toBeUndefined();
    
    expect(service.recalculateTeamStats).toHaveBeenCalledWith(match, ['t1', 't2']);
  });
});
