import { CreateStageSchema } from './create-stage.dto';
import { UpdateStageSchema } from './update-stage.dto';
import { StageType } from '../../utils/prisma-types';

describe('Stage DTO Validation', () => {
  describe('CreateStageSchema', () => {
    const validStageData = {
      name: 'Test Stage',
      type: StageType.SWISS,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      tournamentId: '123e4567-e89b-12d3-a456-426614174000',
    };

    it('should validate a valid stage', () => {
      const result = CreateStageSchema.safeParse(validStageData);
      expect(result.success).toBe(true);
    });

    it('should reject stage with past start date', () => {
      const invalidData = {
        ...validStageData,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      const result = CreateStageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Start date cannot be in the past');
      }
    });

    it('should reject stage with end date before start date', () => {
      const invalidData = {
        ...validStageData,
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const result = CreateStageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('End date must be after start date');
      }
    });

    it('should reject stage with duration exceeding 30 days', () => {
      const invalidData = {
        ...validStageData,
        endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000), // More than 30 days
      };

      const result = CreateStageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Stage duration cannot exceed 30 days');
      }
    });

    it('should reject stage with invalid type', () => {
      const invalidData = {
        ...validStageData,
        type: 'INVALID_TYPE' as any,
      };

      const result = CreateStageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid stage type');
      }
    });

    it('should reject stage with name too long', () => {
      const invalidData = {
        ...validStageData,
        name: 'A'.repeat(101), // Exceeds max of 100 characters
      };

      const result = CreateStageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Stage name must be less than 100 characters');
      }
    });

    it('should validate all valid stage types', () => {
      const validTypes = [
        StageType.SWISS,
        StageType.PLAYOFF,
      ];

      validTypes.forEach(type => {
        const data = { ...validStageData, type };
        const result = CreateStageSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('UpdateStageSchema', () => {
    it('should validate partial update with valid data', () => {
      const updateData = {
        name: 'Updated Stage Name',
        type: StageType.PLAYOFF,
      };

      const result = UpdateStageSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it('should reject update with invalid date range', () => {
      const invalidData = {
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const result = UpdateStageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('End date must be after start date');
      }
    });

    it('should reject update with duration exceeding 30 days', () => {
      const invalidData = {
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000), // More than 30 days
      };

      const result = UpdateStageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Stage duration cannot exceed 30 days');
      }
    });
  });
});
