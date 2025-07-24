import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const BulkCreateTeamsSchema = z.object({
  tournamentId: z.string().uuid('Tournament ID must be a valid UUID'),
  count: z.number().int().min(1).max(32).refine(
    (val) => [8, 16].includes(val),
    {
      message: 'Count must be either 8 or 16 teams'
    }
  ),
  namePrefix: z.string().min(1).max(20).default('Dev Team'),
  referralSource: z.string().default('Development'),
});

export class BulkCreateTeamsDto extends createZodDto(BulkCreateTeamsSchema) {}
