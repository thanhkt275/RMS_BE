import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateMatchDto, CreateAllianceDto } from './dto/create-match.dto';
import { UpdateMatchDto, UpdateAllianceDto } from './dto/update-match.dto';
import { MatchScoresService } from '../match-scores/match-scores.service';
import { MatchState, MatchType } from '../utils/prisma-types';

@Injectable()
export class MatchesService {
  constructor(
    private prisma: PrismaService,
    private matchScoresService: MatchScoresService
  ) {}

  async create(createMatchDto: CreateMatchDto) {
    const { alliances = [], matchType, ...matchData } = createMatchDto;

    // Create the match
    const match = await this.prisma.match.create({
      data: {
        matchNumber: matchData.matchNumber,        status: matchData.status || MatchState.PENDING,
        startTime: matchData.startTime ? new Date(matchData.startTime) : null,
        endTime: matchData.endTime ? new Date(matchData.endTime) : null,
        stageId: matchData.stageId,
        matchType: matchType || MatchType.FULL, // Set matchType, default to 'FULL'
      },
    });    // If alliances are provided, create them
    if (alliances && Array.isArray(alliances) && alliances.length > 0) {
      for (const allianceData of alliances) {
        await this.createAlliance(match.id, allianceData);
      }
    }

    return this.findOne(match.id);
  }

  private async createAlliance(matchId: string, allianceData: CreateAllianceDto) {
    // Create the alliance
    const alliance = await this.prisma.alliance.create({
      data: {
        color: allianceData.color,
        matchId,
      },
    });    // Create team alliances (connecting teams to this alliance)
    for (const teamId of allianceData.teamIds) {
      await this.prisma.teamAlliance.create({
        data: {
          teamId,
          allianceId: alliance.id,
        },
      });
    }

    return alliance;
  }

  /**
   * Find all matches, optionally filtered by fieldId or fieldNumber
   */  findAll(params?: { fieldId?: string; fieldNumber?: number }) {
    const { fieldId, fieldNumber } = params || {};
    const where: any = {};
    if (fieldId) where.fieldId = fieldId;
    if (fieldNumber !== undefined) where.fieldNumber = fieldNumber;
    return this.prisma.match.findMany({
      where,
      include: {
        stage: {
          include: {
            tournament: true,
          },
        },
        alliances: {
          include: {
            teamAlliances: {
              include: {
                team: true,
              },
            },
            matchScores: true,
          },
        },
        scoredBy: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }
  findOne(id: string) {
    return this.prisma.match.findUnique({
      where: { id },
      include: {
        stage: {
          include: {
            tournament: true,
          },
        },
        alliances: {
          include: {
            teamAlliances: {
              include: {
                team: true,
              },
            },
            matchScores: true,
          },
        },
        scoredBy: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  async update(id: string, updateMatchDto: UpdateMatchDto & { fieldId?: string; fieldNumber?: number }) {
    const data: any = {};
    
    if (updateMatchDto.matchNumber !== undefined) {
      data.matchNumber = updateMatchDto.matchNumber;
    }
    
    if (updateMatchDto.status !== undefined) {
      data.status = updateMatchDto.status;
    }
    
    if (updateMatchDto.startTime) {
      data.startTime = updateMatchDto.startTime instanceof Date 
        ? updateMatchDto.startTime 
        : new Date(updateMatchDto.startTime);
    }
    
    if (updateMatchDto.endTime) {
      data.endTime = updateMatchDto.endTime instanceof Date 
        ? updateMatchDto.endTime 
        : new Date(updateMatchDto.endTime);
    }
    
    if (updateMatchDto.scoredById) {
      data.scoredById = updateMatchDto.scoredById;
    }

    if (updateMatchDto.matchType) {
      data.matchType = updateMatchDto.matchType;
    }

    // Handle fieldId and fieldNumber with auto-assignment
    if (updateMatchDto.fieldId) {
      data.fieldId = updateMatchDto.fieldId;
      
      // Fetch the field and auto-assign head referee
      const field = await this.prisma.field.findUnique({
        where: { id: updateMatchDto.fieldId },
        select: { number: true },
      });
      
      if (!field) throw new Error('Field not found');
      data.fieldNumber = field.number;
      
      // Auto-assign head referee if not already assigned and no explicit scoredById
      if (!updateMatchDto.scoredById && !data.scoredById) {
        const headReferee = await this.prisma.fieldReferee.findFirst({
          where: {
            fieldId: updateMatchDto.fieldId,
            isHeadRef: true,
          },
        });
        
        if (headReferee) {
          data.scoredById = headReferee.userId;
        }
      }
      
      return this.prisma.match.update({
        where: { id },
        data,
        include: {
          alliances: true,
          field: {
            include: {
              fieldReferees: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      role: true
                    }
                  }
                }
              }
            }
          },
          scoredBy: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        },
      });
    }
    
    // Allow direct fieldNumber update (if provided, but not recommended)
    if (updateMatchDto.fieldNumber !== undefined) {
      data.fieldNumber = updateMatchDto.fieldNumber;
    }

    return this.prisma.match.update({
      where: { id },
      data,
      include: {
        alliances: true,
      },
    });
  }

  async updateAlliance(id: string, updateAllianceDto: UpdateAllianceDto) {
    const data: any = {};
    
    if (updateAllianceDto.score !== undefined) {
      data.score = updateAllianceDto.score;
    }
    
    if (updateAllianceDto.color) {
      data.color = updateAllianceDto.color;
    }
    
    return this.prisma.alliance.update({
      where: { id },
      data,
    });
  }
  remove(id: string) {
    return this.prisma.match.delete({
      where: { id },
    });
  }

  async assignMatchToField(matchId: string, fieldId: string): Promise<any> {
    // Get the head referee for this field
    const headReferee = await this.prisma.fieldReferee.findFirst({
      where: {
        fieldId: fieldId,
        isHeadRef: true,
      },
    });

    if (!headReferee) {
      throw new Error(`No head referee assigned to field ${fieldId}`);
    }

    // Update the match with field and head referee
    return await this.prisma.match.update({
      where: { id: matchId },
      data: {
        fieldId: fieldId,
        scoredById: headReferee.userId, // Auto-assign head ref as scorer
      },
      include: {
        field: {
          include: {
            fieldReferees: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    role: true
                  }
                }
              }
            }
          }
        },
        scoredBy: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      }
    });
  }
}