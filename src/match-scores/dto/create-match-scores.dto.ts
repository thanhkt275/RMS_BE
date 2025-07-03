import { IsInt, IsString, IsOptional, IsNumber, IsArray, IsObject, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GameElementDto {
  @ApiProperty({ description: 'Game element name', example: 'ball' })
  @IsString()
  element: string;

  @ApiProperty({ description: 'Number of elements collected', example: 3 })
  @IsInt()
  count: number;

  @ApiProperty({ description: 'Points per element', example: 20 })
  @IsInt()
  pointsEach: number;

  @ApiProperty({ description: 'Total points for this element', example: 60 })
  @IsInt()
  totalPoints: number;

  @ApiProperty({ description: 'Scoring operation (add, subtract, multiply)', example: 'multiply' })
  @IsString()
  operation: string;
}

export class CreateMatchScoresDto {
  @ApiProperty({ description: 'Match ID to associate scores with' })
  @IsString()
  matchId: string;
  
  // Red Alliance Scores
  @ApiProperty({ description: 'Red alliance autonomous period score', default: 0 })
  @IsInt()
  @IsOptional()
  redAutoScore?: number;
  
  @ApiProperty({ description: 'Red alliance driver-controlled period score', default: 0 })
  @IsInt()
  @IsOptional()
  redDriveScore?: number;
  
  @ApiProperty({ description: 'Red alliance total score', default: 0 })
  @IsInt()
  @IsOptional()
  redTotalScore?: number;
  
  // Blue Alliance Scores
  @ApiProperty({ description: 'Blue alliance autonomous period score', default: 0 })
  @IsInt()
  @IsOptional()
  blueAutoScore?: number;
  
  @ApiProperty({ description: 'Blue alliance driver-controlled period score', default: 0 })
  @IsInt()
  @IsOptional()
  blueDriveScore?: number;
  
  @ApiProperty({ description: 'Blue alliance total score', default: 0 })
  @IsInt()
  @IsOptional()
  blueTotalScore?: number;
  
  // Game Elements
  @ApiProperty({ 
    description: 'Red alliance game elements scoring details', 
    type: [GameElementDto], 
    required: false 
  })
  @IsArray()
  @IsOptional()
  redGameElements?: GameElementDto[];
  
  @ApiProperty({ 
    description: 'Blue alliance game elements scoring details', 
    type: [GameElementDto], 
    required: false 
  })
  @IsArray()
  @IsOptional()
  blueGameElements?: GameElementDto[];
  
  // Team Count and Multipliers
  @ApiProperty({ description: 'Number of teams in red alliance (1-4)', default: 0 })
  @IsInt()
  @Min(0)
  @Max(4)
  @IsOptional()
  redTeamCount?: number;
  
  @ApiProperty({ 
    description: 'Red alliance score multiplier (1.25 for 1 team, 1.5 for 2 teams, 1.75 for 3 teams, 2.0 for 4 teams)',
    default: 1.0
  })
  @IsNumber()
  @IsOptional()
  redMultiplier?: number;
  
  @ApiProperty({ description: 'Number of teams in blue alliance (1-4)', default: 0 })
  @IsInt()
  @Min(0)
  @Max(4)
  @IsOptional()
  blueTeamCount?: number;
  
  @ApiProperty({ 
    description: 'Blue alliance score multiplier (1.25 for 1 team, 1.5 for 2 teams, 1.75 for 3 teams, 2.0 for 4 teams)',
    default: 1.0
  })
  @IsNumber()
  @IsOptional()
  blueMultiplier?: number;
  
  // Additional Score Details
  @ApiProperty({ description: 'Additional score details as JSON', required: false })
  @IsObject()
  @IsOptional()
  scoreDetails?: Record<string, any>;
}