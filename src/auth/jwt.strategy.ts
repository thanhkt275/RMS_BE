import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.token,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key', // Use environment variable in production
    });
  }

  async validate(payload: any) {
    try {
      // Log the payload for debugging
      this.logger.debug(`JWT payload: ${JSON.stringify(payload)}`);
      
      // Find the user by ID from JWT payload
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          username: true,
          role: true,
        },
      });

      if (!user) {
        this.logger.warn(`User with ID ${payload.sub} not found`);
        throw new UnauthorizedException('User not found');
      }

      this.logger.debug(`User authenticated: ${user.username}, role: ${user.role}`);
      
      // Return user object in format expected by controllers
      // Controllers expect req.user.sub for the user ID
      const userObject = {
        ...user,
        sub: user.id // Add sub field for compatibility with existing controller code
      };
      
      this.logger.debug(`Returning user object: ${JSON.stringify(userObject)}`);
      return userObject;
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}