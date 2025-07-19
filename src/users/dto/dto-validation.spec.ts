import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '../../../generated/prisma';
import { CreateUserSchema } from './create-user.dto';
import {
  UpdateUserSchema,
  ChangeRoleSchema,
  BulkOperationSchema,
  PasswordResetSchema,
  UserStatusSchema,
  ProfileUpdateSchema,
} from './update-user.dto';
import {
  UserQuerySchema,
  UserSearchSchema,
  UserExportSchema,
  UserImportSchema,
} from './user-query.dto';
import { UserRole, Gender } from '../../utils/prisma-types';

// Mock Prisma client to avoid database interactions
const mockPrisma = mockDeep<PrismaClient>();

// Mock implementation for database operations that might be called during validation
beforeEach(() => {
  mockPrisma.user.findUnique.mockResolvedValue(null);
  mockPrisma.user.findMany.mockResolvedValue([]);
});

describe('User DTOs Validation', () => {
  describe('CreateUserSchema', () => {
    it('should validate a valid user creation', () => {
      const validUser = {
        name: 'Valid User', // Add the required name field
        username: 'validuser123',
        password: 'ValidPass123!',
        role: UserRole.TEAM_LEADER,
        email: 'user@example.com',
        phoneNumber: '0345678932',
        gender: Gender.MALE,
        dateOfBirth: new Date('1990-01-01'),
      };

      const result = CreateUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject invalid username', () => {
      const invalidUser = {
        name: 'Test User',
        username: 'ab', // Too short
        password: 'ValidPass123!',
        role: UserRole.TEAM_LEADER,
      };

      const result = CreateUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['username'],
              message: expect.stringContaining('at least 3 characters'),
            }),
          ]),
        );
      }
    });

    it('should reject weak password', () => {
      const invalidUser = {
        name: 'Test User',
        username: 'validuser',
        password: 'weak', // Too weak
        role: UserRole.TEAM_LEADER,
      };

      const result = CreateUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['password'],
              message: expect.stringContaining('at least'),
            }),
          ]),
        );
      }
    });

    it('should reject invalid email', () => {
      const invalidUser = {
        name: 'Test User',
        username: 'validuser',
        password: 'ValidPass123!',
        role: UserRole.TEAM_LEADER,
        email: 'invalid-email',
      };

      const result = CreateUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['email'],
              message: expect.stringContaining('Invalid email'),
            }),
          ]),
        );
      }
    });

    it('should reject future date of birth', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const invalidUser = {
        name: 'Test User',
        username: 'validuser',
        password: 'ValidPass123!',
        role: UserRole.TEAM_LEADER,
        dateOfBirth: futureDate,
      };

      const result = CreateUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['dateOfBirth'],
              message: expect.stringContaining('cannot be in the future'),
            }),
          ]),
        );
      }
    });
  });

  describe('UpdateUserSchema', () => {
    it('should validate partial user updates', () => {
      // Test with just email to verify partial updates work
      const validUpdate = {
        email: 'newemail@example.com', // Valid email format
      };

      const result = UpdateUserSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate phone number in partial updates', () => {
      // Test with just phone number to verify partial updates work
      const validPhoneUpdate = {
        phoneNumber: '0123456789', // Format: starts with 0 and is 10 digits long
      };

      const result = UpdateUserSchema.safeParse(validPhoneUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone number format', () => {
      const invalidPhoneUpdate = {
        phoneNumber: '+9876543210', // Invalid format: should start with 0 and be 10 digits
      };

      const result = UpdateUserSchema.safeParse(invalidPhoneUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['phoneNumber'],
              message: expect.stringContaining(
                'Phone number must start with 0',
              ),
            }),
          ]),
        );
      }
    });

    it('should reject invalid email format', () => {
      const invalidUpdate = {
        email: 'invalid-email-format', // Invalid email format
      };

      const result = UpdateUserSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['email'],
              message: expect.stringContaining('Invalid email'),
            }),
          ]),
        );
      }
    });
  });

  describe('ChangeRoleSchema', () => {
    it('should validate role change with reason', () => {
      const validRoleChange = {
        role: UserRole.HEAD_REFEREE,
        reason: 'Promotion due to excellent performance',
      };

      const result = ChangeRoleSchema.safeParse(validRoleChange);
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const invalidRoleChange = {
        role: 'INVALID_ROLE',
        reason: 'Valid reason',
      };

      const result = ChangeRoleSchema.safeParse(invalidRoleChange);
      expect(result.success).toBe(false);
    });

    it('should reject missing reason', () => {
      const invalidRoleChange = {
        role: UserRole.HEAD_REFEREE,
        // Missing required reason
      };

      const result = ChangeRoleSchema.safeParse(invalidRoleChange);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['reason'],
              message: expect.stringContaining('Required'),
            }),
          ]),
        );
      }
    });

    it('should reject short reason', () => {
      const invalidRoleChange = {
        role: UserRole.HEAD_REFEREE,
        reason: 'Bad', // Only 3 characters - less than 5
      };

      const result = ChangeRoleSchema.safeParse(invalidRoleChange);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['reason'],
              message: expect.stringContaining('at least 5 characters'),
            }),
          ]),
        );
      }
    });
  });

  describe('BulkOperationSchema', () => {
    it('should validate bulk delete operation', () => {
      const validBulkDelete = {
        userIds: [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
        ],
        action: 'delete' as const,
        reason: 'Removing inactive test accounts',
      };

      const result = BulkOperationSchema.safeParse(validBulkDelete);
      expect(result.success).toBe(true);
    });

    it('should validate bulk role change operation', () => {
      const validBulkRoleChange = {
        userIds: [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
        ],
        action: 'changeRole' as const,
        role: UserRole.TEAM_MEMBER,
        reason: 'Updating team member roles',
      };

      const result = BulkOperationSchema.safeParse(validBulkRoleChange);
      expect(result.success).toBe(true);
    });

    it('should reject bulk role change without role', () => {
      const invalidBulkOperation = {
        userIds: ['550e8400-e29b-41d4-a716-446655440000'],
        action: 'changeRole' as const,
        // Missing role
      };

      const result = BulkOperationSchema.safeParse(invalidBulkOperation);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining(
                'Role is required when action is "changeRole"',
              ),
            }),
          ]),
        );
      }
    });

    it('should reject too many user IDs', () => {
      const tooManyIds = Array.from(
        { length: 51 },
        (_, i) =>
          `550e8400-e29b-41d4-a716-44665544${i.toString().padStart(4, '0')}`,
      );

      const invalidBulkOperation = {
        userIds: tooManyIds,
        action: 'delete' as const,
      };

      const result = BulkOperationSchema.safeParse(invalidBulkOperation);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['userIds'],
              message: expect.stringContaining('more than 50 users'),
            }),
          ]),
        );
      }
    });

    it('should reject invalid UUID format', () => {
      const invalidBulkOperation = {
        userIds: ['invalid-uuid-format'],
        action: 'delete' as const,
      };

      const result = BulkOperationSchema.safeParse(invalidBulkOperation);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['userIds', 0],
              message: expect.stringContaining('Invalid user ID format'),
            }),
          ]),
        );
      }
    });
  });

  describe('PasswordResetSchema', () => {
    it('should validate password reset', () => {
      const validPasswordReset = {
        newPassword: 'NewValidPass123!',
        confirmPassword: 'NewValidPass123!',
        reason: 'User requested password reset',
      };

      const result = PasswordResetSchema.safeParse(validPasswordReset);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const invalidPasswordReset = {
        newPassword: 'NewValidPass123!',
        confirmPassword: 'DifferentPass123!',
        reason: 'User requested password reset',
      };

      const result = PasswordResetSchema.safeParse(invalidPasswordReset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['confirmPassword'],
              message: expect.stringContaining('Passwords do not match'),
            }),
          ]),
        );
      }
    });

    it('should reject weak new password', () => {
      const invalidPasswordReset = {
        newPassword: 'weak',
        confirmPassword: 'weak',
        reason: 'User requested password reset',
      };

      const result = PasswordResetSchema.safeParse(invalidPasswordReset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['newPassword'],
              message: expect.stringContaining('at least 6 characters'),
            }),
          ]),
        );
      }
    });
  });

  describe('UserStatusSchema', () => {
    it('should validate user status change', () => {
      const validStatusChange = {
        isActive: false,
        reason: 'User violated terms of service',
      };

      const result = UserStatusSchema.safeParse(validStatusChange);
      expect(result.success).toBe(true);
    });

    it('should reject short reason', () => {
      const invalidStatusChange = {
        isActive: false,
        reason: 'Bad', // Only 3 characters - less than 5
      };

      const result = UserStatusSchema.safeParse(invalidStatusChange);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['reason'],
              message: expect.stringContaining('at least 5 characters'),
            }),
          ]),
        );
      }
    });
  });

  describe('ProfileUpdateSchema', () => {
    it('should validate profile updates', () => {
      const validProfileUpdate = {
        email: 'newemail@example.com',
        phoneNumber: '+1234567890',
        avatar: 'https://example.com/avatar.jpg',
      };

      const result = ProfileUpdateSchema.safeParse(validProfileUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject non-HTTPS avatar URL', () => {
      const invalidProfileUpdate = {
        avatar: 'http://example.com/avatar.jpg', // HTTP instead of HTTPS
      };

      const result = ProfileUpdateSchema.safeParse(invalidProfileUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['avatar'],
              message: expect.stringContaining('Avatar URL must use HTTPS'),
            }),
          ]),
        );
      }
    });

    it('should reject invalid email', () => {
      const invalidProfileUpdate = {
        email: 'invalid-email-format',
      };

      const result = ProfileUpdateSchema.safeParse(invalidProfileUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['email'],
              message: expect.stringContaining('Invalid email'),
            }),
          ]),
        );
      }
    });
  });

  describe('UserQuerySchema', () => {
    it('should validate user query parameters', () => {
      const validQuery = {
        page: 1,
        limit: 10,
        role: UserRole.ADMIN,
        search: 'john',
        isActive: true,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      };

      const result = UserQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should reject invalid page number', () => {
      const invalidQuery = {
        page: 0, // Invalid page number
        limit: 10,
      };

      const result = UserQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['page'],
              message: expect.stringContaining('Page must be at least 1'),
            }),
          ]),
        );
      }
    });

    it('should reject excessive limit', () => {
      const invalidQuery = {
        page: 1,
        limit: 101, // Exceeds maximum
      };

      const result = UserQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['limit'],
              message: expect.stringContaining('Limit cannot exceed 100'),
            }),
          ]),
        );
      }
    });

    it('should validate date range', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const invalidQuery = {
        createdAfter: futureDate,
        createdBefore: pastDate, // After is after Before
      };

      const result = UserQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['createdAfter'],
              message: expect.stringContaining('createdAfter must be before'),
            }),
          ]),
        );
      }
    });
  });

  describe('UserSearchSchema', () => {
    it('should validate search parameters', () => {
      const validSearch = {
        q: 'john doe',
        limit: 20,
        includeInactive: false,
      };

      const result = UserSearchSchema.safeParse(validSearch);
      expect(result.success).toBe(true);
    });

    it('should reject empty search query', () => {
      const invalidSearch = {
        q: '', // Empty query
      };

      const result = UserSearchSchema.safeParse(invalidSearch);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['q'],
              message: expect.stringContaining('Search query is required'),
            }),
          ]),
        );
      }
    });

    it('should reject search query with invalid characters', () => {
      const invalidSearch = {
        q: 'john<script>alert("xss")</script>', // XSS attempt
      };

      const result = UserSearchSchema.safeParse(invalidSearch);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['q'],
              message: expect.stringContaining('invalid characters'),
            }),
          ]),
        );
      }
    });
  });

  describe('UserExportSchema', () => {
    it('should validate export parameters', () => {
      const validExport = {
        role: UserRole.TEAM_LEADER,
        format: 'csv' as const,
        fields: ['id', 'username', 'email', 'role'],
        includeStats: true,
      };

      const result = UserExportSchema.safeParse(validExport);
      expect(result.success).toBe(true);
    });

    it('should reject invalid export format', () => {
      const invalidExport = {
        format: 'pdf', // Invalid format
      };

      const result = UserExportSchema.safeParse(invalidExport);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['format'],
              message: expect.stringContaining(
                'Export format must be csv, excel, or json',
              ),
            }),
          ]),
        );
      }
    });

    it('should reject invalid field names', () => {
      const invalidExport = {
        fields: ['invalid_field', 'username'],
      };

      const result = UserExportSchema.safeParse(invalidExport);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['fields', 0],
              message: expect.stringContaining('Invalid field name'),
            }),
          ]),
        );
      }
    });
  });

  describe('UserImportSchema', () => {
    it('should validate user import', () => {
      const validImport = {
        users: [
          {
            username: 'importuser1',
            email: 'import1@example.com',
            role: UserRole.TEAM_MEMBER,
          },
          {
            username: 'importuser2',
            email: 'import2@example.com',
            role: UserRole.TEAM_LEADER,
          },
        ],
        skipDuplicates: true,
        sendWelcomeEmail: false,
      };

      const result = UserImportSchema.safeParse(validImport);
      expect(result.success).toBe(true);
    });

    it('should reject too many users for import', () => {
      const tooManyUsers = Array.from({ length: 101 }, (_, i) => ({
        username: `user${i}`,
        role: UserRole.COMMON,
      }));

      const invalidImport = {
        users: tooManyUsers,
      };

      const result = UserImportSchema.safeParse(invalidImport);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['users'],
              message: expect.stringContaining(
                'Cannot import more than 100 users',
              ),
            }),
          ]),
        );
      }
    });

    it('should reject empty user list', () => {
      const invalidImport = {
        users: [],
      };

      const result = UserImportSchema.safeParse(invalidImport);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['users'],
              message: expect.stringContaining('At least one user is required'),
            }),
          ]),
        );
      }
    });

    it('should reject invalid user data in import', () => {
      const invalidImport = {
        users: [
          {
            username: 'ab', // Too short
            role: UserRole.TEAM_MEMBER,
          },
        ],
      };

      const result = UserImportSchema.safeParse(invalidImport);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['users', 0, 'username'],
              message: expect.stringContaining('at least 3 characters'),
            }),
          ]),
        );
      }
    });
  });

  // Integration tests with mock Prisma
  describe('Integration with Mock Prisma', () => {
    it('should handle database mock scenarios', async () => {
      // Mock user exists scenario
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: '550e8400-e29b-41d4-a716-446655440000',
        username: 'existinguser',
        password: 'hashed_password',
        role: UserRole.TEAM_MEMBER,
        email: 'existing@example.com',
        name: 'Existing User',
        gender: null,
        dateOfBirth: null,
        phoneNumber: '',
        isActive: true,
        lastLoginAt: null,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
      });

      // Test data that would typically be validated in a service
      const userData = {
        name: 'New Test User', // Add the required name field
        username: 'newuser123',
        password: 'ValidPass123!',
        role: UserRole.TEAM_LEADER,
        email: 'newuser@example.com',
      };

      const result = CreateUserSchema.safeParse(userData);
      expect(result.success).toBe(true);

      // Verify mock was available (not called in this test, but could be in real scenario)
      expect(mockPrisma.user.findUnique).toBeDefined();
    });

    it('should handle bulk operations without database calls', () => {
      const bulkData = {
        userIds: [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
        ],
        action: 'changeRole' as const,
        role: UserRole.HEAD_REFEREE,
        reason: 'Promoting experienced team members to referee roles',
      };

      const result = BulkOperationSchema.safeParse(bulkData);
      expect(result.success).toBe(true);

      // Verify that we can mock bulk operations without affecting real database
      expect(mockPrisma.user.updateMany).toBeDefined();
    });
  });
});
