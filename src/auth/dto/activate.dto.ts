import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const activateDto = z.object({
  token: z.string().min(1, 'Token is required'),
});

export class ActivateDto extends createZodDto(activateDto) {}
