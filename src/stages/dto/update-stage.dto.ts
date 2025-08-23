
import { createZodDto } from 'nestjs-zod';
import { CreateStageSchema } from './create-stage.dto';

// Define the Zod schema for stage updates - making all fields optional
export const UpdateStageSchema = CreateStageSchema.innerType().partial().refine(
  data => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
).refine(
  data => {
    if (!data.startDate || !data.endDate) return true;
    const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    return (data.endDate.getTime() - data.startDate.getTime()) <= maxDuration;
  }, {
    message: 'Stage duration cannot exceed 30 days',
    path: ['endDate'],
  }
);

// Create a DTO class from the Zod schema
export class UpdateStageDto extends createZodDto(UpdateStageSchema) {}