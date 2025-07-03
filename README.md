# Robotics Management System (RMS) Backend

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

A comprehensive backend system for managing robotics tournaments, built with NestJS and TypeScript. This system provides real-time tournament management, match scheduling, scoring, and team statistics for competitive robotics events.

## Features

### 🏆 Tournament Management
- Create and manage multiple tournaments
- Configure tournament stages (Swiss, Playoff, Final)
- Team registration and management
- Real-time tournament status tracking

### 📅 Match Scheduling
- Automated match scheduling with multiple algorithms
- Swiss tournament system support
- Playoff bracket generation
- FRC-compatible scheduling formats
- Support for multiple fields and concurrent matches

### 📊 Real-time Scoring
- Live match scoring with WebSocket support
- Field referee assignment and management
- Team statistics tracking and analysis
- Auto-drive scoring integration
- Comprehensive match result management

### 👥 User Management
- Role-based access control (Admin, Head Referee, Alliance Referee, Team Leader, etc.)
- JWT-based authentication
- User profile management
- Activity tracking and audit logs

### 🔧 Additional Features
- RESTful API with Swagger documentation
- Real-time WebSocket connections
- Database migrations with Prisma
- Comprehensive testing suite
- Field display management
- Score configuration system

## Technology Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport
- **Real-time**: WebSocket (Socket.IO)
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Validation**: Zod & Class Validator

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- pnpm (recommended) or npm

### Clone and Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd RMS_BE
   ```

2. **Install dependencies**
   ```bash
   # Using pnpm (recommended)
   pnpm install
   
   # Or using npm
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory with the following variables:
   ```bash
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/rms_db"
   
   # JWT Secret
   JWT_SECRET="your-jwt-secret-key"
   
   # Optional: Prisma configuration
   PRISMA_ACCELERATE_API_KEY="your-accelerate-api-key"
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma Client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate dev
   
   # (Optional) Seed the database
   npx prisma db seed
   ```

### Running the Application

```bash
# Development mode with hot reload
pnpm start:dev

# Production mode
pnpm start:prod

# Debug mode
pnpm start:debug
```

The application will be available at `http://localhost:3000`

### API Documentation

Once the application is running, you can access the Swagger API documentation at:
- `http://localhost:3000/api` - API Documentation
- `http://localhost:3000/api-json` - OpenAPI JSON

## Project Structure

```
src/
├── app.module.ts              # Main application module
├── main.ts                    # Application entry point
├── prisma.service.ts          # Database service
├── auth/                      # Authentication & authorization
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   ├── roles.guard.ts
│   └── dto/
├── tournaments/               # Tournament management
│   ├── tournaments.controller.ts
│   ├── tournaments.service.ts
│   └── dto/
├── teams/                     # Team management
│   ├── teams.controller.ts
│   ├── teams.service.ts
│   └── dto/
├── matches/                   # Match management
│   ├── matches.controller.ts
│   ├── matches.service.ts
│   └── dto/
├── match-scheduler/           # Match scheduling algorithms
│   ├── match-scheduler.service.ts
│   ├── swiss-scheduler.ts
│   ├── playoff-scheduler.ts
│   └── frc-scheduler.ts
├── match-scores/              # Scoring system
│   ├── match-scores.controller.ts
│   ├── match-scores.service.ts
│   ├── team-stats.service.ts
│   └── dto/
├── stages/                    # Tournament stages
│   ├── stages.controller.ts
│   ├── stages.service.ts
│   └── dto/
├── users/                     # User management
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
├── field-referees/            # Field referee management
│   ├── field-referees.controller.ts
│   ├── field-referees.service.ts
│   └── dto/
├── score-config/              # Score configuration
│   ├── score-config.controller.ts
│   ├── score-config.service.ts
│   └── dto/
├── websockets/                # Real-time WebSocket handlers
│   ├── websockets.gateway.ts
│   └── dto/
└── utils/                     # Utility functions and helpers
    ├── validators/
    └── helpers/

prisma/
├── schema.prisma              # Database schema
├── migrations/                # Database migrations
└── seed.ts                    # Database seeding

generated/
└── prisma/                    # Generated Prisma client
```

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key entities include:

