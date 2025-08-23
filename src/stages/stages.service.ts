import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailsService } from '../emails/emails.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class StagesService {
  constructor(
    private prisma: PrismaService,
    private emailsService: EmailsService,
  ) {}

  async create(createStageDto: CreateStageDto) {
    // Create the stage
    const stage = await this.prisma.stage.create({
      data: {
        name: createStageDto.name,
        type: createStageDto.type,
        startDate: new Date(createStageDto.startDate),
        endDate: new Date(createStageDto.endDate),
        tournamentId: createStageDto.tournamentId,
      },
      include: {
        tournament: true,
      },
    });

    // Send email notifications to teams in this stage
    await this.sendStageNotificationEmails(stage.id, true);

    return stage;
  }

  findAll() {
    return this.prisma.stage.findMany({
      include: {
        tournament: true,
      },
    });
  }

  findByTournament(tournamentId: string) {
    return this.prisma.stage.findMany({
      where: {
        tournamentId: tournamentId,
      },
      include: {
        tournament: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.stage.findUnique({
      where: { id },
      include: {
        tournament: true,
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
    });
  }

  async update(id: string, updateStageDto: UpdateStageDto) {
    const data: any = {};

    if (updateStageDto.name) {
      data.name = updateStageDto.name;
    }

    if (updateStageDto.type) {
      data.type = updateStageDto.type;
    }

    if (updateStageDto.startDate) {
      data.startDate = new Date(updateStageDto.startDate);
    }

    if (updateStageDto.endDate) {
      data.endDate = new Date(updateStageDto.endDate);
    }

    const updatedStage = await this.prisma.stage.update({
      where: { id },
      data,
      include: {
        tournament: true,
      },
    });

    // Send email notifications to teams in this stage about the update
    await this.sendStageNotificationEmails(id, false);

    return updatedStage;
  }

  remove(id: string) {
    return this.prisma.stage.delete({
      where: { id },
    });
  }

  async getStageTeams(stageId: string) {
    return this.prisma.team.findMany({
      where: {
        currentStageId: stageId,
      },
      orderBy: {
        teamNumber: 'asc',
      },
    });
  }

  /**
   * Send email notifications to all teams in a stage about stage schedule updates
   */
  private async sendStageNotificationEmails(stageId: string, isNewStage: boolean) {
    try {
      // Get stage details with tournament information
      const stage = await this.prisma.stage.findUnique({
        where: { id: stageId },
        include: {
          tournament: true,
          teams: {
            include: {
              teamMembers: {
                where: {
                  email: {
                    not: null,
                  },
                },
              },
            },
          },
        },
      });

      if (!stage) {
        console.warn(`Stage with ID ${stageId} not found for email notifications`);
        return;
      }

      // Format dates for email
      const stageStartDate = stage.startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const stageEndDate = stage.endDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Send emails to all team members with email addresses
      const emailPromises: Promise<void>[] = [];

      for (const team of stage.teams) {
        for (const member of team.teamMembers) {
          if (member.email) {
            emailPromises.push(
              this.emailsService.sendStageScheduleNotification(
                member.email,
                team.name,
                stage.tournament.name,
                stage.name,
                stage.type,
                stageStartDate,
                stageEndDate,
                isNewStage,
              ),
            );
          }
        }
      }

      // Send all emails concurrently
      await Promise.allSettled(emailPromises);

      console.log(`Sent ${emailPromises.length} stage notification emails for stage ${stage.name}`);
    } catch (error) {
      console.error('Error sending stage notification emails:', error);
      // Don't throw the error to avoid breaking stage creation/update
    }
  }
}