import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { FieldRefereesService } from './field-referees.service';
import { 
  AssignRefereesDto, 
  BatchAssignRefereesDto 
} from './dto/referee-assignment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../utils/prisma-types';

@Controller('field-referees')
@UseGuards(JwtAuthGuard)
export class FieldRefereesController {
  constructor(private readonly fieldRefereesService: FieldRefereesService) {}

  @Get('available')
  async getAvailableReferees() {
    return this.fieldRefereesService.getAvailableReferees();
  }

  @Get('fields/:fieldId')
  async getFieldReferees(@Param('fieldId') fieldId: string) {
    return this.fieldRefereesService.getFieldReferees(fieldId);
  }

  @Get('tournaments/:tournamentId')
  async getRefereesByTournament(@Param('tournamentId') tournamentId: string) {
    return this.fieldRefereesService.getRefereesByTournament(tournamentId);
  }

  @Get('tournaments/:tournamentId/available')
  async getAvailableRefereesForTournament(@Param('tournamentId') tournamentId: string) {
    return this.fieldRefereesService.getAvailableRefereesForTournament(tournamentId);
  }

  @Post('fields/:fieldId/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async assignRefereesToField(
    @Param('fieldId') fieldId: string,
    @Body() assignRefereesDto: AssignRefereesDto
  ) {
    return this.fieldRefereesService.assignRefereesToField(
      fieldId, 
      assignRefereesDto.referees
    );
  }

  @Post('fields/:fieldId/add')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async addRefereesToField(
    @Param('fieldId') fieldId: string,
    @Body() assignRefereesDto: AssignRefereesDto
  ) {
    return this.fieldRefereesService.addRefereesToField(
      fieldId, 
      assignRefereesDto.referees
    );
  }

  @Post('batch-assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async batchAssignReferees(@Body() batchAssignDto: BatchAssignRefereesDto) {
    return this.fieldRefereesService.batchAssignReferees(batchAssignDto.assignments);
  }

  @Delete('fields/:fieldId/referees/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRefereeFromField(
    @Param('fieldId') fieldId: string,
    @Param('userId') userId: string
  ) {
    await this.fieldRefereesService.removeRefereeFromField(fieldId, userId);
  }

  @Post('fields/:fieldId/replace')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async replaceAllRefereesForField(
    @Param('fieldId') fieldId: string,
    @Body() assignRefereesDto: AssignRefereesDto
  ) {
    return this.fieldRefereesService.replaceAllRefereesForField(
      fieldId, 
      assignRefereesDto.referees
    );
  }

  @Get('fields/:fieldId/debug')
  async getFieldRefereeAssignmentDetails(
    @Param('fieldId') fieldId: string,
    @Param('userId') userId?: string
  ) {
    return this.fieldRefereesService.getFieldRefereeAssignmentDetails(fieldId, userId);
  }
}
