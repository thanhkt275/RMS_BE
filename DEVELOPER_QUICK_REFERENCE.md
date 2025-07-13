# RMS Backend - Developer Quick Reference

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

## 📁 Project Structure

```
src/
├── auth/                 # JWT authentication
├── users/               # User management
├── tournaments/         # Tournament CRUD
├── teams/              # Team management
├── stages/             # Tournament stages
├── matches/            # Match management
├── match-scores/       # Score tracking
├── match-scheduler/    # Automated scheduling
├── field-referees/     # Referee assignments
├── score-config/       # Scoring rules
├── websockets/         # Real-time events
└── utils/              # Shared utilities
```

## 🔧 Common Commands

### Development
```bash
npm run start:dev      # Start with hot reload
npm run start:debug    # Start with debugger
npm run build          # Build for production
npm run start:prod     # Start production server
```

### Database
```bash
npx prisma generate    # Generate Prisma client
npx prisma migrate dev # Run migrations
npx prisma studio      # Open database GUI
npx prisma db seed     # Seed database
```

### Testing
```bash
npm run test           # Unit tests
npm run test:watch     # Watch mode
npm run test:e2e       # End-to-end tests
npm run test:cov       # Coverage report
npm run test:stress    # Load testing
```

### Code Quality
```bash
npm run lint           # ESLint
npm run format         # Prettier
```

## 🔐 Authentication

### Default Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `ADMIN`

### User Roles
```typescript
enum UserRole {
  ADMIN              // Full access
  HEAD_REFEREE       // Tournament management
  ALLIANCE_REFEREE   // Match scoring
  TEAM_LEADER        // Team management
  TEAM_MEMBER        // Limited access
  COMMON             // Basic access
}
```

### JWT Token Usage
```typescript
// Include in headers
headers: {
  'Authorization': 'Bearer <jwt-token>'
}

// Or use HTTP-only cookies (automatic)
```

## 📊 Database Models

### Core Entities
```typescript
User {
  id, username, password, role, email, ...
}

Tournament {
  id, name, description, startDate, endDate, adminId, ...
}

Stage {
  id, name, type, status, tournamentId, teamsPerAlliance, ...
}

Match {
  id, matchNumber, status, stageId, fieldId, matchType, ...
}

Team {
  id, name, number, tournamentId, ...
}
```

### Key Relationships
- `Tournament` → `Stage` (one-to-many)
- `Stage` → `Match` (one-to-many)
- `Tournament` → `Team` (one-to-many)
- `Match` → `Alliance` (one-to-many)
- `Alliance` → `Team` (many-to-many via `TeamAlliance`)

## 🌐 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Authentication
```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/check-auth
```

### Core Resources
```
GET    /users
POST   /users
PUT    /users/:id
DELETE /users/:id

GET    /tournaments
POST   /tournaments
PUT    /tournaments/:id
DELETE /tournaments/:id

GET    /teams
POST   /teams
POST   /teams/import
PUT    /teams/:id
DELETE /teams/:id

GET    /stages
POST   /stages
PUT    /stages/:id
POST   /stages/:id/advance-teams
DELETE /stages/:id

GET    /matches
POST   /matches
PUT    /matches/:id
DELETE /matches/:id
```

### Specialized Endpoints
```
GET    /match-scores/leaderboard
POST   /match-scheduler/generate
GET    /match-scheduler/schedule/:stageId
POST   /field-referees/assign
```

## 🔌 WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'jwt-token' }
});
```

### Client Events
```javascript
// Join field display
socket.emit('join-field-display', {
  tournamentId: 'uuid',
  fieldId: 'uuid'
});

// Update score
socket.emit('update-score', {
  matchId: 'uuid',
  allianceId: 'uuid',
  scoreData: { /* score data */ }
});

// Persist scores
socket.emit('persist-scores', {
  matchId: 'uuid',
  scores: [/* score objects */]
});
```

### Server Events
```javascript
socket.on('score-update', (data) => {});
socket.on('match-state-change', (data) => {});
socket.on('field-display-update', (data) => {});
```

## 🛠️ Development Patterns

### Adding New Module

1. **Create Controller**
```typescript
@Controller('example')
export class ExampleController {
  constructor(private exampleService: ExampleService) {}

  @Get()
  async findAll() {
    return this.exampleService.findAll();
  }
}
```

2. **Create Service**
```typescript
@Injectable()
export class ExampleService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.example.findMany();
  }
}
```

3. **Create Module**
```typescript
@Module({
  controllers: [ExampleController],
  providers: [ExampleService],
  exports: [ExampleService]
})
export class ExampleModule {}
```

4. **Add to AppModule**
```typescript
@Module({
  imports: [
    // ... other modules
    ExampleModule,
  ],
})
export class AppModule {}
```

### Validation with Zod
```typescript
import { z } from 'zod';

const CreateExampleDto = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export type CreateExampleDto = z.infer<typeof CreateExampleDto>;
```

### Error Handling
```typescript
// Service level
throw new NotFoundException('Resource not found');
throw new BadRequestException('Invalid input');
throw new ConflictException('Resource already exists');

// Controller level
@UseFilters(new HttpExceptionFilter())
```

## 🧪 Testing

### Unit Test Example
```typescript
describe('ExampleService', () => {
  let service: ExampleService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ExampleService, PrismaService],
    }).compile();

    service = module.get<ExampleService>(ExampleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### E2E Test Example
```typescript
describe('ExampleController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/example (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/example')
      .expect(200);
  });
});
```

## 🔍 Debugging

### Environment Variables
```bash
# Required
DATABASE_URL="postgresql://user:pass@localhost:5432/rms_db"
JWT_SECRET="your-secret-key"

# Optional
PORT=5000
NODE_ENV="development"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
FRONTEND_URL="http://localhost:3000"
```

### Logging
```typescript
import { Logger } from '@nestjs/common';

export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);

  someMethod() {
    this.logger.log('Info message');
    this.logger.warn('Warning message');
    this.logger.error('Error message');
  }
}
```

### Database Debugging
```bash
# View database in browser
npx prisma studio

# Reset database
npx prisma migrate reset

# View migration history
npx prisma migrate status
```

## 📚 Useful Resources

- **NestJS Docs**: https://docs.nestjs.com/
- **Prisma Docs**: https://www.prisma.io/docs/
- **Socket.IO Docs**: https://socket.io/docs/
- **Zod Docs**: https://zod.dev/

## 🚨 Common Issues

### Prisma Client Not Generated
```bash
npx prisma generate
```

### Database Connection Issues
```bash
# Check connection
npx prisma db pull

# Reset if needed
npx prisma migrate reset
```

### JWT Token Issues
- Check `JWT_SECRET` environment variable
- Verify token expiration
- Check cookie settings for CORS

### WebSocket Connection Issues
- Verify CORS settings
- Check authentication token
- Ensure proper event names

## 📝 Code Style

### Naming Conventions
- **Files**: kebab-case (`user-service.ts`)
- **Classes**: PascalCase (`UserService`)
- **Methods**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)

### Import Order
```typescript
// External libraries
import { Injectable } from '@nestjs/common';

// Internal modules
import { PrismaService } from '../prisma.service';

// Types and interfaces
import { CreateUserDto } from './dto/create-user.dto';
```

### Error Messages
- Use descriptive, user-friendly messages
- Include relevant context
- Avoid exposing internal details

---

*Last updated: January 2024* 