import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Schema for CSV text content
export const ImportTeamsSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  format: z.enum(['csv', 'text']).default('text'),
  hasHeader: z.boolean().default(false),
  delimiter: z.string().default(','),
  tournamentId: z
    .string()
    .uuid('Invalid tournament ID format')
    .min(1, 'Tournament ID is required'),
});

// Create a DTO class from the Zod schema
export class ImportTeamsDto extends createZodDto(ImportTeamsSchema) {}
