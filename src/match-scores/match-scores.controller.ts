import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  HttpStatus,
  Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { UserRole } from '../utils/prisma-types';
import { MatchScoresService } from './match-scores.service';
import { CreateMatchScoresDto, UpdateMatchScoresDto, ScorePreviewDto } from './dto';
import { ScoreConfigResolutionService } from '../score-config/score-config-resolution.service';

@ApiTags('match-scores')
@Controller('match-scores')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MatchScoresController {
  constructor(
    private readonly matchScoresService: MatchScoresService,
    private readonly scoreConfigResolutionService: ScoreConfigResolutionService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE)
  @ApiOperation({ summary: 'Create match scores (Admin/Head Referee only)' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Match scores have been created successfully.'
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized access.'
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Insufficient permissions. Only Admin and Head Referee can create scores.'
  })
  create(@Body() createMatchScoresDto: CreateMatchScoresDto) {
    return this.matchScoresService.create(createMatchScoresDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all match scores' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns all match scores.'
  })
  findAll() {
    return this.matchScoresService.findAll();
  }

  // More specific route comes first to prevent route conflicts
  @Get('match/:matchId')
  @Public()
  @ApiOperation({ summary: 'Get match scores by match ID' })
@ApiParam({ name: 'matchId', description: 'Match ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns the match scores for the specified match ID.'
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Match scores not found for the specified match.'
  })
  findByMatchId(@Param('matchId') matchId: string) {
    return this.matchScoresService.findByMatchId(matchId);
  }

  @Get(':matchId/score-config')
  @Public()
  @ApiOperation({ summary: 'Get score configuration for a match' })
  @ApiParam({ name: 'matchId', description: 'Match ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns the score configuration for the specified match ID.'
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Score configuration not found for the specified match.'
  })
  async getScoreConfig(@Param('matchId') matchId: string) {
    return this.scoreConfigResolutionService.resolveScoreConfigForMatch(matchId);
  }

  @Get('frontend/score-panel-config')
  @Public()
  @ApiOperation({ summary: 'Get UI score panel configuration' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns the UI score panel configuration.'
  })
  async getScorePanelConfig() {
    // Return a basic configuration structure for the frontend score panel
    return {
      layout: 'standard',
      sections: [
        {
          name: 'Autonomous',
          code: 'auto',
          displayOrder: 1,
          elements: ['auto_cone', 'auto_cube', 'auto_mobility']
        },
        {
          name: 'Driver Controlled',
          code: 'teleop',
          displayOrder: 2,
          elements: ['teleop_cone', 'teleop_cube', 'teleop_links']
        },
        {
          name: 'Endgame',
          code: 'endgame',
          displayOrder: 3,
          elements: ['endgame_climb', 'endgame_park']
        }
      ],
      theme: {
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e'
      }
    };
  }

  @Post('preview-score')
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE)
  @ApiOperation({ summary: 'Preview score calculation for a match and alliance' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns the preview score calculation.'
  })
  async previewScore(@Body() dto: ScorePreviewDto) {
    const { matchId, allianceId, elementScores, scoreConfigId } = dto;
    
    // Get the score configuration for the match
    const config = await this.scoreConfigResolutionService.resolveScoreConfigForMatch(matchId);
    
    // For now, return a simple calculation preview
    // This can be extended later to integrate with a dedicated calculation service
    const totalScore = Object.values(elementScores).reduce((sum, score) => sum + score, 0);
    
    return {
      matchId,
      allianceId,
      elementScores,
      totalScore,
      configUsed: config ? config.id : 'fallback',
      calculationPreview: {
        sections: [
          { name: 'Auto', score: Math.floor(totalScore * 0.3) },
          { name: 'Teleop', score: Math.floor(totalScore * 0.6) },
          { name: 'Endgame', score: Math.floor(totalScore * 0.1) }
        ],
        bonuses: [],
        penalties: []
      }
    };
  }



  // General ID route comes after more specific routes
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get match scores by ID' })
  @ApiParam({ name: 'id', description: 'Match scores ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns the match scores for the specified ID.'
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Match scores not found.'
  })
  findOne(@Param('id') id: string) {
    return this.matchScoresService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE)
  @ApiOperation({ summary: 'Update match scores (Admin/Head Referee only)' })
  @ApiParam({ name: 'id', description: 'Match scores ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Match scores have been updated successfully.'
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized access.'
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Insufficient permissions. Only Admin and Head Referee can update scores.'
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Match scores not found.'
  })
  update(@Param('id') id: string, @Body() updateMatchScoresDto: UpdateMatchScoresDto) {
    return this.matchScoresService.update(id, updateMatchScoresDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE)
  @ApiOperation({ summary: 'Delete match scores' })
  @ApiParam({ name: 'id', description: 'Match scores ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Match scores have been deleted successfully.'
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized access.'
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Insufficient permissions.'
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Match scores not found.'
  })
  remove(@Param('id') id: string) {
    return this.matchScoresService.remove(id);
  }
}