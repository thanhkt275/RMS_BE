import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RefereeAssignment, BatchRefereeAssignment } from './dto/referee-assignment.dto';

@Injectable()
export class FieldRefereesService {
  constructor(private prisma: PrismaService) {}

  async assignRefereesToField(fieldId: string, assignments: RefereeAssignment[]) {
    // Validate: field exists
    await this.validateFieldExists(fieldId);

    // If no assignments provided, just clear existing assignments
    if (assignments.length === 0) {
      return this.prisma.$transaction(async (tx) => {
        await tx.fieldReferee.deleteMany({ where: { fieldId } });
        return this.getFieldReferees(fieldId);
      });
    }

    // Validate: all users exist and have appropriate roles
    await this.validateRefereeUsers(assignments);

    // Get current assignments
    const currentAssignments = await this.prisma.fieldReferee.findMany({
      where: { fieldId },
      select: { userId: true, isHeadRef: true }
    });

    // Check for duplicates
    const currentUserIds = new Set(currentAssignments.map(a => a.userId));
    const newUserIds = assignments.map(a => a.userId);
    const duplicates = newUserIds.filter(id => currentUserIds.has(id));
    
    if (duplicates.length > 0) {
      throw new BadRequestException(`Users ${duplicates.join(', ')} are already assigned to this field`);
    }

    // Validate total referee count after addition
    const totalAfterAddition = currentAssignments.length + assignments.length;
    if (totalAfterAddition > 4) {
      throw new BadRequestException(`Cannot assign ${assignments.length} more referees. Field would have ${totalAfterAddition} referees (maximum is 4)`);
    }

    // Validate head referee count
    const currentHeadRefCount = currentAssignments.filter(a => a.isHeadRef).length;
    const newHeadRefCount = assignments.filter(a => a.isHeadRef).length;
    const totalHeadRefCount = currentHeadRefCount + newHeadRefCount;
    
    if (totalHeadRefCount > 1) {
      throw new BadRequestException('Cannot assign multiple head referees. Field already has a head referee or you are trying to assign multiple head referees.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create new assignments (additive, not replacement)
      await tx.fieldReferee.createMany({
        data: assignments.map(a => ({
          fieldId,
          userId: a.userId,
          isHeadRef: a.isHeadRef
        }))
      });

      // Auto-assign head referee to existing matches without a scorer
      const headReferee = assignments.find(a => a.isHeadRef);
      if (headReferee) {
        await tx.match.updateMany({
          where: { fieldId, scoredById: null },
          data: { scoredById: headReferee.userId }
        });
      }

      return this.getFieldReferees(fieldId);
    });
  }

  async addRefereesToField(fieldId: string, assignments: RefereeAssignment[]) {
    // Validate: field exists
    await this.validateFieldExists(fieldId);

    if (assignments.length === 0) {
      throw new BadRequestException('At least one referee assignment is required');
    }

    // Validate: all users exist and have appropriate roles
    await this.validateRefereeUsers(assignments);

    // Get current assignments
    const currentAssignments = await this.prisma.fieldReferee.findMany({
      where: { fieldId },
      select: { userId: true, isHeadRef: true }
    });

    // Check for duplicates
    const currentUserIds = new Set(currentAssignments.map(a => a.userId));
    const newUserIds = assignments.map(a => a.userId);
    const duplicates = newUserIds.filter(id => currentUserIds.has(id));
    
    if (duplicates.length > 0) {
      throw new BadRequestException(`Users ${duplicates.join(', ')} are already assigned to this field`);
    }

    // Validate total referee count after addition
    const totalAfterAddition = currentAssignments.length + assignments.length;
    if (totalAfterAddition > 4) {
      throw new BadRequestException(`Cannot assign ${assignments.length} more referees. Field would have ${totalAfterAddition} referees (maximum is 4)`);
    }

    // Validate head referee count
    const currentHeadRefCount = currentAssignments.filter(a => a.isHeadRef).length;
    const newHeadRefCount = assignments.filter(a => a.isHeadRef).length;
    const totalHeadRefCount = currentHeadRefCount + newHeadRefCount;
    
    if (totalHeadRefCount > 1) {
      throw new BadRequestException('Cannot assign multiple head referees. Field already has a head referee or you are trying to assign multiple head referees.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create new assignments
      await tx.fieldReferee.createMany({
        data: assignments.map(a => ({
          fieldId,
          userId: a.userId,
          isHeadRef: a.isHeadRef
        }))
      });

      // Auto-assign head referee to existing matches without a scorer
      const headReferee = assignments.find(a => a.isHeadRef);
      if (headReferee) {
        await tx.match.updateMany({
          where: { fieldId, scoredById: null },
          data: { scoredById: headReferee.userId }
        });
      }

      return this.getFieldReferees(fieldId);
    });
  }

