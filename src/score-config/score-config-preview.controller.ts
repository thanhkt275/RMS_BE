import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
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
import { ScoreConfigPreviewService, ScoreConfigPreview, ValidationError } from './score-config-preview.service';

@ApiTags('score-config-preview')
@Controller('score-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ScoreConfigPreviewController {
  constructor(
    private readonly previewService: ScoreConfigPreviewService,
  ) {}

  @Get(':id/preview')
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE)
  @ApiOperation({ summary: 'Get real-time preview data for a score configuration' })
  @ApiParam({ name: 'id', description: 'Score configuration ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns the score configuration preview with sample calculations and validation',
    type: Object // Could create a proper DTO class for this
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Score configuration not found'
  })
  async getPreview(@Param('id') configId: string): Promise<ScoreConfigPreview> {
    return this.previewService.generatePreview(configId);
  }

  @Get(':id/validation')
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE)
  @ApiOperation({ summary: 'Get validation messages for a score configuration' })
  @ApiParam({ name: 'id', description: 'Score configuration ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns validation errors and warnings for the configuration',
    type: [Object] // ValidationError array
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Score configuration not found'
  })
  async getValidationMessages(@Param('id') configId: string): Promise<ValidationError[]> {
    return this.previewService.getValidationMessages(configId);
  }

  @Post(':id/sample-calculation')
  @Roles(UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE)
  @ApiOperation({ summary: 'Generate sample calculation for testing score configuration' })
  @ApiParam({ name: 'id', description: 'Score configuration ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns sample calculation results for the configuration'
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Score configuration not found'
  })
  async generateSampleCalculation(
    @Param('id') configId: string,
    @Body() customData?: Record<string, number>
  ): Promise<ScoreConfigPreview> {
    return this.previewService.generateSampleCalculation(configId, customData);
  }
}
