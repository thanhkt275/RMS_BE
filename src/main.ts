declare const module: any;

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { patchNestJsSwagger } from 'nestjs-zod';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClient } from '../generated/prisma';
import { Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

/**
 * Verifies that Prisma client can be instantiated
 * @returns Promise that resolves when Prisma is verified
 */
async function verifyPrismaGenerated(): Promise<void> {
  const logger = new Logger('PrismaInit');
  
  try {
    logger.log('Verifying Prisma client initialization...');
    
    // Attempt to initialize PrismaClient
    const prisma = new PrismaClient();
    await prisma.$connect();
    logger.log('Prisma client initialized successfully');
    await prisma.$disconnect();
    
    return Promise.resolve();
  } catch (error) {
    logger.error('Failed to initialize Prisma client');
    
    if (error.message?.includes('did not initialize yet') || 
        error.message?.includes('prisma generate')) {
      logger.error('Please run "npx prisma generate" and try again');
    } else {
      logger.error(`Prisma initialization error: ${error.message}`);
    }
    
    return Promise.reject(error);
  }
}

/**
 * Bootstrap the NestJS application
 */
async function bootstrap(): Promise<void> {
  // Verify Prisma is properly generated before starting the app
  try {
    await verifyPrismaGenerated();
  } catch (error) {
    process.exit(1);
  }

  // Patch Swagger for Zod support
  patchNestJsSwagger();
  
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  
  // Enable cookie parsing for HTTP-only JWT cookies
  app.use(cookieParser());

  // Enable CORS with specific configuration for credentialed requests
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] 
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Accept,Authorization,Cookie',
    exposedHeaders: 'Set-Cookie',
  });
  
  // Enable global Zod validation
  app.useGlobalPipes(new ZodValidationPipe());
  
  // Set up Swagger
  const config = new DocumentBuilder()
    .setTitle('Robotics Tournament API')
    .setDescription('API for managing robotics tournaments')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Global API prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 5000;
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Failed to start application: ${error.message}`);
  process.exit(1);
});
