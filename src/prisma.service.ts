// File: src/prisma.service.ts
import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

/**
 * Service for interacting with the database via Prisma
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    // Add query performance monitoring
    (this.$on as any)('query', (e: any) => {
      if (e.duration > 500) { // Log slow queries (over 500ms)
        this.logger.warn(`Slow query: ${e.query} (${e.duration}ms)`);
      }
    });
  }

  /**
   * Connect to the database when the module initializes
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Connecting to database...');
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error(`Failed to connect to database: ${error.message}`);
      
      // Provide specific guidance based on error message
      if (error.message?.includes('did not initialize yet') || 
          error.message?.includes('prisma generate')) {
        this.logger.error('Please run "npx prisma generate" and restart the application');
      } else if (error.message?.includes('P1001') || error.message?.includes('connect ECONNREFUSED')) {
        this.logger.error('Database server is not reachable. Please check your connection settings and ensure the database server is running.');
      } else if (error.message?.includes('P1003')) {
        this.logger.error('Database or schema does not exist. Please run "npx prisma migrate dev" to create it.');
      }
      
      throw error;
    }
  }

  /**
   * Enable shutdown hooks for graceful shutdown
   * @param app NestJS application instance
   */
  async enableShutdownHooks(app: INestApplication): Promise<void> {
    (this.$on as any)('beforeExit', async () => {
      this.logger.log('Disconnecting from database...');
      await app.close();
      this.logger.log('Database connection closed');
    });
  }
}