- **Users**: Authentication and role management
- **Tournaments**: Main tournament entities
- **Teams**: Team registration and management
- **Stages**: Tournament stages (Swiss, Playoff, Final)
- **Matches**: Individual match records
- **MatchScores**: Detailed scoring information
- **TeamStats**: Team performance statistics
- **Fields**: Field management for multiple concurrent matches
- **ScoreConfigs**: Configurable scoring systems

## Development

### Building and Running

```bash
# Development mode with hot reload
pnpm start:dev

# Production build
pnpm build

# Start production server
pnpm start:prod

# Debug mode
pnpm start:debug
```

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type checking
pnpm build
```

### Testing

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run e2e tests
pnpm test:e2e

# Generate test coverage report
pnpm test:cov

# Debug tests
pnpm test:debug
```

### Database Operations

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply new migration
npx prisma migrate dev --name "description-of-changes"

# Reset database (development only)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh JWT token

### Tournaments
- `GET /tournaments` - List all tournaments
- `POST /tournaments` - Create new tournament
- `GET /tournaments/:id` - Get tournament details
- `PUT /tournaments/:id` - Update tournament
- `DELETE /tournaments/:id` - Delete tournament

### Teams
- `GET /teams` - List teams
- `POST /teams` - Register new team
- `GET /teams/:id` - Get team details
- `PUT /teams/:id` - Update team information

### Matches
- `GET /matches` - List matches
- `POST /matches` - Create match
- `GET /matches/:id` - Get match details
- `PUT /matches/:id/score` - Update match score
- `POST /matches/schedule` - Generate match schedule

### Real-time Events (WebSocket)
- `match:start` - Match started
- `match:score` - Score updated
- `match:end` - Match completed
- `tournament:update` - Tournament status change

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | No (default: 1d) |
| `PRISMA_ACCELERATE_API_KEY` | Prisma Accelerate API key | No |
| `PORT` | Application port | No (default: 3000) |

### Prisma Configuration

The application uses Prisma with PostgreSQL. The generated client is located in `generated/prisma/` for better organization.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and patterns
- Write unit tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Use conventional commit messages

## Deployment

### Production Deployment

1. **Build the application**
   ```bash
   pnpm build
   ```

2. **Set up production environment**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export DATABASE_URL="your-production-database-url"
   export JWT_SECRET="your-production-jwt-secret"
   ```

3. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the application**
   ```bash
   pnpm start:prod
   ```

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### Environment-specific Configuration

For different environments (development, staging, production), ensure proper configuration of:
- Database connections
- JWT secrets
- CORS settings
- Logging levels
- API rate limiting

## Performance Considerations

- **Database Optimization**: Use Prisma's query optimization features
- **Connection Pooling**: Configure appropriate database connection pools
- **Caching**: Implement Redis caching for frequently accessed data
- **WebSocket Scaling**: Use Redis adapter for Socket.IO in multi-instance deployments

## Security

- JWT tokens with appropriate expiration
- Role-based access control (RBAC)
- Input validation with Zod and Class Validator
- Rate limiting with NestJS Throttler
- CORS configuration for frontend integration
- Database query parameterization (SQL injection prevention)

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check database server status
   - Ensure proper network connectivity

2. **Migration Errors**
   - Check migration files for syntax errors
   - Verify database permissions
   - Use `npx prisma migrate reset` for development

3. **JWT Authentication Issues**
   - Verify JWT_SECRET configuration
   - Check token expiration settings
   - Ensure proper Authorization header format

## Support and Resources

- **NestJS Documentation**: [https://docs.nestjs.com](https://docs.nestjs.com)
- **Prisma Documentation**: [https://prisma.io/docs](https://prisma.io/docs)
- **FIRST Robotics Competition**: [https://www.firstinspires.org](https://www.firstinspires.org)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [NestJS](https://nestjs.com/) framework
- Database management with [Prisma](https://prisma.io/)
- Inspired by FIRST Robotics Competition management needs