  async getFieldReferees(fieldId: string) {
    return this.prisma.fieldReferee.findMany({
      where: { fieldId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: [
        { isHeadRef: 'desc' }, // Head referee first
        { createdAt: 'asc' }
      ]
    });
  }

  async removeRefereeFromField(fieldId: string, userId: string) {
    // First check if the assignment exists
    const assignment = await this.prisma.fieldReferee.findUnique({
      where: {
        fieldId_userId: { fieldId, userId }
      }
    });

    if (!assignment) {
      // Instead of throwing an error, log a warning and return gracefully
      console.warn(`Referee assignment not found for field ${fieldId} and user ${userId}. It may have already been removed.`);
      return null; // Return null to indicate the assignment was already removed
    }

    // Check if this is a head referee and prevent removal if matches are assigned
    if (assignment.isHeadRef) {
      const matchesWithHeadRef = await this.prisma.match.count({
        where: { fieldId, scoredById: userId }
      });

      if (matchesWithHeadRef > 0) {
        throw new BadRequestException(
          'Cannot remove head referee: they are assigned as scorer to active matches'
        );
      }
    }

    // Perform the deletion
    try {
      return await this.prisma.fieldReferee.delete({
        where: { fieldId_userId: { fieldId, userId } }
      });
    } catch (error) {
      // Handle the case where the record was deleted between the check and the delete
      if (error.code === 'P2025') { // Prisma "Record not found" error
        console.warn(`Referee assignment was already removed for field ${fieldId} and user ${userId}.`);
        return null;
      }
      throw error; // Re-throw other errors
    }
  }

  async batchAssignReferees(assignments: BatchRefereeAssignment[]) {
    // Validate all assignments
    for (const assignment of assignments) {
      await this.validateFieldExists(assignment.fieldId);
    }

    // Group assignments by field to validate field-level constraints
    const assignmentsByField = new Map<string, BatchRefereeAssignment[]>();
    for (const assignment of assignments) {
      const fieldAssignments = assignmentsByField.get(assignment.fieldId) || [];
      fieldAssignments.push(assignment);
      assignmentsByField.set(assignment.fieldId, fieldAssignments);
    }

    // Validate each field's constraints
    for (const [fieldId, fieldAssignments] of assignmentsByField) {
      // Check head referee count per field
      const headRefCount = fieldAssignments.filter(a => a.isHeadRef).length;
      if (headRefCount > 1) {
        throw new BadRequestException(`Field ${fieldId}: At most one head referee can be assigned per field`);
      }

      // Check referee count per field
      const existingCount = await this.prisma.fieldReferee.count({
        where: { fieldId }
      });
      
      const uniqueUserIds = new Set(fieldAssignments.map(a => a.userId));
      const newCount = uniqueUserIds.size;
      
      if (existingCount + newCount > 4) {
        throw new BadRequestException(`Field ${fieldId}: Would exceed maximum of 4 referees per field`);
      }
    }

    // Validate users exist and have appropriate roles
    const allUserIds = [...new Set(assignments.map(a => a.userId))];
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: allUserIds },
        role: { in: ['HEAD_REFEREE', 'ALLIANCE_REFEREE'] }
      }
    });

    if (users.length !== allUserIds.length) {
      throw new BadRequestException('One or more users are not valid referees');
    }

    return this.prisma.$transaction(
      assignments.map(assignment => 
        this.prisma.fieldReferee.upsert({
          where: {
            fieldId_userId: {
              fieldId: assignment.fieldId,
              userId: assignment.userId
            }
          },
          update: { isHeadRef: assignment.isHeadRef },
          create: {
            fieldId: assignment.fieldId,
            userId: assignment.userId,
            isHeadRef: assignment.isHeadRef
          }
        })
      )
    );
  }

  async getAvailableReferees() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: ['HEAD_REFEREE', 'ALLIANCE_REFEREE']
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      },
      orderBy: [
        { role: 'asc' }, // HEAD_REFEREE first
        { username: 'asc' }
      ]
    });
  }

  async getRefereesByTournament(tournamentId: string) {
    return this.prisma.fieldReferee.findMany({
      where: {
        field: {
          tournamentId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        },
        field: {
          select: {
            id: true,
            name: true,
            number: true
          }
        }
      }
    });
  }

  async getAvailableRefereesForTournament(tournamentId: string) {
    // Get all referees with appropriate roles
    const allReferees = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['HEAD_REFEREE', 'ALLIANCE_REFEREE']
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      },
      orderBy: [
        { role: 'asc' }, // HEAD_REFEREE first
        { username: 'asc' }
      ]
    });

    // Get already assigned referees for this tournament
    const assignedReferees = await this.prisma.fieldReferee.findMany({
      where: {
        field: {
          tournamentId
        }
      },
      select: {
        userId: true
      }
    });

    // Filter out assigned referees
    const assignedUserIds = new Set(assignedReferees.map(ar => ar.userId));
    return allReferees.filter(referee => !assignedUserIds.has(referee.id));
  }

  async replaceAllRefereesForField(fieldId: string, assignments: RefereeAssignment[]) {
    // Validate: field exists
    await this.validateFieldExists(fieldId);

    // If no assignments provided, just clear existing assignments
    if (assignments.length === 0) {
      return this.prisma.$transaction(async (tx) => {
        await tx.fieldReferee.deleteMany({ where: { fieldId } });
        return this.getFieldReferees(fieldId);
      });
    }

    // Validate: all users exist and have appropriate roles
    await this.validateRefereeUsers(assignments);

    // Validate: at most one head referee
    const headRefCount = assignments.filter(a => a.isHeadRef).length;
    if (headRefCount > 1) {
      throw new BadRequestException('At most one head referee can be assigned per field');
    }

    // Validate: maximum 4 referees
    if (assignments.length > 4) {
      throw new BadRequestException('Maximum 4 referees can be assigned per field');
    }

    return this.prisma.$transaction(async (tx) => {
      // Clear existing assignments
      await tx.fieldReferee.deleteMany({ where: { fieldId } });
      
      // Create new assignments
      await tx.fieldReferee.createMany({
        data: assignments.map(a => ({
          fieldId,
          userId: a.userId,
          isHeadRef: a.isHeadRef
        }))
      });

      // Auto-assign head referee to existing matches without a scorer
      const headReferee = assignments.find(a => a.isHeadRef);
      if (headReferee) {
        await tx.match.updateMany({
          where: { fieldId, scoredById: null },
          data: { scoredById: headReferee.userId }
        });
      }

      return this.getFieldReferees(fieldId);
    });
  }

  async getFieldRefereeAssignmentDetails(fieldId: string, userId?: string) {
    const where = userId 
      ? { fieldId, userId }
      : { fieldId };

    const assignments = await this.prisma.fieldReferee.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        },
        field: {
          select: {
            id: true,
            name: true,
            number: true,
            tournamentId: true
          }
        }
      }
    });

    return {
      fieldId,
      userId,
      assignments,
      count: assignments.length,
      headRefereeCount: assignments.filter(a => a.isHeadRef).length,
      allianceRefereeCount: assignments.filter(a => !a.isHeadRef).length
    };
  }

  // Private validation methods
  private async validateRefereeUsers(assignments: RefereeAssignment[]) {
    const userIds = assignments.map(a => a.userId);
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        role: { in: ['HEAD_REFEREE', 'ALLIANCE_REFEREE'] }
      },
      select: { id: true, role: true }
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException('One or more users are not valid referees');
    }

    // Check for head referee assignment - prefer HEAD_REFEREE role but allow ALLIANCE_REFEREE
    const headRefereeAssignment = assignments.find(a => a.isHeadRef);
    if (headRefereeAssignment) {
      const headRefereeUser = users.find(u => u.id === headRefereeAssignment.userId);
      
      // Log a warning if an ALLIANCE_REFEREE is being assigned as head referee
      if (headRefereeUser && headRefereeUser.role === 'ALLIANCE_REFEREE') {
        console.warn(`Warning: ALLIANCE_REFEREE ${headRefereeUser.id} is being assigned as head referee`);
      }
    }
  }

  private async validateFieldExists(fieldId: string) {
    const field = await this.prisma.field.findUnique({
      where: { id: fieldId }
    });

    if (!field) {
      throw new BadRequestException(`Field with ID ${fieldId} not found`);
    }

    return field;
  }
}
