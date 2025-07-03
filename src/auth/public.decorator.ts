import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public decorator to mark endpoints that should skip authentication
 * 
 * @example
 * ```typescript
 * @Get('public-endpoint')
 * @Public()
 * publicEndpoint() {
 *   return { message: 'This is public' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
