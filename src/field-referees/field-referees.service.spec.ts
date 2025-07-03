import { Test, TestingModule } from '@nestjs/testing';
import { FieldRefereesService } from './field-referees.service';
import { PrismaService } from '../prisma.service';
import { BadRequestException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { UserRole } from '../utils/prisma-types';

describe('FieldRefereesService', () => {
  let service: FieldRefereesService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldRefereesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FieldRefereesService>(FieldRefereesService);
    jest.clearAllMocks();
  });

  describe('assignRefereesToField', () => {
    const validAssignments = [
      { userId: 'user1', isHeadRef: true },
      { userId: 'user2', isHeadRef: false },
      { userId: 'user3', isHeadRef: false },
    ];

    const mockUsers = [
      { id: 'user1', role: UserRole.HEAD_REFEREE },
      { id: 'user2', role: UserRole.ALLIANCE_REFEREE },
      { id: 'user3', role: UserRole.ALLIANCE_REFEREE },
    ];

    const mockField = { id: 'field1', name: 'Field 1', number: 1 };
    const mockFieldReferees = [
      { id: 'fr1', fieldId: 'field1', userId: 'user1', isHeadRef: true, user: mockUsers[0] },
      { id: 'fr2', fieldId: 'field1', userId: 'user2', isHeadRef: false, user: mockUsers[1] },
      { id: 'fr3', fieldId: 'field1', userId: 'user3', isHeadRef: false, user: mockUsers[2] },
    ];

    it('should successfully assign referees to field', async () => {
      // Mock field exists
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      
      // Mock users validation
      prisma.user.findMany.mockResolvedValue(mockUsers as any);
      
      // Mock transaction
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma);
      });
      
      // Mock field referee creation and retrieval
      prisma.fieldReferee.deleteMany.mockResolvedValue({ count: 0 });
      prisma.fieldReferee.createMany.mockResolvedValue({ count: 3 });
      prisma.fieldReferee.findMany.mockResolvedValue(mockFieldReferees as any);
      
      // Mock match update for head referee auto-assignment
      prisma.match.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.assignRefereesToField('field1', validAssignments);

      expect(result).toEqual(mockFieldReferees);
      expect(prisma.fieldReferee.deleteMany).toHaveBeenCalledWith({ where: { fieldId: 'field1' } });
      expect(prisma.fieldReferee.createMany).toHaveBeenCalledWith({
        data: [
          { fieldId: 'field1', userId: 'user1', isHeadRef: true },
          { fieldId: 'field1', userId: 'user2', isHeadRef: false },
          { fieldId: 'field1', userId: 'user3', isHeadRef: false },
        ]
      });
      expect(prisma.match.updateMany).toHaveBeenCalledWith({
        where: { fieldId: 'field1', scoredById: null },
        data: { scoredById: 'user1' }
      });
    });

    it('should throw error if no head referee assigned', async () => {
      const invalidAssignments = [
        { userId: 'user1', isHeadRef: false },
        { userId: 'user2', isHeadRef: false },
        { userId: 'user3', isHeadRef: false },
      ];

      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow(BadRequestException);
      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow('Exactly one head referee must be assigned per field');
    });

    it('should throw error if multiple head referees assigned', async () => {
      const invalidAssignments = [
        { userId: 'user1', isHeadRef: true },
        { userId: 'user2', isHeadRef: true },
        { userId: 'user3', isHeadRef: false },
      ];

      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow(BadRequestException);
      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow('Exactly one head referee must be assigned per field');
    });

    it('should throw error if less than 3 referees assigned', async () => {
      const invalidAssignments = [
        { userId: 'user1', isHeadRef: true },
        { userId: 'user2', isHeadRef: false },
      ];

      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow(BadRequestException);
      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow('Must assign 3-4 referees per field');
    });

    it('should throw error if more than 4 referees assigned', async () => {
      const invalidAssignments = [
        { userId: 'user1', isHeadRef: true },
        { userId: 'user2', isHeadRef: false },
        { userId: 'user3', isHeadRef: false },
        { userId: 'user4', isHeadRef: false },
        { userId: 'user5', isHeadRef: false },
      ];

      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow(BadRequestException);
      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow('Must assign 3-4 referees per field');
    });

    it('should throw error if users do not exist or have wrong roles', async () => {
      // Mock field exists
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      
      // Mock users validation - only 2 users found instead of 3
      prisma.user.findMany.mockResolvedValue([mockUsers[0], mockUsers[1]] as any);

      await expect(service.assignRefereesToField('field1', validAssignments))
        .rejects.toThrow(BadRequestException);
      await expect(service.assignRefereesToField('field1', validAssignments))
        .rejects.toThrow('One or more users are not valid referees');
    });

    it('should throw error if head referee does not have HEAD_REFEREE role', async () => {
      // Mock field exists
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      
      // Mock users with wrong role for head referee
      const invalidRoleUsers = [
        { id: 'user1', role: UserRole.ALLIANCE_REFEREE }, // Should be HEAD_REFEREE
        { id: 'user2', role: UserRole.ALLIANCE_REFEREE },
        { id: 'user3', role: UserRole.ALLIANCE_REFEREE },
      ];
      prisma.user.findMany.mockResolvedValue(invalidRoleUsers as any);

      await expect(service.assignRefereesToField('field1', validAssignments))
        .rejects.toThrow(BadRequestException);
      await expect(service.assignRefereesToField('field1', validAssignments))
        .rejects.toThrow('Head referee must have HEAD_REFEREE role');
    });

    it('should throw error if field does not exist', async () => {
      // Mock field does not exist
      prisma.field.findUnique.mockResolvedValue(null);
      // Mock users to avoid undefined error since validateRefereeUsers is called first
      prisma.user.findMany.mockResolvedValue(mockUsers as any);

      await expect(service.assignRefereesToField('field1', validAssignments))
        .rejects.toThrow(BadRequestException);
      await expect(service.assignRefereesToField('field1', validAssignments))
        .rejects.toThrow('Field with ID field1 not found');
    });
  });

  describe('getFieldReferees', () => {
    it('should return field referees ordered by head ref first', async () => {
      const mockFieldReferees = [
        { 
          id: 'fr1', 
          fieldId: 'field1', 
          userId: 'user1', 
          isHeadRef: true, 
          createdAt: new Date('2025-01-01'),
          user: { id: 'user1', username: 'headref', email: 'head@test.com', role: UserRole.HEAD_REFEREE }
        },
        { 
          id: 'fr2', 
          fieldId: 'field1', 
          userId: 'user2', 
          isHeadRef: false, 
          createdAt: new Date('2025-01-02'),
          user: { id: 'user2', username: 'ref1', email: 'ref1@test.com', role: UserRole.ALLIANCE_REFEREE }
        },
      ];

      prisma.fieldReferee.findMany.mockResolvedValue(mockFieldReferees as any);

      const result = await service.getFieldReferees('field1');

      expect(result).toEqual(mockFieldReferees);
      expect(prisma.fieldReferee.findMany).toHaveBeenCalledWith({
        where: { fieldId: 'field1' },
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
      });
    });
  });

  describe('removeRefereeFromField', () => {
    it('should successfully remove non-head referee', async () => {
      const mockAssignment = { id: 'fr1', fieldId: 'field1', userId: 'user1', isHeadRef: false };
      
      prisma.fieldReferee.findUnique.mockResolvedValue(mockAssignment as any);
      prisma.fieldReferee.delete.mockResolvedValue(mockAssignment as any);

      const result = await service.removeRefereeFromField('field1', 'user1');

      expect(result).toEqual(mockAssignment);
      expect(prisma.fieldReferee.delete).toHaveBeenCalledWith({
        where: { fieldId_userId: { fieldId: 'field1', userId: 'user1' } }
      });
    });

    it('should throw error if referee assignment not found', async () => {
      prisma.fieldReferee.findUnique.mockResolvedValue(null);

      await expect(service.removeRefereeFromField('field1', 'user1'))
        .rejects.toThrow(BadRequestException);
      await expect(service.removeRefereeFromField('field1', 'user1'))
        .rejects.toThrow('Referee assignment not found');
    });

    it('should throw error if trying to remove head referee with assigned matches', async () => {
      const mockAssignment = { id: 'fr1', fieldId: 'field1', userId: 'user1', isHeadRef: true };
      
      prisma.fieldReferee.findUnique.mockResolvedValue(mockAssignment as any);
      prisma.match.count.mockResolvedValue(2); // 2 matches assigned to this head referee

      await expect(service.removeRefereeFromField('field1', 'user1'))
        .rejects.toThrow(BadRequestException);
      await expect(service.removeRefereeFromField('field1', 'user1'))
        .rejects.toThrow('Cannot remove head referee: they are assigned as scorer to active matches');
    });

    it('should allow removing head referee with no assigned matches', async () => {
      const mockAssignment = { id: 'fr1', fieldId: 'field1', userId: 'user1', isHeadRef: true };
      
      prisma.fieldReferee.findUnique.mockResolvedValue(mockAssignment as any);
      prisma.match.count.mockResolvedValue(0); // No matches assigned
      prisma.fieldReferee.delete.mockResolvedValue(mockAssignment as any);

      const result = await service.removeRefereeFromField('field1', 'user1');

      expect(result).toEqual(mockAssignment);
      expect(prisma.fieldReferee.delete).toHaveBeenCalledWith({
        where: { fieldId_userId: { fieldId: 'field1', userId: 'user1' } }
      });
    });
  });

  describe('batchAssignReferees', () => {
    it('should successfully batch assign referees', async () => {
      const batchAssignments = [
        { fieldId: 'field1', userId: 'user1', isHeadRef: true },
        { fieldId: 'field1', userId: 'user2', isHeadRef: false },
        { fieldId: 'field2', userId: 'user3', isHeadRef: true },
      ];

      const mockField1 = { id: 'field1', name: 'Field 1', number: 1 };
      const mockField2 = { id: 'field2', name: 'Field 2', number: 2 };

      // Mock field validation - need to handle 3 calls (field1, field1, field2)
      prisma.field.findUnique
        .mockResolvedValueOnce(mockField1 as any)  // field1 first call
        .mockResolvedValueOnce(mockField1 as any)  // field1 second call  
        .mockResolvedValueOnce(mockField2 as any); // field2 third call

      // Mock transaction
      prisma.$transaction.mockImplementation(async (operations) => {
        return operations.map((op: any) => ({ id: 'result' }));
      });

      const result = await service.batchAssignReferees(batchAssignments);

      expect(result).toHaveLength(3);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if any field does not exist', async () => {
      const batchAssignments = [
        { fieldId: 'invalid', userId: 'user1', isHeadRef: true },
        { fieldId: 'field2', userId: 'user2', isHeadRef: false },
      ];

      // Mock first field doesn't exist - this should cause the error
      prisma.field.findUnique.mockResolvedValueOnce(null);

      await expect(service.batchAssignReferees(batchAssignments))
        .rejects.toThrow(BadRequestException);
      await expect(service.batchAssignReferees(batchAssignments))
        .rejects.toThrow('Field with ID invalid not found');
    });
  });

  describe('getAvailableReferees', () => {
    it('should return all available referees ordered by role and username', async () => {
      const mockReferees = [
        { id: 'user1', username: 'alice', email: 'alice@test.com', role: UserRole.HEAD_REFEREE },
        { id: 'user2', username: 'bob', email: 'bob@test.com', role: UserRole.ALLIANCE_REFEREE },
        { id: 'user3', username: 'charlie', email: 'charlie@test.com', role: UserRole.HEAD_REFEREE },
      ];

      prisma.user.findMany.mockResolvedValue(mockReferees as any);

      const result = await service.getAvailableReferees();

      expect(result).toEqual(mockReferees);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: {
            in: ['HEAD_REFEREE', 'ALLIANCE_REFEREE']
          }
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true
        },
        orderBy: [
          { role: 'asc' },
          { username: 'asc' }
        ]
      });
    });
  });

  describe('getRefereesByTournament', () => {
    it('should return all referees assigned to tournament fields', async () => {
      const mockReferees = [
        {
          id: 'fr1',
          fieldId: 'field1',
          userId: 'user1',
          isHeadRef: true,
          user: { id: 'user1', username: 'alice', email: 'alice@test.com', role: UserRole.HEAD_REFEREE },
          field: { id: 'field1', name: 'Field 1', number: 1 }
        },
        {
          id: 'fr2',
          fieldId: 'field2',
          userId: 'user2',
          isHeadRef: false,
          user: { id: 'user2', username: 'bob', email: 'bob@test.com', role: UserRole.ALLIANCE_REFEREE },
          field: { id: 'field2', name: 'Field 2', number: 2 }
        },
      ];

      prisma.fieldReferee.findMany.mockResolvedValue(mockReferees as any);

      const result = await service.getRefereesByTournament('tournament1');

      expect(result).toEqual(mockReferees);
      expect(prisma.fieldReferee.findMany).toHaveBeenCalledWith({
        where: {
          field: {
            tournamentId: 'tournament1'
          }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true
            }
          },
          field: {
            select: {
              id: true,
              name: true,
              number: true
            }
          }
        }
      });
    });
  });
});
