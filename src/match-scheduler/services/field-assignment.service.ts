import { Injectable } from '@nestjs/common';
import { Field } from '../../utils/prisma-types';

/**
 * Service responsible for field assignment logic
 * Implements Single Responsibility Principle by focusing only on field management
 */
@Injectable()
export class FieldAssignmentService {
  
  /**
   * Assigns a field to a match using load balancing
   * @param fields Available fields for the tournament
   * @param fieldAssignmentCounts Current assignment counts for each field
   * @returns Selected field and updated counts
   */
  assignField(
    fields: Field[], 
    fieldAssignmentCounts: number[]
  ): { field: Field; updatedCounts: number[] } {
    if (!fields || fields.length === 0) {
      throw new Error('No fields available for assignment');
    }

    if (fieldAssignmentCounts.length !== fields.length) {
      throw new Error('Field assignment counts array length must match fields array length');
    }

    // Find the minimum assignment count
    const minCount = Math.min(...fieldAssignmentCounts);
    
    // Get all fields with the minimum assignment count
    const candidateIndexes = fieldAssignmentCounts
      .map((count, idx) => (count === minCount ? idx : -1))
      .filter(idx => idx !== -1);
    
    // Randomly select from candidates for better distribution
    const chosenIdx = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];
    const chosenField = fields[chosenIdx];
    
    // Update assignment counts
    const updatedCounts = [...fieldAssignmentCounts];
    updatedCounts[chosenIdx]++;
    
    return { field: chosenField, updatedCounts };
  }

  /**
   * Initializes field assignment tracking
   * @param fields Available fields
   * @returns Initial assignment counts (all zeros)
   */
  initializeFieldCounts(fields: Field[]): number[] {
    return new Array(fields.length).fill(0);
  }

  /**
   * Shuffles fields for random distribution
   * @param fields Original fields array
   * @returns Shuffled copy of fields array
   */
  shuffleFields(fields: Field[]): Field[] {
    return [...fields].sort(() => Math.random() - 0.5);
  }

  /**
   * Validates field availability for tournament
   * @param fields Fields to validate
   * @throws Error if no fields are available
   */
  validateFieldAvailability(fields: Field[] | undefined): void {
    if (!fields || fields.length === 0) {
      throw new Error('No fields found for this tournament.');
    }
  }
}
