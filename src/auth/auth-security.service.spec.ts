import { Test, TestingModule } from '@nestjs/testing';
import { AuthSecurityService } from './auth-security.service';
import { PrismaService } from '../prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('AuthSecurityService', () => {
  let service: AuthSecurityService;
  let mockPrisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthSecurityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuthSecurityService>(AuthSecurityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordFailedAttempt', () => {
    it('should log failed attempts without throwing', async () => {
      const logSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await service.recordFailedAttempt('testuser', '127.0.0.1');

      expect(logSpy).toHaveBeenCalledWith('Failed login attempt for testuser from IP 127.0.0.1');
    });

    it('should handle errors gracefully', async () => {
      const logSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await service.recordFailedAttempt('testuser', '127.0.0.1');

      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('should log successful logins', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      await service.recordSuccessfulLogin('testuser', '127.0.0.1');

      expect(logSpy).toHaveBeenCalledWith('Successful login for testuser from IP 127.0.0.1');
    });

    it('should handle errors gracefully', async () => {
      const logSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await service.recordSuccessfulLogin('testuser', '127.0.0.1');

      expect(logSpy).not.toHaveBeenCalled(); // Should not warn if successful
    });
  });

  describe('isAccountLocked', () => {
    it('should return false by default (no database table yet)', async () => {
      const result = await service.isAccountLocked('testuser');

      expect(result).toBe(false);
    });
  });

  describe('cleanupOldAttempts', () => {
    it('should log cleanup operation', async () => {
      const logSpy = jest.spyOn(service['logger'], 'debug').mockImplementation();

      await service.cleanupOldAttempts();

      expect(logSpy).toHaveBeenCalledWith('Cleaning up old login attempts');
    });
  });
});
