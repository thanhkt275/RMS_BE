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
import { CreateMatchScoresDto, UpdateMatchScoresDto } from './dto';

@ApiTags('match-scores')
@Controller('match-scores')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MatchScoresController {
  constructor(
    private readonly matchScoresService: MatchScoresService,
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