import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service';
import { UserOperationGuard } from './guards/user-operation.guard';
import { ApiResponseInterceptor } from './interceptors/api-response.interceptor';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService, 
    PrismaService, 
    UserOperationGuard, 
    ApiResponseInterceptor
  ],
  exports: [UsersService],
})
export class UsersModule {}