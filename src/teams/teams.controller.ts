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
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ImportTeamsDto } from './dto/import-teams.dto';
import { BulkCreateTeamsDto } from './dto/bulk-create-teams.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../utils/prisma-types';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user, @Body() createTeamDto: CreateTeamDto) {
    createTeamDto.userId = user.id;
    return this.teamsService.createTeam(createTeamDto);
  }

  @Post('bulk-create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  bulkCreate(@CurrentUser() user, @Body() bulkCreateTeamsDto: BulkCreateTeamsDto) {
    return this.teamsService.bulkCreateTeams(bulkCreateTeamsDto, user.id);
  }

  /*@Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  importTeams(@Body() importTeamsDto: ImportTeamsDto) {
    return this.teamsService.importTeams(importTeamsDto);
  }*/

  @Get()
  findAll(@Query('tournamentId') tournamentId?: string) {
    return this.teamsService.findAll(tournamentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Patch()
  update(@CurrentUser() user, @Body() updateTeamDto: UpdateTeamDto) {
    return this.teamsService.update(updateTeamDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }
}
