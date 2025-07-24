import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { FieldRefereesService } from '../field-referees/field-referees.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import {
  AssignRefereesDto,
  BatchAssignRefereesDto,
} from '../field-referees/dto/referee-assignment.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../utils/prisma-types';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly fieldRefereesService: FieldRefereesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createTournamentDto: CreateTournamentDto) {
    return this.tournamentsService.create(createTournamentDto);
  }

  @Get()
  findAll() {
    return this.tournamentsService.findAll();
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user?: { id: string; role: string },
  ) {
    return this.tournamentsService.findOne(id, user);
  }

  @Get(':id/fields')
  getFieldsByTournament(@Param('id') id: string) {
    return this.tournamentsService.getFieldsByTournament(id);
  }

  @Get(':id/details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getTournamentDetails(@Param('id') id: string) {
    return this.tournamentsService.findOneWithFullDetails(id);
  }

  @Get(':id/fields-with-referees')
  async getFieldsWithReferees(@Param('id') id: string) {
    return this.tournamentsService.getFieldsWithRefereesByTournament(id);
  }

  @Get(':id/referees')
  async getTournamentReferees(@Param('id') id: string) {
    return this.fieldRefereesService.getRefereesByTournament(id);
  }

  @Get('referees/available')
  async getAvailableReferees() {
    return this.fieldRefereesService.getAvailableReferees();
  }

  @Post(':id/fields/:fieldId/referees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async assignFieldReferees(
    @Param('fieldId') fieldId: string,
    @Body() assignmentDto: AssignRefereesDto,
  ) {
    return this.fieldRefereesService.assignRefereesToField(
      fieldId,
      assignmentDto.referees,
    );
  }

  @Delete(':id/fields/:fieldId/referees/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeFieldReferee(
    @Param('fieldId') fieldId: string,
    @Param('userId') userId: string,
  ) {
    return this.fieldRefereesService.removeRefereeFromField(fieldId, userId);
  }

  @Post(':id/referees/batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async batchAssignReferees(@Body() batchDto: BatchAssignRefereesDto) {
    return this.fieldRefereesService.batchAssignReferees(batchDto.assignments);
  }

  @Post(':id/fields/:fieldId/assign-to-match/:matchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async assignMatchToField(
    @Param('fieldId') fieldId: string,
    @Param('matchId') matchId: string,
  ) {
    // This will use the MatchesService method that auto-assigns head referee
    const MatchesService = await import('../matches/matches.service');
    const matchesService = new MatchesService.MatchesService(
      this.tournamentsService['prisma'],
      null as any, // matchScoresService not needed for this operation
    );
    return matchesService.assignMatchToField(matchId, fieldId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateTournamentDto: UpdateTournamentDto,
  ) {
    return this.tournamentsService.update(id, updateTournamentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.tournamentsService.remove(id);
  }
}
