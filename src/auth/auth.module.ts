import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma.service';
import { AuthSecurityService } from './auth-security.service';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key', // Use environment variable in production
      signOptions: { expiresIn: '24h' },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: parseInt(process.env.THROTTLE_TTL || '60000'), // 1 minute
        limit: parseInt(process.env.THROTTLE_LIMIT || '10'), // 10 requests per minute
      },
      {
        name: 'medium',
        ttl: parseInt(process.env.THROTTLE_TTL_MEDIUM || '300000'), // 5 minutes
        limit: parseInt(process.env.THROTTLE_LIMIT_MEDIUM || '50'), // 50 requests per 5 minutes
      },
    ]),
  ],
  providers: [AuthService, JwtStrategy, PrismaService, AuthSecurityService, RolesGuard],
  controllers: [AuthController],
  exports: [AuthService, AuthSecurityService],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  onModuleInit() {
    // Validate critical environment variables on startup
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
        this.logger.error('JWT_SECRET must be set to a secure value in production');
        process.exit(1);
      }
      
      if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
        this.logger.warn('ADMIN_USERNAME and ADMIN_PASSWORD should be set in production');
      }
      
      if (process.env.ADMIN_PASSWORD === 'admin123') {
        this.logger.error('Default admin password detected in production');
        process.exit(1);
      }
    } else {
      this.logger.log('Development mode: Environment validation skipped');
    }
  }
}
