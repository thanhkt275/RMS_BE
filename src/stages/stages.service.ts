import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { DateValidationService } from '../common/services/date-validation.service';

@Injectable()
export class StagesService {
  constructor(
    private prisma: PrismaService,
    private dateValidationService: DateValidationService
  ) {}

  async create(createStageDto: CreateStageDto) {
    // Validate stage dates against tournament boundaries
    const stageRange = {
      startDate: new Date(createStageDto.startDate),
      endDate: new Date(createStageDto.endDate)
    };

    const dateValidation = await this.dateValidationService.validateStageeDateRange(
      stageRange,
      {
        stageId: '', // Not applicable for creation
        tournamentId: createStageDto.tournamentId
      }
    );

    if (!dateValidation.isValid) {
      throw new BadRequestException(
        `Cannot create stage: ${dateValidation.errors.join('; ')}`
      );
    }

    return this.prisma.stage.create({
      data: {
        name: createStageDto.name,
        description: createStageDto.description,
        type: createStageDto.type,
        startDate: stageRange.startDate,
        endDate: stageRange.endDate,
        tournamentId: createStageDto.tournamentId,
        maxTeams: createStageDto.maxTeams,
        isElimination: createStageDto.isElimination,
        advancementRules: createStageDto.advancementRules,
      },
    });
  }

  findAll() {
    return this.prisma.stage.findMany({
      include: {
        tournament: true,
      },
    });
  }

  findByTournament(tournamentId: string) {
    return this.prisma.stage.findMany({
      where: {
        tournamentId: tournamentId,
      },
      include: {
        tournament: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.stage.findUnique({
      where: { id },
      include: {
        tournament: true,
        matches: {
          include: {
            alliances: {
              include: {
                teamAlliances: {
                  include: {
                    team: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, updateStageDto: UpdateStageDto) {
    const data: any = {};
    let dateRangeChanged = false;

    // Validate date range changes if provided
    if (updateStageDto.startDate || updateStageDto.endDate) {
      // Get current stage and tournament info
      const currentStage = await this.prisma.stage.findUnique({
        where: { id },
        select: {
          startDate: true,
          endDate: true,
          tournamentId: true,
          name: true
        }
      });

      if (!currentStage) {
        throw new BadRequestException('Stage not found');
      }

      const newStartDate = updateStageDto.startDate
        ? new Date(updateStageDto.startDate)
        : currentStage.startDate;
      const newEndDate = updateStageDto.endDate
        ? new Date(updateStageDto.endDate)
        : currentStage.endDate;

      // Validate the new date range
      const dateValidation = await this.dateValidationService.validateStageeDateRange(
        { startDate: newStartDate, endDate: newEndDate },
        {
          stageId: id,
          tournamentId: currentStage.tournamentId
        }
      );

      if (!dateValidation.isValid) {
        throw new BadRequestException(
          `Cannot update stage dates: ${dateValidation.errors.join('; ')}`
        );
      }

      dateRangeChanged = true;
    }

    if (updateStageDto.name) {
      data.name = updateStageDto.name;
    }

    if (updateStageDto.description !== undefined) {
      data.description = updateStageDto.description;
    }

    if (updateStageDto.type) {
      data.type = updateStageDto.type;
    }

    if (updateStageDto.startDate) {
      data.startDate = new Date(updateStageDto.startDate);
    }

    if (updateStageDto.endDate) {
      data.endDate = new Date(updateStageDto.endDate);
    }

    if (updateStageDto.maxTeams !== undefined) {
      data.maxTeams = updateStageDto.maxTeams;
    }

    if (updateStageDto.isElimination !== undefined) {
      data.isElimination = updateStageDto.isElimination;
    }

    if (updateStageDto.advancementRules !== undefined) {
      data.advancementRules = updateStageDto.advancementRules;
    }

    return this.prisma.stage.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.stage.delete({
      where: { id },
    });
  }

  async getStageTeams(stageId: string) {
    return this.prisma.team.findMany({
      where: {
        currentStageId: stageId,
      },
      orderBy: {
        teamNumber: 'asc',
      },
    });
  }

  /**
   * Get date boundaries for stage validation
   */
  async getDateBoundaries(stageId: string) {
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      select: { tournamentId: true }
    });

    if (!stage) {
      throw new BadRequestException('Stage not found');
    }

    return this.dateValidationService.getDateBoundaries(stage.tournamentId, stageId);
  }

  /**
   * Validate if stage dates can be updated
   */
  async validateDateUpdate(
    stageId: string,
    newStartDate: Date,
    newEndDate: Date
  ) {
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      select: { tournamentId: true, name: true }
    });

    if (!stage) {
      throw new BadRequestException('Stage not found');
    }

    const dateRange = { startDate: newStartDate, endDate: newEndDate };

    const dateValidation = await this.dateValidationService.validateStageeDateRange(
      dateRange,
      {
        stageId,
        tournamentId: stage.tournamentId
      }
    );

    return {
      isValid: dateValidation.isValid,
      errors: dateValidation.errors,
      warnings: []
    };
  }
}