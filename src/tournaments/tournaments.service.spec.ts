import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsService } from './tournaments.service';
import { PrismaService } from '../prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('TournamentsService', () => {
  let service: TournamentsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TournamentsService>(TournamentsService);
    jest.clearAllMocks();
  });
  describe('create', () => {
    it('should create a tournament with fields', async () => {
      const dto = { name: 'Tournament 1', description: "Test tournament using jest", location: 'City', startDate: '2025-05-13', endDate: '2025-05-14', adminId: 'admin1', numberOfFields: 2 };
      const now = new Date();
      const tournament = {
        id: 't1',
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdAt: now,
        updatedAt: now,
        adminId: dto.adminId,
        numberOfFields: dto.numberOfFields,
      };
      prisma.tournament.create.mockResolvedValue(tournament);
      prisma.field.create.mockResolvedValue({} as any);
      
      const result = await service.create(dto as any);
      
      expect(result).toHaveProperty('id', 't1');
      expect(prisma.tournament.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          adminId: dto.adminId,
          numberOfFields: dto.numberOfFields,
        },
      });
      // Should create 2 fields
      expect(prisma.field.create).toHaveBeenCalledTimes(2);
      expect(prisma.field.create).toHaveBeenCalledWith({
        data: {
          tournamentId: 't1',
          number: 1,
          name: 'Field 1',
        },
      });
      expect(prisma.field.create).toHaveBeenCalledWith({
        data: {
          tournamentId: 't1',
          number: 2,
          name: 'Field 2',
        },
      });
    });

    it('should create a tournament without fields when numberOfFields is 0', async () => {
      const dto = { name: 'Tournament 1', description: "Test tournament using jest", location: 'City', startDate: '2025-05-13', endDate: '2025-05-14', adminId: 'admin1', numberOfFields: 0 };
      const now = new Date();
      const tournament = {
        id: 't1',
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdAt: now,
        updatedAt: now,
        adminId: dto.adminId,
        numberOfFields: dto.numberOfFields,
      };
      prisma.tournament.create.mockResolvedValue(tournament);
      
      const result = await service.create(dto as any);
      
      expect(result).toHaveProperty('id', 't1');
      expect(prisma.field.create).not.toHaveBeenCalled();
    });

    it('should throw if prisma throws', async () => {
      prisma.tournament.create.mockRejectedValue(new Error('DB error'));
      await expect(service.create({} as any)).rejects.toThrow('DB error');
    });
  });

  describe('findAll', () => {
    it('should return all tournaments', async () => {
      const now = new Date();
      const tournament = {
        id: 't1',
        name: 'Tournament 1',
        description: 'desc',
        startDate: now,
        endDate: now,
        createdAt: now,
        updatedAt: now,
        adminId: 'admin1',
        numberOfFields: 2,
      };
      prisma.tournament.findMany.mockResolvedValue([tournament]);
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id', 't1');
    });
    it('should handle empty result', async () => {
      prisma.tournament.findMany.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
    it('should throw if prisma throws', async () => {
      prisma.tournament.findMany.mockRejectedValue(new Error('DB error'));
      await expect(service.findAll()).rejects.toThrow('DB error');
    });
  });

  describe('findOne', () => {
    it('should return a tournament by id', async () => {
      const now = new Date();
      const tournament = {
        id: 't1',
        name: 'Tournament 1',
        description: 'desc',
        startDate: now,
        endDate: now,
        createdAt: now,
        updatedAt: now,
        adminId: 'admin1',
        numberOfFields: 2,
      };
      prisma.tournament.findUnique.mockResolvedValue(tournament);
      const result = await service.findOne('t1');
      expect(result).toHaveProperty('id', 't1');
    });
    it('should return null if not found', async () => {
      prisma.tournament.findUnique.mockResolvedValue(null);
      const result = await service.findOne('notfound');
      expect(result).toBeNull();
    });
    it('should throw if prisma throws', async () => {
      prisma.tournament.findUnique.mockRejectedValue(new Error('DB error'));
      await expect(service.findOne('t1')).rejects.toThrow('DB error');
    });
  });

  describe('update', () => {
    it('should update a tournament', async () => {
      const now = new Date();
      const tournament = {
        id: 't1',
        name: 'Updated',
        description: 'desc',
        startDate: now,
        endDate: now,
        createdAt: now,
        updatedAt: now,
        adminId: 'admin1',
        numberOfFields: 2,
      };
      prisma.tournament.update.mockResolvedValue(tournament);
      const result = await service.update('t1', { name: 'Updated' } as any);
      expect(result).toHaveProperty('id', 't1');
      expect(prisma.tournament.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { name: 'Updated' },
      });
    });
    it('should throw if prisma throws', async () => {
      prisma.tournament.update.mockRejectedValue(new Error('DB error'));
      await expect(service.update('t1', { name: 'fail' } as any)).rejects.toThrow('DB error');
    });
  });

  describe('update (numberOfFields logic)', () => {
    it('should create new fields when numberOfFields increases', async () => {
      const now = new Date();
      const tournament = { id: 't1', name: 'T', description: '', startDate: now, endDate: now, createdAt: now, updatedAt: now, adminId: 'admin1', numberOfFields: 2 };
      prisma.tournament.update.mockResolvedValue({ ...tournament, numberOfFields: 4 });
      prisma.field.findMany.mockResolvedValue([
        { id: 'f1', tournamentId: 't1', number: 1, name: 'Field 1' },
        { id: 'f2', tournamentId: 't1', number: 2, name: 'Field 2' },
      ] as any);
      prisma.field.create.mockResolvedValue({} as any);
      const result = await service.update('t1', { numberOfFields: 4 } as any);
      expect(result.numberOfFields).toBe(4);
      expect(prisma.field.create).toHaveBeenCalledTimes(2); // fields 3 and 4
      expect(prisma.field.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ number: 3 }) }));
      expect(prisma.field.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ number: 4 }) }));
    });

    it('should delete fields when numberOfFields decreases and no matches exist', async () => {
      const now = new Date();
      const tournament = { id: 't1', name: 'T', description: '', startDate: now, endDate: now, createdAt: now, updatedAt: now, adminId: 'admin1', numberOfFields: 4 };
      prisma.tournament.update.mockResolvedValue({ ...tournament, numberOfFields: 2 });
      prisma.field.findMany.mockResolvedValue([
        { id: 'f1', tournamentId: 't1', number: 1, name: 'Field 1' },
        { id: 'f2', tournamentId: 't1', number: 2, name: 'Field 2' },
        { id: 'f3', tournamentId: 't1', number: 3, name: 'Field 3' },
        { id: 'f4', tournamentId: 't1', number: 4, name: 'Field 4' },
      ] as any);
      prisma.match.findFirst.mockResolvedValue(null); // No matches on fields to be deleted
      prisma.field.deleteMany.mockResolvedValue({ count: 2 } as any);
      const result = await service.update('t1', { numberOfFields: 2 } as any);
      expect(result.numberOfFields).toBe(2);
      expect(prisma.field.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['f3', 'f4'] } } });
    });

    it('should throw if matches exist on fields to be deleted', async () => {
      const now = new Date();
      const tournament = { id: 't1', name: 'T', description: '', startDate: now, endDate: now, createdAt: now, updatedAt: now, adminId: 'admin1', numberOfFields: 4 };
      prisma.tournament.update.mockResolvedValue({ ...tournament, numberOfFields: 2 });
      prisma.field.findMany.mockResolvedValue([
        { id: 'f1', tournamentId: 't1', number: 1, name: 'Field 1' },
        { id: 'f2', tournamentId: 't1', number: 2, name: 'Field 2' },
        { id: 'f3', tournamentId: 't1', number: 3, name: 'Field 3' },
        { id: 'f4', tournamentId: 't1', number: 4, name: 'Field 4' },
      ] as any);
      prisma.match.findFirst.mockResolvedValue({ id: 'm1' } as any); // There is a match on a field to be deleted
      await expect(service.update('t1', { numberOfFields: 2 } as any)).rejects.toThrow('Cannot decrease numberOfFields: matches are assigned to fields that would be deleted. Please reassign or remove those matches first.');
      expect(prisma.field.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a tournament', async () => {
      const now = new Date();
      const tournament = {
        id: 't1',
        name: 'Tournament 1',
        description: 'desc',
        startDate: now,
        endDate: now,
        createdAt: now,
        updatedAt: now,
        adminId: 'admin1',
        numberOfFields: 2,
      };
      prisma.tournament.delete.mockResolvedValue(tournament);
      const result = await service.remove('t1');
      expect(result).toHaveProperty('id', 't1');
      expect(prisma.tournament.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });
    it('should throw if prisma throws', async () => {
      prisma.tournament.delete.mockRejectedValue(new Error('DB error'));
      await expect(service.remove('t1')).rejects.toThrow('DB error');
    });
  });

  describe('findOneWithFullDetails', () => {
    it('should return tournament with full nested details', async () => {
      const now = new Date();
      const mockTournamentWithDetails = {
        id: 't1',
        name: 'Tournament 1',
        description: 'Test tournament',
        startDate: now,
        endDate: now,
        createdAt: now,
        updatedAt: now,
        adminId: 'admin1',
        numberOfFields: 2,
        admin: {
          id: 'admin1',
          username: 'admin',
          email: 'admin@test.com'
        },
        stages: [
          {
            id: 's1',
            name: 'Qualification',
            stageType: 'QUALIFICATION',
            status: 'PENDING',
            matches: [
              {
                id: 'm1',
                matchNumber: 1,
                status: 'PENDING',
                startTime: now
              }
            ]
          }
        ],
        fields: [
          {
            id: 'f1',
            number: 1,
            name: 'Field 1',
            fieldReferees: [
              {
                id: 'fr1',
                isHeadRef: true,
                createdAt: now,
                user: {
                  id: 'ref1',
                  username: 'headref',
                  email: 'headref@test.com',
                  role: 'HEAD_REFEREE'
                }
              }
            ],
            _count: { matches: 5 }
          }
        ],
        teams: [
          {
            id: 'team1',
            teamNumber: 1234,
            name: 'Test Team',
            organization: 'Test Org'
          }
        ],
        _count: {
          stages: 1,
          fields: 2,
          teams: 1
        }
      };

      prisma.tournament.findUnique.mockResolvedValue(mockTournamentWithDetails as any);

      const result = await service.findOneWithFullDetails('t1');

      expect(result).toEqual(mockTournamentWithDetails);
      expect(prisma.tournament.findUnique).toHaveBeenCalledWith({
        where: { id: 't1' },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          stages: {
            include: {
              matches: {
                select: {
                  id: true,
                  matchNumber: true,
                  status: true,
                  startTime: true,
                  endTime: true
                },
                orderBy: { startDate: 'asc' }
              }
            },
            orderBy: { startDate: 'asc' }
          },
          fields: {
            include: {
              fieldReferees: {
                include: {
                  user: { 
                    select: { 
                      id: true, 
                      username: true, 
                      email: true,
                      role: true 
                    } 
                  }
                },
                orderBy: [
                  { isHeadRef: 'desc' },
                  { createdAt: 'asc' }
                ]
              },
              _count: { 
                select: { 
                  matches: true
                } 
              }
            },
            orderBy: { number: 'asc' }
          },
          teams: {
            select: {
              id: true,
              teamNumber: true,
              name: true,
              organization: true
            }
          },
          _count: {
            select: {
              stages: true,
              fields: true,
              teams: true
            }
          }
        }
      });
    });

    it('should return null if tournament not found', async () => {
      prisma.tournament.findUnique.mockResolvedValue(null);

      const result = await service.findOneWithFullDetails('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle tournament with no stages, fields, or teams', async () => {
      const now = new Date();
      const mockMinimalTournament = {
        id: 't1',
        name: 'Minimal Tournament',
        description: 'Test',
        startDate: now,
        endDate: now,
        createdAt: now,
        updatedAt: now,
        adminId: 'admin1',
        numberOfFields: 0,
        admin: { id: 'admin1', username: 'admin', email: 'admin@test.com' },
        stages: [],
        fields: [],
        teams: [],
        _count: { stages: 0, fields: 0, teams: 0 }
      };

      prisma.tournament.findUnique.mockResolvedValue(mockMinimalTournament as any);

      const result = await service.findOneWithFullDetails('t1');

      expect(result).toEqual(mockMinimalTournament);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.stages).toHaveLength(0);
        expect(result.fields).toHaveLength(0);
        expect(result.teams).toHaveLength(0);
      }
    });

    it('should throw if prisma throws', async () => {
      prisma.tournament.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.findOneWithFullDetails('t1')).rejects.toThrow('DB error');
    });
  });

  describe('getFieldsWithRefereesByTournament', () => {
    it('should return fields with referees for a tournament', async () => {
      const now = new Date();
      const mockFieldsWithReferees = [
        {
          id: 'f1',
          number: 1,
          name: 'Field 1',
          tournamentId: 't1',
          fieldReferees: [
            {
              id: 'fr1',
              fieldId: 'f1',
              userId: 'ref1',
              isHeadRef: true,
              createdAt: now,
              user: {
                id: 'ref1',
                username: 'headref',
                email: 'headref@test.com',
                role: 'HEAD_REFEREE'
              }
            },
            {
              id: 'fr2',
              fieldId: 'f1',
              userId: 'ref2',
              isHeadRef: false,
              createdAt: now,
              user: {
                id: 'ref2',
                username: 'allianceref',
                email: 'allianceref@test.com',
                role: 'ALLIANCE_REFEREE'
              }
            }
          ],
          _count: { matches: 3 }
        },
        {
          id: 'f2',
          number: 2,
          name: 'Field 2',
          tournamentId: 't1',
          fieldReferees: [],
          _count: { matches: 0 }
        }
      ];

      prisma.field.findMany.mockResolvedValue(mockFieldsWithReferees as any);

      const result = await service.getFieldsWithRefereesByTournament('t1');

      expect(result).toEqual(mockFieldsWithReferees);
      expect(prisma.field.findMany).toHaveBeenCalledWith({
        where: { tournamentId: 't1' },
        include: {
          fieldReferees: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  role: true
                }
              }
            },
            orderBy: [
              { isHeadRef: 'desc' },
              { createdAt: 'asc' }
            ]
          },
          _count: {
            select: {
              matches: true
            }
          }
        },
        orderBy: { number: 'asc' }
      });
    });

    it('should return empty array if no fields exist', async () => {
      prisma.field.findMany.mockResolvedValue([]);

      const result = await service.getFieldsWithRefereesByTournament('t1');

      expect(result).toEqual([]);
    });

    it('should handle fields with no referees assigned', async () => {
      const mockFieldsNoReferees = [
        {
          id: 'f1',
          number: 1,
          name: 'Field 1',
          tournamentId: 't1',
          fieldReferees: [],
          _count: { matches: 0 }
        }
      ];

      prisma.field.findMany.mockResolvedValue(mockFieldsNoReferees as any);

      const result = await service.getFieldsWithRefereesByTournament('t1');

      expect(result).toEqual(mockFieldsNoReferees);
      expect(result[0].fieldReferees).toHaveLength(0);
    });

    it('should throw if prisma throws', async () => {
      prisma.field.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.getFieldsWithRefereesByTournament('t1')).rejects.toThrow('DB error');
    });
  });

  describe('getFieldsByTournament', () => {
    it('should return fields for a tournament', async () => {
      prisma.field.findMany.mockResolvedValue([
        { id: 'f1', tournamentId: 't1', number: 1, name: 'Field 1' },
        { id: 'f2', tournamentId: 't1', number: 2, name: 'Field 2' },
      ] as any);
      const result = await service.getFieldsByTournament('t1');
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'f1');
      expect(prisma.field.findMany).toHaveBeenCalledWith({ where: { tournamentId: 't1' }, orderBy: { number: 'asc' } });
    });
  });
});
