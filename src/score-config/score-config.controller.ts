import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  UseGuards,
  HttpStatus,
  NotFoundException,
  Delete
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../utils/prisma-types';
import { ScoreConfigService } from './score-config.service';
import { ScoreCalculationService } from './score-calculation.service';
import { CreateScoreConfigDto, CreateScoreElementDto, CreateBonusConditionDto, CreatePenaltyConditionDto, CreateScoreSectionDto, UpdateScoreSectionDto, SubmitScoreDto, UpdateScoreElementDto, UpdateBonusConditionDto, UpdatePenaltyConditionDto, UpdateScoreConfigDto } from './dto';

@ApiTags('score-configs')
@Controller('score-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ScoreConfigController {
  constructor(
    private scoreConfigService: ScoreConfigService,
    private scoreCalculationService: ScoreCalculationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all score configurations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All score configurations retrieved successfully' })
  async findAll() {
    return this.scoreConfigService.findAll();
  }

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

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a score configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Score configuration updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateScoreConfigDto: UpdateScoreConfigDto,
  ) {
    return this.scoreConfigService.updateScoreConfig(id, updateScoreConfigDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a score configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Score configuration deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.scoreConfigService.deleteScoreConfig(id);
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

  // Update Score Element
  @Patch('elements/:elementId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a score element' })
  async updateElement(
    @Param('elementId') elementId: string,
    @Body() updateScoreElementDto: UpdateScoreElementDto,
  ) {
    return this.scoreConfigService.updateScoreElement(elementId, updateScoreElementDto);
  }

  // Delete Score Element
  @Delete('elements/:elementId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a score element' })
  async removeElement(@Param('elementId') elementId: string) {
    return this.scoreConfigService.deleteScoreElement(elementId);
  }

  // Update Bonus Condition
  @Patch('bonuses/:bonusId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a bonus condition' })
  async updateBonus(
    @Param('bonusId') bonusId: string,
    @Body() updateBonusConditionDto: UpdateBonusConditionDto,
  ) {
    return this.scoreConfigService.updateBonusCondition(bonusId, updateBonusConditionDto);
  }

  // Delete Bonus Condition
  @Delete('bonuses/:bonusId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a bonus condition' })
  async removeBonus(@Param('bonusId') bonusId: string) {
    return this.scoreConfigService.deleteBonusCondition(bonusId);
  }

  // Update Penalty Condition
  @Patch('penalties/:penaltyId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a penalty condition' })
  async updatePenalty(
    @Param('penaltyId') penaltyId: string,
    @Body() updatePenaltyConditionDto: UpdatePenaltyConditionDto,
  ) {
    return this.scoreConfigService.updatePenaltyCondition(penaltyId, updatePenaltyConditionDto);
  }

  // Delete Penalty Condition
  @Delete('penalties/:penaltyId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a penalty condition' })
  async removePenalty(@Param('penaltyId') penaltyId: string) {
    return this.scoreConfigService.deletePenaltyCondition(penaltyId);
  }

  // Assign ScoreConfig to Tournament
  @Post(':id/assign-tournament/:tournamentId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign score config to a tournament' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Score config assigned to tournament successfully' })
  async assignToTournament(
    @Param('id') id: string,
    @Param('tournamentId') tournamentId: string,
  ) {
    return this.scoreConfigService.assignToTournament(id, tournamentId);
  }

  // Unassign ScoreConfig from Tournament
  @Delete(':id/assign-tournament')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Unassign score config from tournament' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Score config unassigned from tournament successfully' })
  async unassignFromTournament(@Param('id') id: string) {
    return this.scoreConfigService.unassignFromTournament(id);
  }

  // Score Section Management
  @Post(':id/sections')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a score section to a configuration' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Score section added successfully' })
  async addSection(
    @Param('id') id: string,
    @Body() createScoreSectionDto: CreateScoreSectionDto,
  ) {
    return this.scoreConfigService.addScoreSection(id, createScoreSectionDto);
  }

  @Patch('sections/:sectionId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a score section' })
  async updateSection(
    @Param('sectionId') sectionId: string,
    @Body() updateScoreSectionDto: UpdateScoreSectionDto,
  ) {
    return this.scoreConfigService.updateScoreSection(sectionId, updateScoreSectionDto);
  }

  @Delete('sections/:sectionId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a score section' })
  async removeSection(@Param('sectionId') sectionId: string) {
    return this.scoreConfigService.deleteScoreSection(sectionId);
  }

  // Add elements/conditions to sections
  @Post('sections/:sectionId/elements')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a score element to a section' })
  async addElementToSection(
    @Param('sectionId') sectionId: string,
    @Body() createScoreElementDto: CreateScoreElementDto,
  ) {
    return this.scoreConfigService.addElementToSection(sectionId, createScoreElementDto);
  }

  @Post('sections/:sectionId/bonuses')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a bonus condition to a section' })
  async addBonusToSection(
    @Param('sectionId') sectionId: string,
    @Body() createBonusConditionDto: CreateBonusConditionDto,
  ) {
    return this.scoreConfigService.addBonusToSection(sectionId, createBonusConditionDto);
  }

  @Post('sections/:sectionId/penalties')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a penalty condition to a section' })
  async addPenaltyToSection(
    @Param('sectionId') sectionId: string,
    @Body() createPenaltyConditionDto: CreatePenaltyConditionDto,
  ) {
    return this.scoreConfigService.addPenaltyToSection(sectionId, createPenaltyConditionDto);
  }

  // Formula management
  @Patch(':id/formula')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update the total score formula' })
  async updateFormula(
    @Param('id') id: string,
    @Body('formula') formula: string,
  ) {
    return this.scoreConfigService.updateScoreFormula(id, formula);
  }

  // New section-based calculation endpoint
  @Post('calculate-sections/:matchId/:allianceId')
  @Roles(UserRole.ALLIANCE_REFEREE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Calculate scores using section-based configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Scores calculated with sections successfully' })
  async calculateWithSections(
    @Param('matchId') matchId: string,
    @Param('allianceId') allianceId: string,
    @Body() scoreData: SubmitScoreDto,
  ) {
    return this.scoreCalculationService.calculateMatchScoreWithSections(
      matchId,
      allianceId,
      scoreData.elementScores,
      scoreData.scoreConfigId,
    );
  }

  // Default section management
  @Post(':id/default-bonus-section')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create default bonus section for a configuration' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Default bonus section created successfully' })
  async createDefaultBonusSection(@Param('id') id: string) {
    return this.scoreConfigService.createDefaultBonusSection(id);
  }

  @Post(':id/default-penalty-section')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create default penalty section for a configuration' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Default penalty section created successfully' })
  async createDefaultPenaltySection(@Param('id') id: string) {
    return this.scoreConfigService.createDefaultPenaltySection(id);
  }

  @Post(':id/default-bonuses')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a bonus to the default bonus section' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Bonus added to default section successfully' })
  async addBonusToDefaultSection(
    @Param('id') id: string,
    @Body() createBonusConditionDto: CreateBonusConditionDto,
  ) {
    return this.scoreConfigService.addBonusToDefaultSection(id, createBonusConditionDto);
  }

  @Post(':id/default-penalties')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a penalty to the default penalty section' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Penalty added to default section successfully' })
  async addPenaltyToDefaultSection(
    @Param('id') id: string,
    @Body() createPenaltyConditionDto: CreatePenaltyConditionDto,
  ) {
    return this.scoreConfigService.addPenaltyToDefaultSection(id, createPenaltyConditionDto);
  }
}
