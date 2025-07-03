// Main DTOs
export * from './create-user.dto';
export * from './update-user.dto';
export * from './user-query.dto';

// Validation utilities
export * from './validation.utils';

// Re-export commonly used types for convenience
export type {
  UpdateUserDto,
  ChangeRoleDto,
  BulkOperationDto,
  PasswordResetDto,
  UserStatusDto,
  ProfileUpdateDto,
} from './update-user.dto';

export type {
  CreateUserDto,
} from './create-user.dto';

export type {
  UserQueryDto,
  UserSearchDto,
  UserExportDto,
  UserImportDto,
  UserStatsDto,
} from './user-query.dto';

// Constants for validation
export const USER_VALIDATION_CONSTANTS = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    REGEX: /^[a-zA-Z0-9_-]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    STRENGTH_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  },
  EMAIL: {
    MAX_LENGTH: 255,
  },
  PHONE: {
    REGEX: /^[\+]?[1-9][\d]{0,15}$/,
    MIN_DIGITS: 7,
    MAX_DIGITS: 15,
  },
  BULK_OPERATIONS: {
    MAX_USERS: 50,
  },
  PAGINATION: {
    MAX_LIMIT: 100,
    DEFAULT_LIMIT: 10,
  },
  SEARCH: {
    MAX_QUERY_LENGTH: 100,
    MAX_RESULTS: 50,
  },
} as const;
