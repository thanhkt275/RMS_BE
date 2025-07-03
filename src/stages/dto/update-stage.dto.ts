
import { createZodDto } from 'nestjs-zod';
import { CreateStageSchema } from './create-stage.dto';

// Define the Zod schema for stage updates - making all fields optional
export const UpdateStageSchema = CreateStageSchema.innerType().partial().refine(
  data => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

// Create a DTO class from the Zod schema
export class UpdateStageDto extends createZodDto(UpdateStageSchema) {}