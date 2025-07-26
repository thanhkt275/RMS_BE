import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  BadRequestException
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../utils/prisma-types';
import { RankingUpdateService } from './ranking-update.service';
import { TeamStatsApiService } from './team-stats-api.service';

@ApiTags('rankings')
@Controller('rankings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RankingController {
  constructor(
    private readonly rankingUpdateService: RankingUpdateService,
    private readonly teamStatsApiService: TeamStatsApiService
  ) {}

  @Get('live/:tournamentId')
  @ApiOperation({ summary: 'Get live rankings for a tournament' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament ID' })
  @ApiQuery({ name: 'stageId', description: 'Stage ID (optional)', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns live rankings for the tournament.'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tournament not found or no rankings available.'
  })
  async getLiveRankings(
    @Param('tournamentId') tournamentId: string,
    @Query('stageId') stageId?: string
  ) {
    if (!tournamentId) {
      throw new BadRequestException('Tournament ID is required');
    }

    const rankings = await this.rankingUpdateService.getLiveRankings(tournamentId, stageId);

    return {
      tournamentId,
      stageId,
      rankings,
      timestamp: Date.now(),
      totalTeams: rankings.length
    };
  }

  @Get('live/:tournamentId/:stageId')
  @ApiOperation({ summary: 'Get live rankings for a specific stage' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament ID' })
  @ApiParam({ name: 'stageId', description: 'Stage ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns live rankings for the stage.'
  })
  async getLiveStageRankings(
    @Param('tournamentId') tournamentId: string,
    @Param('stageId') stageId: string
  ) {
    if (!tournamentId || !stageId) {
      throw new BadRequestException('Tournament ID and Stage ID are required');
    }

    const rankings = await this.rankingUpdateService.getLiveRankings(tournamentId, stageId);

    return {
      tournamentId,
      stageId,
      rankings,
      timestamp: Date.now(),
      totalTeams: rankings.length
    };
  }

  @Post('recalculate/:tournamentId')
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE)
  @ApiOperation({ summary: 'Force recalculation of rankings for a tournament (Admin/Head Referee only)' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament ID' })
  @ApiQuery({ name: 'stageId', description: 'Stage ID (optional)', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rankings recalculated successfully.'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access.'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions. Only Admin and Head Referee can force recalculation.'
  })
  async forceRecalculation(
    @Param('tournamentId') tournamentId: string,
    @Query('stageId') stageId?: string
  ) {
    if (!tournamentId) {
      throw new BadRequestException('Tournament ID is required');
    }

    const rankings = await this.rankingUpdateService.forceRecalculation(tournamentId, stageId);

    return {
      success: true,
      message: `Rankings recalculated successfully for tournament ${tournamentId}${stageId ? `, stage ${stageId}` : ''}`,
      tournamentId,
      stageId,
      rankings,
      timestamp: Date.now(),
      totalTeams: rankings.length
    };
  }

  @Post('recalculate/:tournamentId/:stageId')
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE)
  @ApiOperation({ summary: 'Force recalculation of rankings for a specific stage (Admin/Head Referee only)' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament ID' })
  @ApiParam({ name: 'stageId', description: 'Stage ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stage rankings recalculated successfully.'
  })
  async forceStageRecalculation(
    @Param('tournamentId') tournamentId: string,
    @Param('stageId') stageId: string
  ) {
    if (!tournamentId || !stageId) {
      throw new BadRequestException('Tournament ID and Stage ID are required');
    }

    const rankings = await this.rankingUpdateService.forceRecalculation(tournamentId, stageId);

    return {
      success: true,
      message: `Rankings recalculated successfully for stage ${stageId} in tournament ${tournamentId}`,
      tournamentId,
      stageId,
      rankings,
      timestamp: Date.now(),
      totalTeams: rankings.length
    };
  }

  @Get('leaderboard/:tournamentId')
  @ApiOperation({ summary: 'Get formatted leaderboard for a tournament' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament ID' })
  @ApiQuery({ name: 'stageId', description: 'Stage ID (optional)', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns formatted leaderboard for the tournament.'
  })
  async getLeaderboard(
    @Param('tournamentId') tournamentId: string,
    @Query('stageId') stageId?: string
  ) {
    if (!tournamentId) {
      throw new BadRequestException('Tournament ID is required');
    }

    const leaderboard = await this.teamStatsApiService.getLeaderboard(tournamentId, { stageId });

    return {
      ...leaderboard,
      timestamp: Date.now(),
      live: true
    };
  }

  @Get('stats/:tournamentId')
  @ApiOperation({ summary: 'Get ranking statistics for a tournament' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament ID' })
  @ApiQuery({ name: 'stageId', description: 'Stage ID (optional)', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns ranking statistics for the tournament.'
  })
  async getRankingStats(
    @Param('tournamentId') tournamentId: string,
    @Query('stageId') stageId?: string
  ) {
    if (!tournamentId) {
      throw new BadRequestException('Tournament ID is required');
    }

    const stats = await this.rankingUpdateService.getRankingStats(tournamentId, stageId);

    return {
      tournamentId,
      stageId,
      ...stats,
      timestamp: Date.now()
    };
  }
}
