import { Test, TestingModule } from '@nestjs/testing';
import { StagesService } from './stages.service';
import { PrismaService } from '../prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { StageType, StageStatus } from '../utils/prisma-types';

describe('StagesService', () => {
  let service: StagesService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StagesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<StagesService>(StagesService);
    jest.clearAllMocks();
  });
  describe('create', () => {
    it('should create a stage', async () => {
      const now = new Date();
      const stage = {
        id: 's1',
        name: 'Stage 1',
        type: StageType.SWISS,
        status: StageStatus.ACTIVE,
        startDate: new Date('2025-05-13'),
        endDate: new Date('2025-05-14'),
        tournamentId: 't1',
        teamsPerAlliance: 2,
        createdAt: now,
        updatedAt: now,
      };
      const dto = { name: 'Stage 1', type: StageType.SWISS, startDate: '2025-05-13', endDate: '2025-05-14', tournamentId: 't1' };
      prisma.stage.create.mockResolvedValue(stage);
      const result = await service.create(dto as any);
      expect(result).toHaveProperty('id', 's1');
      expect(prisma.stage.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          type: dto.type,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          tournamentId: dto.tournamentId,
        },
      });
    });
    it('should throw if prisma throws', async () => {
      prisma.stage.create.mockRejectedValue(new Error('DB error'));
      await expect(service.create({} as any)).rejects.toThrow('DB error');
    });
  });
  describe('findAll', () => {
    it('should return all stages', async () => {
      const now = new Date();
      const stage = {
        id: 's1',
        name: 'Stage 1',
        type: StageType.SWISS,
        status: StageStatus.ACTIVE,
        startDate: now,
        endDate: now,
        tournamentId: 't1',
        teamsPerAlliance: 2,
        createdAt: now,
        updatedAt: now,
      };
      prisma.stage.findMany.mockResolvedValue([stage]);
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id', 's1');
    });
    it('should handle empty result', async () => {
      prisma.stage.findMany.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
    it('should throw if prisma throws', async () => {
      prisma.stage.findMany.mockRejectedValue(new Error('DB error'));
      await expect(service.findAll()).rejects.toThrow('DB error');
    });
  });
  describe('findOne', () => {
    it('should return a stage by id', async () => {
      const now = new Date();
      const stage = {
        id: 's1',
        name: 'Stage 1',
        type: StageType.SWISS,
        status: StageStatus.ACTIVE,
        startDate: now,
        endDate: now,
        tournamentId: 't1',
        teamsPerAlliance: 2,
        createdAt: now,
        updatedAt: now,
      };
      prisma.stage.findUnique.mockResolvedValue(stage);
      const result = await service.findOne('s1');
      expect(result).toHaveProperty('id', 's1');
    });
    it('should return null if not found', async () => {
      prisma.stage.findUnique.mockResolvedValue(null);
      const result = await service.findOne('notfound');
      expect(result).toBeNull();
    });
    it('should throw if prisma throws', async () => {
      prisma.stage.findUnique.mockRejectedValue(new Error('DB error'));
      await expect(service.findOne('s1')).rejects.toThrow('DB error');
    });
  });
  describe('update', () => {
    it('should update a stage', async () => {
      const now = new Date();
      const stage = {
        id: 's1',
        name: 'Updated',
        type: StageType.SWISS,
        status: StageStatus.ACTIVE,
        startDate: now,
        endDate: now,
        tournamentId: 't1',
        teamsPerAlliance: 2,
        createdAt: now,
        updatedAt: now,
      };
      prisma.stage.update.mockResolvedValue(stage);
      const result = await service.update('s1', { name: 'Updated' } as any);
      expect(result).toHaveProperty('id', 's1');
      expect(prisma.stage.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { name: 'Updated' },
      });
    });
    it('should throw if prisma throws', async () => {
      prisma.stage.update.mockRejectedValue(new Error('DB error'));
      await expect(service.update('s1', { name: 'fail' } as any)).rejects.toThrow('DB error');
    });
  });
  describe('remove', () => {
    it('should delete a stage', async () => {
      const now = new Date();
      const stage = {
        id: 's1',
        name: 'Stage 1',
        type: StageType.SWISS,
        status: StageStatus.ACTIVE,
        startDate: now,
        endDate: now,
        tournamentId: 't1',
        teamsPerAlliance: 2,
        createdAt: now,
        updatedAt: now,
      };
      prisma.stage.delete.mockResolvedValue(stage);
      const result = await service.remove('s1');
      expect(result).toHaveProperty('id', 's1');
      expect(prisma.stage.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });
    it('should throw if prisma throws', async () => {
      prisma.stage.delete.mockRejectedValue(new Error('DB error'));
      await expect(service.remove('s1')).rejects.toThrow('DB error');
    });
  });
});
