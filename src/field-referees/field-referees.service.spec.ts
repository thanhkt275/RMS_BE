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
      
      // Mock existing referee check (no existing referees) - first call
      prisma.fieldReferee.findMany
        .mockResolvedValueOnce([]) // For checking existing assignments
        .mockResolvedValueOnce(mockFieldReferees as any); // For getFieldReferees at the end
      
      // Mock transaction
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma);
      });
      
      // Mock field referee creation and retrieval
      prisma.fieldReferee.createMany.mockResolvedValue({ count: 3 });
      
      // Mock match update for head referee auto-assignment
      prisma.match.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.assignRefereesToField('field1', validAssignments);

      expect(result).toEqual(mockFieldReferees);
      // Should NOT call deleteMany since this is additive, not replacement
      expect(prisma.fieldReferee.deleteMany).not.toHaveBeenCalled();
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

      // Mock field exists
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      
      // Mock users validation
      prisma.user.findMany.mockResolvedValue(mockUsers as any);
      
      // Mock existing referee check (no existing head referee) - first call
      // Mock final getFieldReferees call - second call
      prisma.fieldReferee.findMany
        .mockResolvedValueOnce([]) // For checking existing assignments
        .mockResolvedValueOnce([]); // For getFieldReferees at the end (empty since no head ref)
      
      // Mock transaction
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma);
      });
      
      // Mock field referee creation and retrieval
      prisma.fieldReferee.createMany.mockResolvedValue({ count: 3 });
      
      // Mock match update (no head referee to assign)
      prisma.match.updateMany.mockResolvedValue({ count: 0 });

      // This should pass since assignRefereesToField is additive and doesn't enforce head referee requirement
      const result = await service.assignRefereesToField('field1', invalidAssignments);
      expect(result).toBeDefined();
    });

    it('should throw error if multiple head referees assigned', async () => {
      const invalidAssignments = [
        { userId: 'user1', isHeadRef: true },
        { userId: 'user2', isHeadRef: true },
        { userId: 'user3', isHeadRef: false },
      ];

      // Mock field exists
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      
      // Mock users validation
      prisma.user.findMany.mockResolvedValue(mockUsers as any);
      
      // Mock existing referee check (no existing referees)
      prisma.fieldReferee.findMany.mockResolvedValue([]);

      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow(BadRequestException);
      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow('Cannot assign multiple head referees');
    });

    it('should allow less than 3 referees assigned (additive behavior)', async () => {
      const validAssignments = [
        { userId: 'user1', isHeadRef: true },
        { userId: 'user2', isHeadRef: false },
      ];

      // Mock field exists
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      
      // Mock users validation
      prisma.user.findMany.mockResolvedValue([mockUsers[0], mockUsers[1]] as any);
      
      // Mock existing referee check (no existing referees) - first call
      // Mock final getFieldReferees call - second call  
      const expectedResult = [
        { id: 'fr1', fieldId: 'field1', userId: 'user1', isHeadRef: true, user: mockUsers[0] },
        { id: 'fr2', fieldId: 'field1', userId: 'user2', isHeadRef: false, user: mockUsers[1] },
      ];
      prisma.fieldReferee.findMany
        .mockResolvedValueOnce([]) // For checking existing assignments
        .mockResolvedValueOnce(expectedResult as any); // For getFieldReferees at the end
      
      // Mock transaction
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma);
      });
      
      // Mock field referee creation and retrieval
      prisma.fieldReferee.createMany.mockResolvedValue({ count: 2 });
      
      // Mock match update for head referee auto-assignment
      prisma.match.updateMany.mockResolvedValue({ count: 1 });

      // This should pass since assignRefereesToField is additive and doesn't enforce minimum count
      const result = await service.assignRefereesToField('field1', validAssignments);
      expect(result).toBeDefined();
    });

    it('should throw error if more than 4 referees total after assignment', async () => {
      const invalidAssignments = [
        { userId: 'user1', isHeadRef: true },
        { userId: 'user2', isHeadRef: false },
        { userId: 'user3', isHeadRef: false },
        { userId: 'user4', isHeadRef: false },
        { userId: 'user5', isHeadRef: false },
      ];

      // Mock field exists
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      
      // Mock users validation
      const allUsers = [
        ...mockUsers,
        { id: 'user4', role: UserRole.ALLIANCE_REFEREE },
        { id: 'user5', role: UserRole.ALLIANCE_REFEREE },
      ];
      prisma.user.findMany.mockResolvedValue(allUsers as any);
      
      // Mock existing referee check (no existing referees)
      prisma.fieldReferee.findMany.mockResolvedValue([]);

      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow(BadRequestException);
      await expect(service.assignRefereesToField('field1', invalidAssignments))
        .rejects.toThrow('Field would have 5 referees (maximum is 4)');
    });

    it('should throw error if users do not exist or have wrong roles', async () => {
      // Mock field exists
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      
      // Mock existing referee check (no existing referees)
      prisma.fieldReferee.findMany.mockResolvedValue([]);
      
      // Mock users validation - only 2 users found instead of 3
      prisma.user.findMany.mockResolvedValue([mockUsers[0], mockUsers[1]] as any);

      await expect(service.assignRefereesToField('field1', validAssignments))
        .rejects.toThrow(BadRequestException);
      await expect(service.assignRefereesToField('field1', validAssignments))
        .rejects.toThrow('One or more users are not valid referees');
    });

    it('should allow head referee without HEAD_REFEREE role (with warning)', async () => {
      // Mock field exists
      prisma.field.findUnique.mockResolvedValue(mockField as any);
      
      // Mock users with wrong role for head referee (but still a valid referee role)
      const validRoleUsers = [
        { id: 'user1', role: UserRole.ALLIANCE_REFEREE }, // ALLIANCE_REFEREE is allowed as head
        { id: 'user2', role: UserRole.ALLIANCE_REFEREE },
        { id: 'user3', role: UserRole.ALLIANCE_REFEREE },
      ];
      prisma.user.findMany.mockResolvedValue(validRoleUsers as any);
      
      // Mock existing referee check (no existing referees) - first call
      // Mock final getFieldReferees call - second call
      const expectedResult = [
        { id: 'fr1', fieldId: 'field1', userId: 'user1', isHeadRef: true, user: validRoleUsers[0] },
        { id: 'fr2', fieldId: 'field1', userId: 'user2', isHeadRef: false, user: validRoleUsers[1] },
        { id: 'fr3', fieldId: 'field1', userId: 'user3', isHeadRef: false, user: validRoleUsers[2] },
      ];
      prisma.fieldReferee.findMany
        .mockResolvedValueOnce([]) // For checking existing assignments
        .mockResolvedValueOnce(expectedResult as any); // For getFieldReferees at the end
      
      // Mock transaction
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma);
      });
      
      // Mock field referee creation and retrieval
      prisma.fieldReferee.createMany.mockResolvedValue({ count: 3 });
      
      // Mock match update for head referee auto-assignment
      prisma.match.updateMany.mockResolvedValue({ count: 2 });
      
      // Mock console.warn to verify warning is logged
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // This should pass but log a warning
      const result = await service.assignRefereesToField('field1', validAssignments);
      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: ALLIANCE_REFEREE user1 is being assigned as head referee'));
      
      consoleSpy.mockRestore();
    });

    it('should throw error if field does not exist', async () => {
      // Mock field does not exist
      prisma.field.findUnique.mockResolvedValue(null);

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

    it('should return null if referee assignment not found', async () => {
      prisma.fieldReferee.findUnique.mockResolvedValue(null);

      const result = await service.removeRefereeFromField('field1', 'user1');
      expect(result).toBeNull();
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
      
      const batchUsers = [
        { id: 'user1', role: UserRole.HEAD_REFEREE },
        { id: 'user2', role: UserRole.ALLIANCE_REFEREE },
        { id: 'user3', role: UserRole.HEAD_REFEREE },
      ];

      // Mock field validation - validates each assignment's field
      prisma.field.findUnique
        .mockResolvedValueOnce(mockField1 as any)  // field1 for assignment 1
        .mockResolvedValueOnce(mockField1 as any)  // field1 for assignment 2
        .mockResolvedValueOnce(mockField2 as any); // field2 for assignment 3
        
      // Mock field referee count checks - checks existing count for each unique field
      prisma.fieldReferee.count
        .mockResolvedValueOnce(0)  // field1 existing count
        .mockResolvedValueOnce(0); // field2 existing count
        
      // Mock users validation - checks all unique user IDs
      prisma.user.findMany.mockResolvedValue(batchUsers as any);

      // Mock transaction
      prisma.$transaction.mockResolvedValue([
        { id: 'result1' },
        { id: 'result2' },
        { id: 'result3' }
      ] as any);

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
