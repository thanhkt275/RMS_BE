import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard to validate user operations and prevent dangerous actions
 */
@Injectable()
export class UserOperationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const currentUserId = request.user?.['sub'];
    const targetUserId = request.params?.id;
    const body = request.body;

    // Prevent users from performing dangerous operations on themselves
    if (this.isDangerousOperation(request) && currentUserId === targetUserId) {
      throw new BadRequestException(this.getDangerousOperationMessage(request));
    }

    // Validate bulk operations
    if (this.isBulkOperation(request)) {
      this.validateBulkOperation(request, currentUserId);
    }

    return true;
  }

  private isDangerousOperation(request: Request): boolean {
    const method = request.method;
    const path = request.path;

    // Check for role changes or deletions
    return (
      (method === 'DELETE') ||
      (method === 'PATCH' && path.includes('/role'))
    );
  }

  private getDangerousOperationMessage(request: Request): string {
    if (request.method === 'DELETE') {
      return 'Cannot delete your own account';
    }
    if (request.path.includes('/role')) {
      return 'Cannot change your own role';
    }
    return 'Cannot perform this operation on your own account';
  }

  private isBulkOperation(request: Request): boolean {
    return request.path.includes('bulk-');
  }

  private validateBulkOperation(request: Request, currentUserId: string): void {
    const body = request.body;
    
    if (!body.userIds || !Array.isArray(body.userIds)) {
      throw new BadRequestException('Invalid user IDs for bulk operation');
    }

    // Prevent bulk operations on self
    if (body.userIds.includes(currentUserId)) {
      if (request.path.includes('bulk-delete')) {
        throw new BadRequestException('Cannot delete your own account in bulk operation');
      }
      if (request.path.includes('bulk-role')) {
        throw new BadRequestException('Cannot change your own role in bulk operation');
      }
    }
  }
}
