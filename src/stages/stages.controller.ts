import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { StagesService } from './stages.service';
import { StageAdvancementService } from './stage-advancement.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { AdvanceTeamsDto } from './dto/advance-teams.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../utils/prisma-types';

/**
 * Controller for stage-related operations including advancement logic.
 * Follows RESTful conventions and implements proper authorization.
 */
@Controller('stages')
export class StagesController {
  constructor(
    private readonly stagesService: StagesService,
    private readonly stageAdvancementService: StageAdvancementService,
  ) {}

  /**
   * Create a new stage
   * Only admins can create stages
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createStageDto: CreateStageDto) {
    return this.stagesService.create(createStageDto);
  }

  /**
   * Get all stages or stages by tournament
   * Available to all authenticated users
   */
  @Get()
  findAll(@Query('tournamentId') tournamentId?: string) {
    if (tournamentId) {
      return this.stagesService.findByTournament(tournamentId);
    }
    return this.stagesService.findAll();
  }

  /**
   * Get a specific stage by ID
   * Available to all authenticated users
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stagesService.findOne(id);
  }

  /**
   * Update a stage
   * Only admins can update stages
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateStageDto: UpdateStageDto) {
    return this.stagesService.update(id, updateStageDto);
  }

  /**
   * Delete a stage
   * Only admins can delete stages
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.stagesService.remove(id);
  }

  /**
   * Advance teams from current stage to the next stage
   * Only admins can perform stage advancement
   */
  @Post(':id/advance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async advanceTeams(
    @Param('id') id: string,
    @Body() advanceTeamsDto: AdvanceTeamsDto,
  ) {
    try {
      const result = await this.stageAdvancementService.advanceTeamsToNextStage(
        id,
        {
          teamsToAdvance: advanceTeamsDto.teamsToAdvance,
          nextStageId: advanceTeamsDto.nextStageId,
          createNextStage: advanceTeamsDto.createNextStage,
          nextStageConfig: advanceTeamsDto.nextStageConfig,
        },
      );

      return {
        success: true,
        message: `Successfully advanced ${result.totalTeamsAdvanced} teams from stage "${result.completedStage.name}"${
          result.nextStage ? ` to "${result.nextStage.name}"` : ''
        }`,
        data: {
          advancedTeams: result.advancedTeams.map((team) => ({
            id: team.id,
            teamNumber: team.teamNumber,
            name: team.name,
            currentStageId: team.currentStageId,
          })),
          completedStage: {
            id: result.completedStage.id,
            name: result.completedStage.name,
            status: result.completedStage.status,
          },
          nextStage: result.nextStage
            ? {
                id: result.nextStage.id,
                name: result.nextStage.name,
                type: result.nextStage.type,
              }
            : undefined,
          totalTeamsAdvanced: result.totalTeamsAdvanced,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to advance teams',
          error: error.name || 'AdvancementError',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get current team rankings for a stage
   * Available to all authenticated users
   */
  @Get(':id/rankings')
  @UseGuards(JwtAuthGuard)
  async getStageRankings(@Param('id') id: string) {
    try {
      const rankings = await this.stageAdvancementService.getStageRankings(id);

      return {
        success: true,
        message: `Retrieved rankings for stage`,
        data: rankings.map((ranking) => ({
          teamId: ranking.teamId,
          teamNumber: ranking.teamNumber,
          teamName: ranking.teamName,
          wins: ranking.wins,
          losses: ranking.losses,
          ties: ranking.ties,
          pointsScored: ranking.pointsScored,
          pointsConceded: ranking.pointsConceded,
          pointDifferential: ranking.pointDifferential,
          rankingPoints: ranking.rankingPoints,
          rank: ranking.rank,
          opponentWinPercentage: ranking.opponentWinPercentage ?? 0,
          matchesPlayed: ranking.matchesPlayed ?? 0,
        })),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve stage rankings',
          error: error.name || 'RankingError',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get teams assigned to a stage
   * Available to all authenticated users
   */
  @Get(':id/teams')
  @UseGuards(JwtAuthGuard)
  async getStageTeams(@Param('id') id: string) {
    try {
      const teams = await this.stagesService.getStageTeams(id);

      return {
        success: true,
        message: `Retrieved teams for stage`,
        data: teams.map((team) => ({
          teamId: team.id,
          teamNumber: team.teamNumber,
          teamName: team.name,
          //organization: team.organization,
        })),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve stage teams',
          error: error.name || 'TeamError',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Check if a stage is ready for advancement
   * Available to all authenticated users
   */
  @Get(':id/readiness')
  @UseGuards(JwtAuthGuard)
  async checkStageReadiness(@Param('id') id: string) {
    try {
      const readiness =
        await this.stageAdvancementService.isStageReadyForAdvancement(id);

      return {
        success: true,
        message: readiness.ready
          ? 'Stage is ready for advancement'
          : `Stage is not ready for advancement: ${readiness.reason}`,
        data: {
          ready: readiness.ready,
          reason: readiness.reason,
          incompleteMatches: readiness.incompleteMatches,
          totalTeams: readiness.totalTeams,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to check stage readiness',
          error: error.name || 'ReadinessError',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Preview which teams would be advanced without actually advancing them
   * Available to all authenticated users
   */
  @Get(':id/advancement-preview')
  @UseGuards(JwtAuthGuard)
  async previewAdvancement(
    @Param('id') id: string,
    @Query('teamsToAdvance') teamsToAdvance?: string,
  ) {
    try {
      const rankings = await this.stageAdvancementService.getStageRankings(id);
      const count = teamsToAdvance
        ? parseInt(teamsToAdvance, 10)
        : Math.ceil(rankings.length / 2);

      if (isNaN(count) || count <= 0) {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid number of teams to advance',
            error: 'ValidationError',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (count > rankings.length) {
        throw new HttpException(
          {
            success: false,
            message: `Cannot advance ${count} teams when only ${rankings.length} teams participated`,
            error: 'ValidationError',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const topTeams = rankings.slice(0, count);
      const remainingTeams = rankings.slice(count);

      return {
        success: true,
        message: `Preview: ${count} teams would be advanced`,
        data: {
          teamsToAdvance: topTeams,
          remainingTeams: remainingTeams,
          totalTeams: rankings.length,
          advancementPercentage: Math.round((count / rankings.length) * 100),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to preview advancement',
          error: error.name || 'PreviewError',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
