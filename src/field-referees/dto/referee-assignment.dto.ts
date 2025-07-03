import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Individual referee assignment schema
export const RefereeAssignmentSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  isHeadRef: z.boolean()
});

// Batch referee assignment schema
export const BatchRefereeAssignmentSchema = z.object({
  fieldId: z.string().uuid('Field ID must be a valid UUID'),
  userId: z.string().uuid('User ID must be a valid UUID'),
  isHeadRef: z.boolean()
});

// Field referee assignment request schema
export const AssignRefereesSchema = z.object({
  referees: z.array(RefereeAssignmentSchema)
    .max(4, 'Maximum 4 referees can be assigned')
}).refine(
  data => data.referees.filter(ref => ref.isHeadRef).length <= 1,
  {
    message: 'At most one head referee can be designated',
    path: ['referees'],
  }
);

// Batch assignment request schema
export const BatchAssignRefereesSchema = z.object({
  assignments: z.array(BatchRefereeAssignmentSchema)
    .min(1, 'At least one assignment is required')
});

// Create DTO classes from the Zod schemas
export class RefereeAssignmentDto extends createZodDto(RefereeAssignmentSchema) {}
export class BatchRefereeAssignmentDto extends createZodDto(BatchRefereeAssignmentSchema) {}
export class AssignRefereesDto extends createZodDto(AssignRefereesSchema) {}
export class BatchAssignRefereesDto extends createZodDto(BatchAssignRefereesSchema) {}

// Export types for use in services
export type RefereeAssignment = z.infer<typeof RefereeAssignmentSchema>;
export type BatchRefereeAssignment = z.infer<typeof BatchRefereeAssignmentSchema>;
