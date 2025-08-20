import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTeamDto, CreateTeamMemberDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ImportTeamsDto } from './dto/import-teams.dto';
import { Gender, TeamMember } from '../../generated/prisma';
import { Prisma } from '../../generated/prisma';
import { EmailsService } from '../emails/emails.service';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailsService,
  ) {}

  /**
   * Generate a sequential team number in the format 000001, 000002, etc.
   */
  private async generateNextTeamNumber(tournamentId: string): Promise<string> {
    try {
      const tournament = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { id: true, name: true },
      });

      if (!tournament || !tournament.name) {
        throw new Error(`Tournament not found for ID: ${tournamentId}`);
      }

      const prefix = tournament.name
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');

      const latestTeam = await this.prisma.team.findFirst({
        where: {
          tournamentId: tournament.id,
          teamNumber: { startsWith: prefix },
        },
        orderBy: { teamNumber: 'desc' },
      });

      const latestNumber = latestTeam?.teamNumber
        ? parseInt(latestTeam.teamNumber.replace(prefix, ''), 10) || 0
        : 0;

      const newTeamNumber = `${prefix}${String(latestNumber + 1).padStart(5, '0')}`;
      return newTeamNumber;
    } catch (error) {
      console.error('Error generating team number:', error);
      // Generate a fallback random 6-digit number
      return `TMP${Math.floor(100000 + Math.random() * 900000)}`;
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
    const existingTeam = await this.prisma.team.findUnique({
      where: { teamNumber },
    });
    if (existingTeam && existingTeam.id !== excludeId) {
      throw new BadRequestException(
        `Team with number ${teamNumber} already exists`,
      );
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
        throw new BadRequestException(
          `Invalid teamMembers format: ${error.message}`,
        );
      }
    }
    return input;
  }

  private async createTeamMember(
    createTeamMemberDto: CreateTeamMemberDto,
    teamName: string,
    tournamentName: string,
  ) {
    try {
      const member = await this.prisma.teamMember.create({
        data: {
          name: createTeamMemberDto.name,
          gender: createTeamMemberDto.gender,
          phoneNumber: createTeamMemberDto.phoneNumber,
          email: createTeamMemberDto.email,
          province: createTeamMemberDto.province,
          ward: createTeamMemberDto.ward,
          organization: createTeamMemberDto.organization,
          organizationAddress: createTeamMemberDto.organizationAddress,
          dateOfBirth: new Date(createTeamMemberDto.dateOfBirth),
          team: {
            connect: { id: createTeamMemberDto.teamId },
          },
        },
      });

      if (member.email) {
        await this.emailService.sendTeamAssignmentInvitationEmail(
          member.email,
          teamName,
          tournamentName,
        );
      }

      return member;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create team member: ${error.message}`,
      );
    }
  }

  async createTeam(createTeamDto: CreateTeamDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: createTeamDto.tournamentId },
    });

    if (!tournament) {
      throw new BadRequestException(
        `Tournament with ID ${createTeamDto.tournamentId} does not exist.`,
      );
    }

    const teamNumber = await this.generateNextTeamNumber(tournament.id);

    try {
      const createdTeam = await this.prisma.team.create({
        data: {
          teamNumber,
          name: createTeamDto.name,
          referralSource: createTeamDto.referralSource,
          tournament: {
            connect: { id: tournament.id },
          },
          user: {
            connect: { id: createTeamDto.userId },
          },
        },
        include: {
          tournament: true,
        },
      });

      const createdMembers = await Promise.all(
        createTeamDto.teamMembers.map((memberDto) =>
          this.createTeamMember(
            {
              ...memberDto,
              teamId: createdTeam.id,
            },
            createTeamDto.name,
            tournament.name,
          ),
        ),
      );

      return {
        ...createdTeam,
        teamMembers: createdMembers,
      };
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

  async update(updateTeamDto: UpdateTeamDto) {
    if (!updateTeamDto.id) {
      throw new Error('Team ID is required');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: updateTeamDto.id },
      include: { tournament: true },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const teamMemberUpdates = updateTeamDto.teamMembers ?? [];

    const existingMembers = await this.prisma.teamMember.findMany({
      where: { teamId: updateTeamDto.id },
      select: { id: true },
    });

    const incomingIds = teamMemberUpdates
      .filter((member) => member.id)
      .map((member) => member.id);

    const idsToDelete = existingMembers
      .map((member) => member.id)
      .filter((id) => !incomingIds.includes(id));

    if (idsToDelete.length > 0) {
      await this.prisma.teamMember.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    for (const member of teamMemberUpdates) {
      const { id, ...fields } = member;

      const data = Object.fromEntries(
        Object.entries(fields)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => {
            if (k === "dateOfBirth" && typeof v === "string") {
              return [k, new Date(v)];
            }
            return [k, v];
          }),
      );
      console.log('hell', data);

      if (id) {
        if (Object.keys(data).length > 0) {
          await this.prisma.teamMember.update({
            where: { id },
            data,
          });
        }
      } else {
        await this.createTeamMember(
          {
            name: data.name!,
            email: data.email!,
            phoneNumber: data.phoneNumber!,
            province: data.province!,
            ward: data.ward!,
            organization: data.organization!,
            organizationAddress: data.organizationAddress!,
            teamId: updateTeamDto.id,
            dateOfBirth: data.dateOfBirth!,
          },
          team.name,
          team.tournament.name,
        );
      }
    }

    const teamData: any = {};
    if (updateTeamDto.name !== undefined) teamData.name = updateTeamDto.name;
    if (updateTeamDto.referralSource !== undefined)
      teamData.referralSource = updateTeamDto.referralSource;

    try {
      return this.prisma.team.update({
        where: { id: updateTeamDto.id },
        data: teamData,
        include: { tournament: true, teamMembers: true },
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
  /*async importTeams(importTeamsDto: ImportTeamsDto) {
    const {
      content,
      format,
      hasHeader = false,
      delimiter = ',',
      tournamentId,
    } = importTeamsDto;
    try {
      const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
      const dataLines = hasHeader ? lines.slice(1) : lines;
      if (dataLines.length === 0) {
        throw new BadRequestException('No team data found in the content');
      }
      const teamsToCreate: TeamData[] = dataLines.map((line) => {
        const parts = line.split(delimiter).map((part) => part.trim());
        if (!parts[0]) {
          throw new BadRequestException(
            `Invalid line format: ${line}. Expected at least team name`,
          );
        }
        return {
          name: parts[0],
          organization:
            parts[1] !== undefined && parts[1] !== '' ? parts[1] : undefined,
          description:
            parts[2] !== undefined && parts[2] !== '' ? parts[2] : undefined,
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
              description: teamData.description,
              tournamentId: tournamentId,
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
  }*/
}
