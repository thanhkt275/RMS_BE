import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ImportTeamsDto } from './dto/import-teams.dto';

interface TeamData {
  name: string;
  organization?: string;
  description?: string;
}

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Generate a sequential team number in the format 000001, 000002, etc.
   */
  private async generateNextTeamNumber(): Promise<string> {
    try {
      const allTeams = await this.prisma.team.findMany({
        select: {
          teamNumber: true
        }
      });

      let highestNumber = 0;

      for (const team of allTeams) {
        const cleanNumber = team.teamNumber.replace(/^0+/, '');

        if (/^\d+$/.test(cleanNumber)) {
          const num = parseInt(cleanNumber, 10);
          if (num > highestNumber) {
            highestNumber = num;
          }
        }
      }

      const nextNumber = highestNumber + 1;
      return nextNumber.toString().padStart(6, '0');
    } catch (error) {
      console.error("Error generating team number:", error);
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
  }

  /**
   * Check if a team exists by ID. Throws NotFoundException if not found.
   */
  private async ensureTeamExistsById(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }
    return team;
  }

  /**
   * Check if a team number is unique (not used by another team).
   * Throws BadRequestException if not unique.
   */
  private async ensureTeamNumberUnique(teamNumber: string, excludeId?: string) {
    const existingTeam = await this.prisma.team.findUnique({ where: { teamNumber } });
    if (existingTeam && existingTeam.id !== excludeId) {
      throw new BadRequestException(`Team with number ${teamNumber} already exists`);
    }
  }

  /**
   * Parse teamMembers from DTO, handling string/array/object.
   */
  private parseTeamMembers(input: any): any {
    if (input === undefined) return undefined;
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
      try {
        return JSON.parse(input);
      } catch (error) {
        throw new BadRequestException(`Invalid teamMembers format: ${error.message}`);
      }
    }
    return input;
  }

  async create(createTeamDto: CreateTeamDto) {
    const teamNumber = createTeamDto.teamNumber || await this.generateNextTeamNumber();
    await this.ensureTeamNumberUnique(teamNumber);
    const teamMembers = this.parseTeamMembers(createTeamDto.teamMembers);
    try {
      return this.prisma.team.create({
        data: {
          teamNumber,
          name: createTeamDto.name,
          organization: createTeamDto.organization,
          avatar: createTeamDto.avatar,
          description: createTeamDto.description,
          teamMembers,
          tournamentId: createTeamDto.tournamentId,
        },
        include: { tournament: true },
      });
    } catch (error) {
      throw new BadRequestException(`Failed to create team: ${error.message}`);
    }
  }

  findAll(tournamentId?: string) {
    const where = tournamentId ? { tournamentId } : {};

    return this.prisma.team.findMany({
      where,
      include: {
        tournament: true,
      },
      orderBy: {
        teamNumber: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        tournament: true,
        teamAlliances: {
          include: {
            alliance: {
              include: {
                match: {
                  include: {
                    stage: {
                      include: { tournament: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }
    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto) {
    await this.ensureTeamExistsById(id);
    if (updateTeamDto.teamNumber) {
      await this.ensureTeamNumberUnique(updateTeamDto.teamNumber, id);
    }
    const teamMembers = this.parseTeamMembers(updateTeamDto.teamMembers);
    try {
      return this.prisma.team.update({
        where: { id },
        data: {
          teamNumber: updateTeamDto.teamNumber,
          name: updateTeamDto.name,
          organization: updateTeamDto.organization,
          avatar: updateTeamDto.avatar,
          description: updateTeamDto.description,
          teamMembers,
          tournamentId: updateTeamDto.tournamentId,
        },
        include: { tournament: true },
      });
    } catch (error) {
      throw new BadRequestException(`Failed to update team: ${error.message}`);
    }
  }

  async remove(id: string) {
    await this.ensureTeamExistsById(id);
    return this.prisma.team.delete({ where: { id } });
  }

  /**
   * Import multiple teams from CSV content or copy-pasted text
   */
  async importTeams(importTeamsDto: ImportTeamsDto) {
    const { content, format, hasHeader = false, delimiter = ',', tournamentId } = importTeamsDto;
    try {
      const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
      const dataLines = hasHeader ? lines.slice(1) : lines;
      if (dataLines.length === 0) {
        throw new BadRequestException('No team data found in the content');
      }
      const teamsToCreate: TeamData[] = dataLines.map(line => {
        const parts = line.split(delimiter).map(part => part.trim());
        if (!parts[0]) {
          throw new BadRequestException(`Invalid line format: ${line}. Expected at least team name`);
        }
        return {
          name: parts[0],
          organization: parts[1] !== undefined && parts[1] !== '' ? parts[1] : undefined,
          description: parts[2] !== undefined && parts[2] !== '' ? parts[2] : undefined,
        };
      });
      const createdTeams: any[] = [];
      for (const teamData of teamsToCreate) {
        try {
          const teamNumber = await this.generateNextTeamNumber();
          await this.ensureTeamNumberUnique(teamNumber);
          const team = await this.prisma.team.create({
            data: {
              teamNumber,
              name: teamData.name,
              organization: teamData.organization,
              description: teamData.description,
              tournamentId: tournamentId || null,
            },
            include: { tournament: true },
          });
          createdTeams.push(team);
        } catch (error) {
          console.error(`Error creating team ${teamData.name}:`, error);
        }
      }
      return {
        success: true,
        message: `Successfully imported ${createdTeams.length} teams`,
        teams: createdTeams,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to import teams: ${error.message}`);
    }
  }
}