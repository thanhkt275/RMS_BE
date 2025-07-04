// File: src/prisma.service.ts
import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { withAccelerate } from '@prisma/extension-accelerate';

/**
 * Service for interacting with the database via Prisma with Accelerate caching
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private acceleratedClient: ReturnType<typeof this.createAcceleratedClient>;

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    // Create accelerated client
    this.acceleratedClient = this.createAcceleratedClient();

    // Add query performance monitoring
    (this.$on as any)('query', (e: any) => {
      if (e.duration > 500) { // Log slow queries (over 500ms)
        this.logger.warn(`Slow query: ${e.query} (${e.duration}ms)`);
      }
    });
  }

  /**
   * Create Prisma client with Accelerate extension
   */
  private createAcceleratedClient() {
    return new PrismaClient().$extends(withAccelerate());
  }

  /**
   * Get accelerated client for cached queries
   */
  get accelerated() {
    return this.acceleratedClient;
  }

  /**
   * Connect to the database when the module initializes
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Connecting to database...');
      await this.$connect();
      await this.acceleratedClient.$connect();
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

  /**
   * Invalidate cache by tags
   */
  async invalidateCache(tags: string[]): Promise<void> {
    try {
      await this.acceleratedClient.$accelerate.invalidate({ tags });
      this.logger.log(`Cache invalidated for tags: ${tags.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache: ${error.message}`);
      // Don't throw - cache invalidation failure shouldn't break functionality
    }
  }

  /**
   * Invalidate all cache
   */
  async invalidateAllCache(): Promise<void> {
    try {
      await this.acceleratedClient.$accelerate.invalidateAll();
      this.logger.log('All cache invalidated');
    } catch (error) {
      this.logger.error(`Failed to invalidate all cache: ${error.message}`);
      // Don't throw - cache invalidation failure shouldn't break functionality
    }
  }
}
