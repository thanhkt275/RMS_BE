import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Define the Zod schema for tournament creation
export const CreateTournamentSchema = z.object({
  name: z.string().min(1, 'Tournament name is required').max(100, 'Tournament name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  startDate: z.coerce.date().refine(date => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: 'Start date cannot be in the past',
  }),
  endDate: z.coerce.date(),
  adminId: z.string().uuid('Admin ID must be a valid UUID'),
  numberOfFields: z.coerce.number().int().min(1, 'Number of fields must be at least 1').max(20, 'Number of fields cannot exceed 20').default(1),
}).refine(data => data.startDate <= data.endDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine(data => {
  const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
  return (data.endDate.getTime() - data.startDate.getTime()) <= maxDuration;
}, {
  message: 'Tournament duration cannot exceed 1 year',
  path: ['endDate'],
});

// Create a DTO class from the Zod schema
export class CreateTournamentDto extends createZodDto(CreateTournamentSchema) {}