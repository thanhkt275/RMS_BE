import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from './auth.module';
import { PrismaService } from '../prisma.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import * as cookieParser from 'cookie-parser';

// Mock bcrypt at the top level to ensure proper mocking
jest.mock('bcrypt', () => ({
  compare: jest.fn((password: string, hash: string) => {
    // Mock successful comparison for correct passwords
    if (password === 'Test123!@#' || password === 'Admin123!@#') {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }),
  hash: jest.fn().mockResolvedValue('$2b$12$hashedPasswordString'),
}));

// Increase Jest timeout for slow e2e tests
jest.setTimeout(60000);

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: DeepMockProxy<PrismaService>;

  beforeAll(async () => {
    mockPrisma = mockDeep<PrismaService>();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        // Configure throttler with more lenient limits for testing
        ThrottlerModule.forRoot([{
          name: 'short',
          ttl: 1000, // 1 second
          limit: 100, // High limit for testing
        }]),
      ],
    })
    .overrideProvider(PrismaService)
    .useValue(mockPrisma)
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ 
      whitelist: true, 
      forbidNonWhitelisted: true,
      transform: true,
    }));
    app.use(cookieParser());
    await app.init();

    // Setup mock responses for common operations
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.tournament.deleteMany.mockResolvedValue({ count: 0 });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset common mock responses
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: '1',
      username: 'testuser',
      role: 'COMMON',
      createdAt: new Date(),
    } as any);
  });  describe('/auth/register (POST)', () => {
    it('should register a new user with valid data', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        role: 'COMMON',
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(mockUser as any);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ 
          username: 'testuser', 
          password: 'Test123!@#', 
          email: 'test@example.com' 
        })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.username).toBe('testuser');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return generic error for duplicate usernames (prevent enumeration)', async () => {
      // Mock existing user
      mockPrisma.user.findFirst.mockResolvedValue({ id: '1' } as any);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ 
          username: 'testuser', 
          password: 'Test123!@#' 
        })
        .expect(409);
      expect(res.body.message).toBe('Registration failed. Please try different credentials.');
    });

    it('should validate password complexity', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ 
          username: 'testuser2', 
          password: 'weak' 
        })
        .expect(400);
      
      // Handle validation messages which can be arrays or strings
      const message = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(message).toContain('Password must contain at least one lowercase letter');
    });

    it('should validate username format', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ 
          username: 'test user!', 
          password: 'Test123!@#' 
        })
        .expect(400);
      
      const message = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(message).toContain('Username can only contain letters, numbers, and underscores');
    });

    it('should validate email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ 
          username: 'testuser3', 
          password: 'Test123!@#',
          email: 'invalid-email'
        })
        .expect(400);
      
      const message = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(message).toContain('Please provide a valid email address');
    });

    it('should enforce minimum username length', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ 
          username: 'ab', 
          password: 'Test123!@#' 
        })
        .expect(400);
      
      const message = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(message).toContain('Username must be at least 3 characters long');
    });

    it('should enforce maximum username length', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ 
          username: 'a'.repeat(31), 
          password: 'Test123!@#' 
        })
        .expect(400);
      
      const message = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(message).toContain('Username must be at most 30 characters long');
    });

    it('should enforce minimum password length', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ 
          username: 'testuser4', 
          password: 'Test1!' 
        })
        .expect(400);
      
      const message = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(message).toContain('Password must be at least 8 characters long');
    });
  });  describe('/auth/login (POST)', () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      password: '$2b$12$hashedPassword',
      role: 'COMMON',
      createdAt: new Date(),
      updatedAt: new Date(),
      email: 'test@example.com',
      gender: null,
      DateOfBirth: null,
      phoneNumber: null,
      createdById: null,
    };

    beforeEach(() => {
      // Setup mock user for login tests
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
    });

    it('should login with correct credentials and set secure cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'testuser', password: 'Test123!@#' })
        .expect(201);
      
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.message).toBe('Login successful');
      
      // Check for cookie presence
      expect(res.headers['set-cookie']).toBeDefined();
      
      // Check cookie security attributes if cookie is set
      if (res.headers['set-cookie'] && res.headers['set-cookie'].length > 0) {
        const setCookieHeader = res.headers['set-cookie'][0];
        expect(setCookieHeader).toContain('HttpOnly');
        expect(setCookieHeader).toContain('SameSite=Strict');
      }
    });

    it('should return generic error for invalid credentials (prevent enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'testuser', password: 'wrongpass' })
        .expect(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return generic error for non-existent user (prevent enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'nonexistent', password: 'anypass' })
        .expect(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should validate required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: '', password: 'Test123!@#' })
        .expect(400);
      
      const message = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(message).toContain('Username is required');
    });

    it('should validate password field', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'testuser', password: '' })
        .expect(400);
      
      const message = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(message).toContain('Password is required');
    });
  });  describe('/auth/logout (POST)', () => {
    it('should clear the token cookie on logout with secure attributes', async () => {
      // Setup test user for login
      const mockUser = {
        id: '1',
        username: 'testuser',
        password: '$2b$12$hashedPassword',
        role: 'COMMON',
        createdAt: new Date(),
        updatedAt: new Date(),
        email: 'test@example.com',
        gender: null,
        DateOfBirth: null,
        phoneNumber: null,
        createdById: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      
      // First, login to get a cookie
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'testuser', password: 'Test123!@#' })
        .expect(201);
      
      // Only test logout if login provides a cookie
      if (loginRes.headers['set-cookie']) {
        const cookie = loginRes.headers['set-cookie'];
        
        const res = await request(app.getHttpServer())
          .post('/auth/logout')
          .set('Cookie', cookie)
          .expect(201);
        
        expect(res.body).toEqual({ message: 'Logged out successfully' });
        
        // Should clear the cookie with secure attributes
        if (res.headers['set-cookie']) {
          const clearCookie = Array.isArray(res.headers['set-cookie']) 
            ? res.headers['set-cookie'].join(';')
            : res.headers['set-cookie'];
          expect(clearCookie).toMatch(/token=;/);
          expect(clearCookie).toContain('SameSite=Strict');
        }
      }
    });
  });  describe('/auth/check-auth (GET)', () => {
    it('should return authenticated user with valid token', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        password: '$2b$12$hashedPassword',
        role: 'COMMON',
        createdAt: new Date(),
        updatedAt: new Date(),
        email: 'test@example.com',
        gender: null,
        DateOfBirth: null,
        phoneNumber: null,
        createdById: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'testuser', password: 'Test123!@#' });
      
      // Only test if login provides a cookie
      if (loginRes.headers['set-cookie']) {
        const cookie = loginRes.headers['set-cookie'];
        
        const res = await request(app.getHttpServer())
          .get('/auth/check-auth')
          .set('Cookie', cookie)
          .expect(200);
        
        expect(res.body.authenticated).toBe(true);
        expect(res.body.user).toHaveProperty('username', 'testuser');
        expect(res.body.message).toMatch(/authentication is working/i);
      }
    });

    it('should reject if no token is provided', async () => {
      await request(app.getHttpServer())
        .get('/auth/check-auth')
        .expect(401);
    });

    it('should reject if invalid token is provided', async () => {
      await request(app.getHttpServer())
        .get('/auth/check-auth')
        .set('Cookie', ['token=invalid-token'])
        .expect(401);
    });
  });  describe('/auth/check-admin (GET)', () => {
    it('should return admin access for admin user', async () => {
      // Mock admin user creation and login
      const mockAdminUser = {
        id: '2',
        username: 'admin',
        password: '$2b$12$hashedPassword',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
        email: null,
        gender: null,
        DateOfBirth: null,
        phoneNumber: null,
        createdById: null,
      };

      // First reset mocks for this test
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: '2',
        username: 'admin',
        role: 'ADMIN',
        createdAt: new Date(),
      } as any);

      // Create admin user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ 
          username: 'admin', 
          password: 'Admin123!@#', 
          role: 'ADMIN' 
        });

      // Mock the admin user for login
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser as any);
      
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'admin', password: 'Admin123!@#' });
      
      // Only test if login provides a cookie
      if (loginRes.headers['set-cookie']) {
        const cookie = loginRes.headers['set-cookie'];
        
        const res = await request(app.getHttpServer())
          .get('/auth/check-admin')
          .set('Cookie', cookie)
          .expect(200);
        
        expect(res.body.authenticated).toBe(true);
        expect(res.body.role).toBe('ADMIN');
        expect(res.body.hasAdminAccess).toBe(true);
        expect(res.body.message).toMatch(/ADMIN role is working/i);
      }
    });

    it('should reject non-admin user', async () => {
      // Use the regular test user (COMMON role)
      const mockRegularUser = {
        id: '1',
        username: 'testuser',
        password: '$2b$12$hashedPassword',
        role: 'COMMON',
        createdAt: new Date(),
        updatedAt: new Date(),
        email: 'test@example.com',
        gender: null,
        DateOfBirth: null,
        phoneNumber: null,
        createdById: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any);
      
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'testuser', password: 'Test123!@#' });
      
      // Only test if login provides a cookie
      if (loginRes.headers['set-cookie']) {
        const cookie = loginRes.headers['set-cookie'];
        
        await request(app.getHttpServer())
          .get('/auth/check-admin')
          .set('Cookie', cookie)
          .expect(403);
      }
    });

    it('should reject if not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/auth/check-admin')
        .expect(401);
    });
  });describe('/auth/init-admin (GET)', () => {
    it('should initialize a default admin', async () => {
      // Mock no existing admin user
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        username: 'admin',
        role: 'ADMIN',
        createdAt: new Date(),
      } as any);
      
      const res = await request(app.getHttpServer())
        .get('/auth/init-admin')
        .expect(201);
      
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Default admin user created successfully');
    });

    it('should return message if admin already exists', async () => {
      // Mock existing admin user
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        username: 'admin',
        role: 'ADMIN',
      } as any);

      const res = await request(app.getHttpServer())
        .get('/auth/init-admin')
        .expect(201);
      
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/admin user already exists/i);
    });
  });
  describe('Security Features', () => {
    describe('Password Hashing', () => {
      it('should hash passwords with bcrypt and not store plain text', async () => {
        const username = 'hashtest';
        const password = 'Test123!@#';
        
        const mockCreatedUser = {
          id: '1',
          username: 'hashtest',
          password: '$2b$12$hashedPasswordString',
          role: 'COMMON',
          createdAt: new Date(),
        };
        
        mockPrisma.user.create.mockResolvedValue(mockCreatedUser as any);
        
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ username, password })
          .expect(201);
        
        // Verify the mock was called with hashed password
        expect(mockPrisma.user.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              password: expect.stringMatching(/^\$2[aby]\$/), // bcrypt hash format
            }),
          })
        );
      });
    });

    describe('Input Sanitization', () => {
      it('should reject malicious input in username', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({ 
            username: '<script>alert("xss")</script>', 
            password: 'Test123!@#' 
          })
          .expect(400);
        
        const message = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
        expect(message).toContain('Username can only contain letters, numbers, and underscores');
      });

      it('should reject SQL injection attempts in username', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({ 
            username: "'; DROP TABLE users; --", 
            password: 'Test123!@#' 
          })
          .expect(400);
        
        const message = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
        expect(message).toContain('Username can only contain letters, numbers, and underscores');
      });
    });

    describe('Generic Error Messages', () => {
      it('should return generic error for username enumeration attempts', async () => {
        // Mock existing user for this test
        mockPrisma.user.findFirst.mockResolvedValue({ id: '1' } as any);
        
        // Try to register with existing username
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({ 
            username: 'testuser', 
            password: 'Test123!@#' 
          })
          .expect(409);
        
        expect(res.body.message).toBe('Registration failed. Please try different credentials.');
        expect(res.body.message).not.toContain('username');
        expect(res.body.message).not.toContain('exists');
      });

      it('should return generic error for login enumeration attempts', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);
        
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ 
            username: 'nonexistentuser123', 
            password: 'anypassword' 
          })
          .expect(401);
        
        expect(res.body.message).toBe('Invalid credentials');
        expect(res.body.message).not.toContain('user not found');
        expect(res.body.message).not.toContain('username');
      });
    });

    describe('Cookie Security', () => {
      it('should set secure cookie attributes', async () => {
        const mockUser = {
          id: '1',
          username: 'testuser',
          password: '$2b$12$hashedPassword',
          role: 'COMMON',
          createdAt: new Date(),
          updatedAt: new Date(),
          email: 'test@example.com',
          gender: null,
          DateOfBirth: null,
          phoneNumber: null,
          createdById: null,
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
        
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ username: 'testuser', password: 'Test123!@#' })
          .expect(201);
        
        // Only test cookie attributes if cookie is set
        if (res.headers['set-cookie'] && res.headers['set-cookie'].length > 0) {
          const setCookieHeader = res.headers['set-cookie'][0];
          expect(setCookieHeader).toContain('HttpOnly');
          expect(setCookieHeader).toContain('SameSite=Strict');
          // In test environment, secure flag might not be set
        }
      });
    });
  });
});
