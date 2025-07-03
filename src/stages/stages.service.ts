import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService) {}

  create(createStageDto: CreateStageDto) {
    return this.prisma.stage.create({
      data: {
        name: createStageDto.name,
        type: createStageDto.type,
        startDate: new Date(createStageDto.startDate),
        endDate: new Date(createStageDto.endDate),
        tournamentId: createStageDto.tournamentId,
      },
    });
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

  update(id: string, updateStageDto: UpdateStageDto) {
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
    
    return this.prisma.stage.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.stage.delete({
      where: { id },
    });
  }
}