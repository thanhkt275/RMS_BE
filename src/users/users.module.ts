import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service';
import { UserOperationGuard } from './guards/user-operation.guard';
import { ApiResponseInterceptor } from './interceptors/api-response.interceptor';
import { EmailsModule } from '../emails/emails.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key', // Use environment variable in production
      signOptions: { expiresIn: '24h' },
    }),
    EmailsModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    PrismaService,
    UserOperationGuard,
    ApiResponseInterceptor,
  ],
  exports: [UsersService],
})
export class UsersModule {}
