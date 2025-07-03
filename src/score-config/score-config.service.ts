import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateScoreConfigDto, CreateScoreElementDto, CreateBonusConditionDto, CreatePenaltyConditionDto } from './dto';

@Injectable()
export class ScoreConfigService {
  constructor(private prisma: PrismaService) {}

  async createScoreConfig(data: CreateScoreConfigDto) {
    const { scoreElements, bonusConditions, penaltyConditions, ...configData } = data;
    
    return this.prisma.$transaction(async (prisma) => {
      // Create the score config
      const scoreConfig = await prisma.scoreConfig.create({
        data: {
          ...configData,
          scoreElements: {
            create: scoreElements?.map((element, index) => ({
              ...element,
              displayOrder: element.displayOrder ?? index,
            })) || [],
          },
          bonusConditions: {
            create: bonusConditions?.map((bonus, index) => ({
              ...bonus,
              displayOrder: bonus.displayOrder ?? index,
            })) || [],
          },
          penaltyConditions: {
            create: penaltyConditions?.map((penalty, index) => ({
              ...penalty,
              displayOrder: penalty.displayOrder ?? index,
            })) || [],
          },
        },
        include: {
          scoreElements: {
            orderBy: { displayOrder: 'asc' },
          },
          bonusConditions: {
            orderBy: { displayOrder: 'asc' },
          },
          penaltyConditions: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });
      
      return scoreConfig;
    });
  }

  async getScoreConfigForTournament(tournamentId: string) {
    return this.prisma.scoreConfig.findFirst({
      where: { tournamentId },
      include: {
        scoreElements: {
          orderBy: { displayOrder: 'asc' },
        },
        bonusConditions: {
          orderBy: { displayOrder: 'asc' },
        },
        penaltyConditions: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  async getScoreConfigById(id: string) {
    const scoreConfig = await this.prisma.scoreConfig.findUnique({
      where: { id },
      include: {
        scoreElements: {
          orderBy: { displayOrder: 'asc' },
        },
        bonusConditions: {
          orderBy: { displayOrder: 'asc' },
        },
        penaltyConditions: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!scoreConfig) {
      throw new NotFoundException(`Score config with ID ${id} not found`);
    }

    return scoreConfig;
  }

  async addScoreElement(scoreConfigId: string, data: CreateScoreElementDto) {
    // Check if score config exists
    const scoreConfig = await this.prisma.scoreConfig.findUnique({
      where: { id: scoreConfigId },
    });

    if (!scoreConfig) {
      throw new NotFoundException(`Score config with ID ${scoreConfigId} not found`);
    }

    // Get the current max display order
    const maxOrder = await this.prisma.scoreElement.findFirst({
      where: { scoreConfigId },
      orderBy: { displayOrder: 'desc' },
    });

    return this.prisma.scoreElement.create({
      data: {
        ...data,
        scoreConfigId,
        displayOrder: data.displayOrder ?? ((maxOrder?.displayOrder || 0) + 1),
      },
    });
  }

  async addBonusCondition(scoreConfigId: string, data: CreateBonusConditionDto) {
    // Check if score config exists
    const scoreConfig = await this.prisma.scoreConfig.findUnique({
      where: { id: scoreConfigId },
    });

    if (!scoreConfig) {
      throw new NotFoundException(`Score config with ID ${scoreConfigId} not found`);
    }

    // Get the current max display order
    const maxOrder = await this.prisma.bonusCondition.findFirst({
      where: { scoreConfigId },
      orderBy: { displayOrder: 'desc' },
    });

    return this.prisma.bonusCondition.create({
      data: {
        ...data,
        scoreConfigId,
        displayOrder: data.displayOrder ?? ((maxOrder?.displayOrder || 0) + 1),
      },
    });
  }

  async addPenaltyCondition(scoreConfigId: string, data: CreatePenaltyConditionDto) {
    // Check if score config exists
    const scoreConfig = await this.prisma.scoreConfig.findUnique({
      where: { id: scoreConfigId },
    });

    if (!scoreConfig) {
      throw new NotFoundException(`Score config with ID ${scoreConfigId} not found`);
    }

    // Get the current max display order
    const maxOrder = await this.prisma.penaltyCondition.findFirst({
      where: { scoreConfigId },
      orderBy: { displayOrder: 'desc' },
    });

    return this.prisma.penaltyCondition.create({
      data: {
        ...data,
        scoreConfigId,
        displayOrder: data.displayOrder ?? ((maxOrder?.displayOrder || 0) + 1),
      },
    });
  }
}
