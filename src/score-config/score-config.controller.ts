import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  UseGuards,
  HttpStatus,
  NotFoundException
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../utils/prisma-types';
import { ScoreConfigService } from './score-config.service';
import { ScoreCalculationService } from './score-calculation.service';
import { CreateScoreConfigDto, CreateScoreElementDto, CreateBonusConditionDto, CreatePenaltyConditionDto, SubmitScoreDto } from './dto';

@ApiTags('score-configs')
@Controller('score-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ScoreConfigController {
  constructor(
    private scoreConfigService: ScoreConfigService,
    private scoreCalculationService: ScoreCalculationService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new score configuration' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Score configuration created successfully' })
  async create(@Body() createScoreConfigDto: CreateScoreConfigDto) {
    return this.scoreConfigService.createScoreConfig(createScoreConfigDto);
  }

  @Get('tournament/:tournamentId')
  @ApiOperation({ summary: 'Get score configuration for a tournament' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Score configuration retrieved successfully' })
  async getForTournament(@Param('tournamentId') tournamentId: string) {
    return this.scoreConfigService.getScoreConfigForTournament(tournamentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get score configuration by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Score configuration retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.scoreConfigService.getScoreConfigById(id);
  }

  @Post(':id/elements')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a score element to a configuration' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Score element added successfully' })
  async addElement(
    @Param('id') id: string,
    @Body() createScoreElementDto: CreateScoreElementDto,
  ) {
    return this.scoreConfigService.addScoreElement(id, createScoreElementDto);
  }

  @Post(':id/bonuses')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a bonus condition to a configuration' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Bonus condition added successfully' })
  async addBonus(
    @Param('id') id: string,
    @Body() createBonusConditionDto: CreateBonusConditionDto,
  ) {
    return this.scoreConfigService.addBonusCondition(id, createBonusConditionDto);
  }

  @Post(':id/penalties')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a penalty condition to a configuration' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Penalty condition added successfully' })
  async addPenalty(
    @Param('id') id: string,
    @Body() createPenaltyConditionDto: CreatePenaltyConditionDto,
  ) {
    return this.scoreConfigService.addPenaltyCondition(id, createPenaltyConditionDto);
  }

  @Post('calculate/:matchId/:allianceId')
  @Roles(UserRole.ALLIANCE_REFEREE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Calculate and submit scores for a match alliance' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Scores calculated and saved successfully' })
  async submitMatchScore(
    @Param('matchId') matchId: string,
    @Param('allianceId') allianceId: string,
    @Body() scoreData: SubmitScoreDto,
  ) {
    return this.scoreCalculationService.calculateMatchScore(
      matchId,
      allianceId,
      scoreData.elementScores,
      scoreData.scoreConfigId,
    );
  }
  @Get('match-score/:matchId/:allianceId')
  @ApiOperation({ summary: 'Get calculated scores for a match alliance' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Match scores retrieved successfully' })
  async getMatchScore(
    @Param('matchId') matchId: string,
    @Param('allianceId') allianceId: string,
  ) {
    // Get all score elements for this match and alliance
    const matchScores = await this.scoreCalculationService['prisma'].matchScore.findMany({
      where: {
        matchId,
        allianceId,
      },
      include: {
        scoreElement: true,
      },
    });

    if (!matchScores || matchScores.length === 0) {
      throw new NotFoundException(`No match scores found for match ${matchId} and alliance ${allianceId}`);
    }

    // Calculate total score
    const totalScore = matchScores.reduce((sum, score) => sum + score.totalPoints, 0);

    return {
      matchId,
      allianceId,      scores: matchScores,
      totalScore,
    };
  }
}
