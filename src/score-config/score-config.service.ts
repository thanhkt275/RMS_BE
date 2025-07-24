import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateScoreConfigDto, CreateScoreElementDto, CreateBonusConditionDto, CreatePenaltyConditionDto, CreateScoreSectionDto, UpdateScoreSectionDto } from './dto';
import { FormulaEvaluatorService } from './formula-evaluator.service';

@Injectable()
export class ScoreConfigService {
  constructor(
    private prisma: PrismaService,
    private formulaEvaluator: FormulaEvaluatorService,
  ) {}

  async findAll() {
    return this.prisma.scoreConfig.findMany({
      include: {
        scoreSections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            scoreElements: { orderBy: { displayOrder: 'asc' } },
            bonusConditions: { orderBy: { displayOrder: 'asc' } },
            penaltyConditions: { orderBy: { displayOrder: 'asc' } },
          },
        },
        scoreElements: { orderBy: { displayOrder: 'asc' } },
        bonusConditions: { orderBy: { displayOrder: 'asc' } },
        penaltyConditions: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }

  async createScoreConfig(data: CreateScoreConfigDto) {
    const { scoreElements, bonusConditions, penaltyConditions, scoreSections, totalScoreFormula, ...configData } = data;
    
    // Validate formula if provided
    if (totalScoreFormula && scoreSections) {
      const sectionCodes = [...scoreSections.map(section => section.code)];
      
      // Add bonus/penalty section codes if they exist
      if (bonusConditions && bonusConditions.length > 0) sectionCodes.push('bonus');
      if (penaltyConditions && penaltyConditions.length > 0) sectionCodes.push('penalty');
      
      const validation = this.formulaEvaluator.validateFormulaSyntax(totalScoreFormula, sectionCodes);
      if (!validation.isValid) {
        throw new BadRequestException(`Invalid formula: ${validation.error}`);
      }
    }
    
    return this.prisma.$transaction(async (prisma) => {
      // Create the score config
      const scoreConfig = await prisma.scoreConfig.create({
        data: {
          ...configData,
          totalScoreFormula,
          scoreSections: {
            create: scoreSections?.map((section, index) => ({
              name: section.name,
              code: section.code,
              description: section.description,
              displayOrder: section.displayOrder ?? index,
              scoreElements: {
                create: section.scoreElements?.map((element, elemIndex) => ({
                  name: element.name,
                  code: element.code,
                  description: element.description,
                  pointsPerUnit: element.pointsPerUnit,
                  category: element.category,
                  elementType: element.elementType,
                  icon: element.icon,
                  color: element.color,
                  displayOrder: element.displayOrder ?? elemIndex,
                })) || [],
              },
              bonusConditions: {
                create: section.bonusConditions?.map((bonus, bonusIndex) => ({
                  name: bonus.name,
                  code: bonus.code,
                  description: bonus.description,
                  bonusPoints: bonus.bonusPoints,
                  condition: bonus.condition,
                  displayOrder: bonus.displayOrder ?? bonusIndex,
                })) || [],
              },
              penaltyConditions: {
                create: section.penaltyConditions?.map((penalty, penaltyIndex) => ({
                  name: penalty.name,
                  code: penalty.code,
                  description: penalty.description,
                  penaltyPoints: penalty.penaltyPoints,
                  condition: penalty.condition,
                  displayOrder: penalty.displayOrder ?? penaltyIndex,
                })) || [],
              },
            })) || [],
          },
          scoreElements: {
            create: scoreElements?.map((element, index) => ({
              name: element.name,
              code: element.code,
              description: element.description,
              pointsPerUnit: element.pointsPerUnit,
              category: element.category,
              elementType: element.elementType,
              icon: element.icon,
              color: element.color,
              displayOrder: element.displayOrder ?? index,
            })) || [],
          },
          bonusConditions: {
            create: bonusConditions?.map((bonus, index) => ({
              name: bonus.name,
              code: bonus.code,
              description: bonus.description,
              bonusPoints: bonus.bonusPoints,
              condition: bonus.condition,
              displayOrder: bonus.displayOrder ?? index,
            })) || [],
          },
          penaltyConditions: {
            create: penaltyConditions?.map((penalty, index) => ({
              name: penalty.name,
              code: penalty.code,
              description: penalty.description,
              penaltyPoints: penalty.penaltyPoints,
              condition: penalty.condition,
              displayOrder: penalty.displayOrder ?? index,
            })) || [],
          },
        },
        include: {
          scoreSections: {
            orderBy: { displayOrder: 'asc' },
            include: {
              scoreElements: { orderBy: { displayOrder: 'asc' } },
              bonusConditions: { orderBy: { displayOrder: 'asc' } },
              penaltyConditions: { orderBy: { displayOrder: 'asc' } },
            },
          },
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
        scoreSections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            scoreElements: { orderBy: { displayOrder: 'asc' } },
            bonusConditions: { orderBy: { displayOrder: 'asc' } },
            penaltyConditions: { orderBy: { displayOrder: 'asc' } },
          },
        },
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
        scoreSections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            scoreElements: { orderBy: { displayOrder: 'asc' } },
            bonusConditions: { orderBy: { displayOrder: 'asc' } },
            penaltyConditions: { orderBy: { displayOrder: 'asc' } },
          },
        },
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

  // Score Section Management Methods
  async addScoreSection(scoreConfigId: string, data: CreateScoreSectionDto) {
    const scoreConfig = await this.prisma.scoreConfig.findUnique({
      where: { id: scoreConfigId },
      include: { scoreSections: true },
    });

    if (!scoreConfig) {
      throw new NotFoundException(`Score config with ID ${scoreConfigId} not found`);
    }

    // Get the current max display order
    const maxOrder = await this.prisma.scoreSection.findFirst({
      where: { scoreConfigId },
      orderBy: { displayOrder: 'desc' },
    });

    const { scoreElements, bonusConditions, penaltyConditions, ...sectionData } = data;

    return this.prisma.$transaction(async (prisma) => {
      const section = await prisma.scoreSection.create({
        data: {
          ...sectionData,
          scoreConfigId,
          displayOrder: data.displayOrder ?? ((maxOrder?.displayOrder || 0) + 1),
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
          scoreElements: { orderBy: { displayOrder: 'asc' } },
          bonusConditions: { orderBy: { displayOrder: 'asc' } },
          penaltyConditions: { orderBy: { displayOrder: 'asc' } },
        },
      });

      return section;
    });
  }

  async updateScoreSection(sectionId: string, data: UpdateScoreSectionDto) {
    const section = await this.prisma.scoreSection.findUnique({ 
      where: { id: sectionId },
      include: { scoreConfig: { include: { scoreSections: true } } },
    });
    
    if (!section) {
      throw new NotFoundException(`Score section with ID ${sectionId} not found`);
    }

    // If updating the code, validate formula if it exists
    if (data.code && section.scoreConfig.totalScoreFormula) {
      const updatedSectionCodes = section.scoreConfig.scoreSections.map(s => 
        s.id === sectionId ? data.code! : s.code
      );
      const validation = this.formulaEvaluator.validateFormulaSyntax(
        section.scoreConfig.totalScoreFormula, 
        updatedSectionCodes
      );
      if (!validation.isValid) {
        throw new BadRequestException(`Invalid formula after section code update: ${validation.error}`);
      }
    }

    return this.prisma.scoreSection.update({ 
      where: { id: sectionId }, 
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        displayOrder: data.displayOrder,
      },
      include: {
        scoreElements: { orderBy: { displayOrder: 'asc' } },
        bonusConditions: { orderBy: { displayOrder: 'asc' } },
        penaltyConditions: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }

  async deleteScoreSection(sectionId: string) {
    const section = await this.prisma.scoreSection.findUnique({ 
      where: { id: sectionId },
      include: { scoreConfig: { include: { scoreSections: true } } },
    });
    
    if (!section) {
      throw new NotFoundException(`Score section with ID ${sectionId} not found`);
    }

    // If formula exists, validate it after section removal
    if (section.scoreConfig.totalScoreFormula) {
      const remainingSectionCodes = section.scoreConfig.scoreSections
        .filter(s => s.id !== sectionId)
        .map(s => s.code);
      
      const validation = this.formulaEvaluator.validateFormulaSyntax(
        section.scoreConfig.totalScoreFormula, 
        remainingSectionCodes
      );
      
      if (!validation.isValid) {
        throw new BadRequestException(`Cannot delete section: Formula would become invalid: ${validation.error}`);
      }
    }

    return this.prisma.scoreSection.delete({ where: { id: sectionId } });
  }

  // Section Element Management
  async addElementToSection(sectionId: string, data: CreateScoreElementDto) {
    const section = await this.prisma.scoreSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException(`Score section with ID ${sectionId} not found`);
    }

    const maxOrder = await this.prisma.scoreElement.findFirst({
      where: { scoreSectionId: sectionId },
      orderBy: { displayOrder: 'desc' },
    });

    return this.prisma.scoreElement.create({
      data: {
        ...data,
        scoreSectionId: sectionId,
        displayOrder: data.displayOrder ?? ((maxOrder?.displayOrder || 0) + 1),
      },
    });
  }

  async addBonusToSection(sectionId: string, data: CreateBonusConditionDto) {
    const section = await this.prisma.scoreSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException(`Score section with ID ${sectionId} not found`);
    }

    const maxOrder = await this.prisma.bonusCondition.findFirst({
      where: { scoreSectionId: sectionId },
      orderBy: { displayOrder: 'desc' },
    });

    return this.prisma.bonusCondition.create({
      data: {
        ...data,
        scoreSectionId: sectionId,
        displayOrder: data.displayOrder ?? ((maxOrder?.displayOrder || 0) + 1),
      },
    });
  }

  async addPenaltyToSection(sectionId: string, data: CreatePenaltyConditionDto) {
    const section = await this.prisma.scoreSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException(`Score section with ID ${sectionId} not found`);
    }

    const maxOrder = await this.prisma.penaltyCondition.findFirst({
      where: { scoreSectionId: sectionId },
      orderBy: { displayOrder: 'desc' },
    });

    return this.prisma.penaltyCondition.create({
      data: {
        ...data,
        scoreSectionId: sectionId,
        displayOrder: data.displayOrder ?? ((maxOrder?.displayOrder || 0) + 1),
      },
    });
  }

  // Update formula
  async updateScoreFormula(scoreConfigId: string, formula: string) {
    const scoreConfig = await this.prisma.scoreConfig.findUnique({
      where: { id: scoreConfigId },
      include: { scoreSections: true },
    });

    if (!scoreConfig) {
      throw new NotFoundException(`Score config with ID ${scoreConfigId} not found`);
    }

    const sectionCodes = scoreConfig.scoreSections.map(section => section.code);
    const validation = this.formulaEvaluator.validateFormulaSyntax(formula, sectionCodes);
    
    if (!validation.isValid) {
      throw new BadRequestException(`Invalid formula: ${validation.error}`);
    }

    return this.prisma.scoreConfig.update({
      where: { id: scoreConfigId },
      data: { totalScoreFormula: formula },
    });
  }

  // Create default bonus section
  async createDefaultBonusSection(scoreConfigId: string) {
    const scoreConfig = await this.prisma.scoreConfig.findUnique({
      where: { id: scoreConfigId },
      include: { scoreSections: true },
    });

    if (!scoreConfig) {
      throw new NotFoundException(`Score config with ID ${scoreConfigId} not found`);
    }

    // Check if bonus section already exists
    const existingBonusSection = scoreConfig.scoreSections.find(s => s.code === 'bonus');
    if (existingBonusSection) {
      return existingBonusSection;
    }

    // Create bonus section
    return this.prisma.scoreSection.create({
      data: {
        scoreConfigId,
        name: 'Bonus',
        code: 'bonus',
        description: 'Bonus points section',
        displayOrder: 999,
      },
      include: {
        scoreElements: { orderBy: { displayOrder: 'asc' } },
        bonusConditions: { orderBy: { displayOrder: 'asc' } },
        penaltyConditions: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }

  // Create default penalty section
  async createDefaultPenaltySection(scoreConfigId: string) {
    const scoreConfig = await this.prisma.scoreConfig.findUnique({
      where: { id: scoreConfigId },
      include: { scoreSections: true },
    });

    if (!scoreConfig) {
      throw new NotFoundException(`Score config with ID ${scoreConfigId} not found`);
    }

    // Check if penalty section already exists
    const existingPenaltySection = scoreConfig.scoreSections.find(s => s.code === 'penalty');
    if (existingPenaltySection) {
      return existingPenaltySection;
    }

    // Create penalty section
    return this.prisma.scoreSection.create({
      data: {
        scoreConfigId,
        name: 'Penalty',
        code: 'penalty',
        description: 'Penalty points section',
        displayOrder: 1000,
      },
      include: {
        scoreElements: { orderBy: { displayOrder: 'asc' } },
        bonusConditions: { orderBy: { displayOrder: 'asc' } },
        penaltyConditions: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }

  // Add bonus to default bonus section (creates section if it doesn't exist)
  async addBonusToDefaultSection(scoreConfigId: string, data: CreateBonusConditionDto) {
    // Ensure bonus section exists
    const bonusSection = await this.createDefaultBonusSection(scoreConfigId);
    
    // Add bonus to the section
    return this.addBonusToSection(bonusSection.id, data);
  }

  // Add penalty to default penalty section (creates section if it doesn't exist)
  async addPenaltyToDefaultSection(scoreConfigId: string, data: CreatePenaltyConditionDto) {
    // Ensure penalty section exists
    const penaltySection = await this.createDefaultPenaltySection(scoreConfigId);
    
    // Add penalty to the section
    return this.addPenaltyToSection(penaltySection.id, data);
  }
}
