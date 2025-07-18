import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateScoreConfigDto, CreateScoreElementDto, CreateBonusConditionDto, CreatePenaltyConditionDto } from './dto';

@Injectable()
export class ScoreConfigService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.scoreConfig.findMany({
      include: {
        scoreElements: { orderBy: { displayOrder: 'asc' } },
        bonusConditions: { orderBy: { displayOrder: 'asc' } },
        penaltyConditions: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }

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

  // Update Score Element
  async updateScoreElement(elementId: string, data: Partial<CreateScoreElementDto>) {
    const element = await this.prisma.scoreElement.findUnique({ where: { id: elementId } });
    if (!element) throw new NotFoundException(`Score element with ID ${elementId} not found`);
    return this.prisma.scoreElement.update({ where: { id: elementId }, data });
  }

  // Delete Score Element
  async deleteScoreElement(elementId: string) {
    const element = await this.prisma.scoreElement.findUnique({ where: { id: elementId } });
    if (!element) throw new NotFoundException(`Score element with ID ${elementId} not found`);
    return this.prisma.scoreElement.delete({ where: { id: elementId } });
  }

  // Update Bonus Condition
  async updateBonusCondition(bonusId: string, data: Partial<CreateBonusConditionDto>) {
    const bonus = await this.prisma.bonusCondition.findUnique({ where: { id: bonusId } });
    if (!bonus) throw new NotFoundException(`Bonus condition with ID ${bonusId} not found`);
    return this.prisma.bonusCondition.update({ where: { id: bonusId }, data });
  }

  // Delete Bonus Condition
  async deleteBonusCondition(bonusId: string) {
    const bonus = await this.prisma.bonusCondition.findUnique({ where: { id: bonusId } });
    if (!bonus) throw new NotFoundException(`Bonus condition with ID ${bonusId} not found`);
    return this.prisma.bonusCondition.delete({ where: { id: bonusId } });
  }

  // Update Penalty Condition
  async updatePenaltyCondition(penaltyId: string, data: Partial<CreatePenaltyConditionDto>) {
    const penalty = await this.prisma.penaltyCondition.findUnique({ where: { id: penaltyId } });
    if (!penalty) throw new NotFoundException(`Penalty condition with ID ${penaltyId} not found`);
    return this.prisma.penaltyCondition.update({ where: { id: penaltyId }, data });
  }

  // Delete Penalty Condition
  async deletePenaltyCondition(penaltyId: string) {
    const penalty = await this.prisma.penaltyCondition.findUnique({ where: { id: penaltyId } });
    if (!penalty) throw new NotFoundException(`Penalty condition with ID ${penaltyId} not found`);
    return this.prisma.penaltyCondition.delete({ where: { id: penaltyId } });
  }

  // Assign ScoreConfig to Tournament
  async assignToTournament(scoreConfigId: string, tournamentId: string) {
    // Ensure both exist
    const scoreConfig = await this.prisma.scoreConfig.findUnique({ where: { id: scoreConfigId } });
    if (!scoreConfig) throw new NotFoundException(`Score config with ID ${scoreConfigId} not found`);
    // Update the scoreConfig's tournamentId
    return this.prisma.scoreConfig.update({ where: { id: scoreConfigId }, data: { tournamentId } });
  }

  async assignToTournaments(scoreConfigId: string, tournamentIds: string[]) {
    // Unassign this config from all tournaments first (if needed)
    await this.prisma.scoreConfig.updateMany({
      where: { id: scoreConfigId },
      data: { tournamentId: null },
    });

    // Assign to each tournament (if you want to allow one config to be used by multiple tournaments,
    // you may need a join table; but your schema only allows one tournament per config)
    // So, you may want to clone the config for each tournament, or just assign to the first one:
    if (tournamentIds.length > 0) {
      return this.prisma.scoreConfig.update({
        where: { id: scoreConfigId },
        data: { tournamentId: tournamentIds[0] },
      });
    }
    return { message: 'No tournaments assigned' };
  }
}
