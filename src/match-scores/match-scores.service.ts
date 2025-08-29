import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CreateMatchScoresDto, UpdateMatchScoresDto } from './dto';
import { ScoreCalculationService } from './services/score-calculation.service';
import { AllianceRepository } from './services/alliance.repository';
import { MatchResultService } from './services/match-result.service';
import { ITeamStatsService } from './interfaces/team-stats.interface';
import { ScoreDataDto } from './dto/score-data.dto';


@Injectable()
export class MatchScoresService {
  constructor(
    private readonly scoreCalculationService: ScoreCalculationService,
    private readonly allianceRepository: AllianceRepository,
    private readonly matchResultService: MatchResultService,
    @Inject('ITeamStatsService') private readonly teamStatsService: ITeamStatsService
  ) {}
  /**
   * @param createMatchScoresDto - DTO with match score data
   * @returns Legacy format match scores for backward compatibility
   */
  async create(createMatchScoresDto: CreateMatchScoresDto) {
    try {
      // Step 1: Validate and extract score data
      const scoreData = ScoreDataDto.fromCreateDto(createMatchScoresDto);
      scoreData.validate();

      // Step 2: Validate match has required alliances
      const { red: redAlliance, blue: blueAlliance } = 
        await this.allianceRepository.validateMatchAlliances(scoreData.matchId);

      // Step 3: Calculate scores and determine winner (with penalties)
      const redPenalty = Number(scoreData.redPenalty || 0);
      const bluePenalty = Number(scoreData.bluePenalty || 0);
      const redTotalScore = Number(scoreData.redAutoScore) + Number(scoreData.redDriveScore) + bluePenalty;
      const blueTotalScore = Number(scoreData.blueAutoScore) + Number(scoreData.blueDriveScore) + redPenalty;
      let winningAlliance: 'RED' | 'BLUE' | null = null;
      if (redTotalScore > blueTotalScore) winningAlliance = 'RED';
      else if (blueTotalScore > redTotalScore) winningAlliance = 'BLUE';

      // Step 4: Update alliance scores (only valid fields)
      await this.allianceRepository.updateAllianceScores(redAlliance.id, {
        autoScore: scoreData.redAutoScore,
        driveScore: scoreData.redDriveScore,
        totalScore: redTotalScore,
      });
      await this.allianceRepository.updateAllianceScores(blueAlliance.id, {
        autoScore: scoreData.blueAutoScore,
        driveScore: scoreData.blueDriveScore,
        totalScore: blueTotalScore,
      });

      // Step 5: Update match winner
      await this.matchResultService.updateMatchWinner(scoreData.matchId, winningAlliance as any);

      // Step 6: Update team statistics
      await this.updateTeamStatistics(scoreData.matchId);

      // Step 7: Return legacy format for backward compatibility
      return {
        id: scoreData.matchId,
        matchId: scoreData.matchId,
        redAutoScore: scoreData.redAutoScore,
        redDriveScore: scoreData.redDriveScore,
        redPenaltyScore: bluePenalty,
        redPenaltyGiven: redPenalty,
        redTotalScore,
        blueAutoScore: scoreData.blueAutoScore,
        blueDriveScore: scoreData.blueDriveScore,
        bluePenaltyScore: redPenalty,
        bluePenaltyGiven: bluePenalty,
        blueTotalScore,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      // Add context to the error
      throw new BadRequestException(`Failed to create match scores: ${error.message}`);
    }
  }

  /**
   * Updates team statistics after score changes
   */
  private async updateTeamStatistics(matchId: string): Promise<void> {
    const matchWithDetails = await this.matchResultService.getMatchWithDetails(matchId);
    
    if (matchWithDetails) {
      const teamIds = this.matchResultService.extractTeamIds(matchWithDetails);
      await this.teamStatsService.recalculateTeamStats(matchWithDetails, teamIds);
    }
  }  /**
   * Finds match scores by match ID
   */
  async findByMatchId(matchId: string) {
    try {
      const alliances = await this.allianceRepository.getAlliancesForMatch(matchId);
      return this.convertAlliancesToLegacyFormat(matchId, alliances);
    } catch (error) {
      throw new NotFoundException(`Failed to find match scores for match ${matchId}: ${error.message}`);
    }
  }
  /**
   * Find all match scores - returns legacy format for backward compatibility
   */
  async findAll() {
    try {
      const matchesWithAlliances = await this.allianceRepository.getAllMatchesWithAlliances();
      
      return matchesWithAlliances.map(({ matchId, alliances }) => 
        this.convertAlliancesToLegacyFormat(matchId, alliances)
      );
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve all match scores: ${error.message}`);
    }
  }

  /**
   * Find match scores by ID - returns legacy format for backward compatibility
   */
  async findOne(id: string) {
    return this.findByMatchId(id);
  }

  /**
   * Updates match scores using the simplified Alliance-based scoring
   */
  async update(id: string, updateMatchScoresDto: UpdateMatchScoresDto) {
    return this.create({
      ...updateMatchScoresDto,
      matchId: updateMatchScoresDto.matchId || id,
    } as CreateMatchScoresDto);
  }

  /**
   * Resets alliance scores to zero for a match
   */
  async remove(matchId: string) {
    try {
      // Validate match exists
      await this.allianceRepository.getAlliancesForMatch(matchId);

      // Reset alliance scores
      await this.allianceRepository.resetAllianceScores(matchId);

      // Reset match winner
      await this.matchResultService.resetMatchWinner(matchId);

      return { message: `Reset scores for match ${matchId}` };
    } catch (error) {
      throw new BadRequestException(`Failed to reset match scores: ${error.message}`);
    }
  }

  /**
   * Converts alliance data to legacy format
   */
  private convertAlliancesToLegacyFormat(matchId: string, alliances: any[]) {
    const redAlliance = alliances.find(a => a.color === 'RED');
    const blueAlliance = alliances.find(a => a.color === 'BLUE');

    return {
      id: matchId,
      matchId,
      redAutoScore: redAlliance?.autoScore || 0,
      redDriveScore: redAlliance?.driveScore || 0,
      redTotalScore: redAlliance?.totalScore || 0,
      blueAutoScore: blueAlliance?.autoScore || 0,
      blueDriveScore: blueAlliance?.driveScore || 0,
      blueTotalScore: blueAlliance?.totalScore || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
