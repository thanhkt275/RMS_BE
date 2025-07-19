import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Team, UserRole } from '../../generated/prisma';

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}
  async create(createTournamentDto: CreateTournamentDto) {
    // Create the tournament first
    const tournament = await this.prisma.tournament.create({
      data: {
        name: createTournamentDto.name,
        description: createTournamentDto.description,
        startDate: new Date(createTournamentDto.startDate),
        endDate: new Date(createTournamentDto.endDate),
        adminId: createTournamentDto.adminId,
        numberOfFields: createTournamentDto.numberOfFields,
      },
    });

    // Create fields if numberOfFields is specified and > 0
    if (
      createTournamentDto.numberOfFields &&
      createTournamentDto.numberOfFields > 0
    ) {
      for (let n = 1; n <= createTournamentDto.numberOfFields; n++) {
        await this.prisma.field.create({
          data: {
            tournamentId: tournament.id,
            number: n,
            name: `Field ${n}`,
          },
        });
      }
    }

    return tournament;
  }

  findAll() {
    return this.prisma.tournament.findMany({
      include: {
        admin: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async findOne(id: string, user?: { id: string; role: string }) {
    if (user?.role === UserRole.COMMON) {
      const tournament = await this.prisma.tournament.findUnique({
        where: { id },
      });

      let userTeam: Team | null = null;
      if (user.id) {
        userTeam = await this.prisma.team.findFirst({
          where: { tournamentId: id, userId: user.id },
          include: {
            teamMembers: true,
          },
        });
      }

      return {
        ...tournament,
        userTeam,
      };
    }

    return await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            username: true,
          },
        },
        stages: {
          include: {
            matches: {
              include: {
                alliances: {
                  include: {
                    teamAlliances: {
                      include: {
                        team: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, updateTournamentDto: UpdateTournamentDto) {
    const data: any = {};
    let numberOfFieldsChanged = false;
    let newNumberOfFields: number | undefined;

    if (updateTournamentDto.name) {
      data.name = updateTournamentDto.name;
    }
    if (updateTournamentDto.description !== undefined) {
      data.description = updateTournamentDto.description;
    }
    if (updateTournamentDto.startDate) {
      data.startDate = new Date(updateTournamentDto.startDate);
    }
    if (updateTournamentDto.endDate) {
      data.endDate = new Date(updateTournamentDto.endDate);
    }
    if (updateTournamentDto.numberOfFields !== undefined) {
      data.numberOfFields = updateTournamentDto.numberOfFields;
      numberOfFieldsChanged = true;
      newNumberOfFields = updateTournamentDto.numberOfFields;
    }

    // Update tournament first
    const updatedTournament = await this.prisma.tournament.update({
      where: { id },
      data,
    });

    // Handle field creation/deletion if numberOfFields changed
    if (numberOfFieldsChanged && newNumberOfFields !== undefined) {
      // Get current fields
      const existingFields = await this.prisma.field.findMany({
        where: { tournamentId: id },
        orderBy: { number: 'asc' },
      });
      if (newNumberOfFields > existingFields.length) {
        // Create new fields as needed
        for (let n = existingFields.length + 1; n <= newNumberOfFields; n++) {
          await this.prisma.field.create({
            data: {
              tournamentId: id,
              number: n,
              name: `Field ${n}`,
            },
          });
        }
      } else if (newNumberOfFields < existingFields.length) {
        // Prevent decrease if any matches are assigned to fields that would be deleted
        const fieldsToDelete = existingFields.filter(
          (f) => f.number > newNumberOfFields,
        );
        const fieldIdsToDelete = fieldsToDelete.map((f) => f.id);
        const matchesOnFields = await this.prisma.match.findFirst({
          where: { fieldId: { in: fieldIdsToDelete } },
        });
        if (matchesOnFields) {
          throw new Error(
            'Cannot decrease numberOfFields: matches are assigned to fields that would be deleted. Please reassign or remove those matches first.',
          );
        }
        // Safe to delete fields
        await this.prisma.field.deleteMany({
          where: { id: { in: fieldIdsToDelete } },
        });
      }
    }
    return updatedTournament;
  }

  remove(id: string) {
    return this.prisma.tournament.delete({
      where: { id },
    });
  }

  async getFieldsByTournament(tournamentId: string) {
    return this.prisma.field.findMany({
      where: { tournamentId },
      orderBy: { number: 'asc' },
    });
  }

  async findOneWithFullDetails(id: string) {
    return this.prisma.tournament.findUnique({
      where: { id },
      include: {
        admin: {
          select: { id: true, username: true, email: true },
        },
        stages: {
          include: {
            _count: { select: { matches: true } },
          },
          orderBy: { startDate: 'asc' },
        },
        fields: {
          include: {
            fieldReferees: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                  },
                },
              },
              orderBy: [{ isHeadRef: 'desc' }, { createdAt: 'asc' }],
            },
            _count: { select: { matches: true } },
          },
          orderBy: { number: 'asc' },
        },
        teams: {
          select: { id: true, teamNumber: true, name: true },
        },
        _count: {
          select: { stages: true, fields: true, teams: true },
        },
      },
    });
  }

  async getFieldsWithRefereesByTournament(tournamentId: string) {
    return this.prisma.field.findMany({
      where: { tournamentId },
      include: {
        fieldReferees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: [{ isHeadRef: 'desc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: {
            matches: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });
  }
}
