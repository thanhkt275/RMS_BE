import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../utils/prisma-types';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // No roles required, allow access
    }
    
    this.logger.debug(`Required roles: ${requiredRoles.join(', ')}`);
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      this.logger.warn('User not found in request. JWT Auth Guard might not be applied or working correctly.');
      throw new UnauthorizedException('User not authenticated');
    }
    
    this.logger.debug(`User attempting access: ${user.username}, role: ${user.role}`);
    
    // Check if the user has one of the required roles
    const hasRole = requiredRoles.includes(user.role as UserRole);
    
    if (!hasRole) {
      this.logger.warn(`Access denied: User ${user.username} with role ${user.role} does not have permission. Required roles: ${requiredRoles.join(', ')}`);
      throw new ForbiddenException(`User with role ${user.role} does not have permission to access this resource`);
    }
    
    this.logger.debug(`Access granted: User ${user.username} has required role ${user.role}`);
    return true;
  }
}