import { CreateTournamentSchema } from './create-tournament.dto';
import { UpdateTournamentSchema } from './update-tournament.dto';
import { ZodError } from 'zod';

describe('Tournament DTO Validation', () => {
  describe('CreateTournamentSchema', () => {
    const validTournamentData = {
      name: 'Test Tournament',
      description: 'A test tournament',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      adminId: '123e4567-e89b-12d3-a456-426614174000',
      numberOfFields: 5,
    };

    it('should validate a valid tournament', () => {
      const result = CreateTournamentSchema.safeParse(validTournamentData);
      expect(result.success).toBe(true);
    });

    it('should reject tournament with past start date', () => {
      const invalidData = {
        ...validTournamentData,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      const result = CreateTournamentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Start date cannot be in the past');
      }
    });

    it('should reject tournament with end date before start date', () => {
      const invalidData = {
        ...validTournamentData,
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const result = CreateTournamentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('End date must be after start date');
      }
    });

    it('should reject tournament with duration exceeding 1 year', () => {
      const invalidData = {
        ...validTournamentData,
        endDate: new Date(Date.now() + 366 * 24 * 60 * 60 * 1000), // More than 1 year
      };

      const result = CreateTournamentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Tournament duration cannot exceed 1 year');
      }
    });

    it('should reject tournament with invalid number of fields', () => {
      const invalidData = {
        ...validTournamentData,
        numberOfFields: 25, // Exceeds max of 20
      };

      const result = CreateTournamentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Number of fields cannot exceed 20');
      }
    });

    it('should reject tournament with name too long', () => {
      const invalidData = {
        ...validTournamentData,
        name: 'A'.repeat(101), // Exceeds max of 100 characters
      };

      const result = CreateTournamentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Tournament name must be less than 100 characters');
      }
    });

    it('should reject tournament with description too long', () => {
      const invalidData = {
        ...validTournamentData,
        description: 'A'.repeat(501), // Exceeds max of 500 characters
      };

      const result = CreateTournamentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Description must be less than 500 characters');
      }
    });
  });

  describe('UpdateTournamentSchema', () => {
    it('should validate partial update with valid data', () => {
      const updateData = {
        name: 'Updated Tournament Name',
        numberOfFields: 3,
      };

      const result = UpdateTournamentSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it('should reject update with invalid date range', () => {
      const invalidData = {
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const result = UpdateTournamentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('End date must be after start date');
      }
    });
  });
});
