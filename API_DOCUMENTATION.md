# RMS Backend API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [WebSocket Events](#websocket-events)
7. [Error Handling](#error-handling)
8. [Development Guide](#development-guide)
9. [Deployment](#deployment)

## Overview

The RMS (Robotics Management System) Backend is a NestJS-based REST API that provides comprehensive tournament management functionality for robotics competitions. The system supports user authentication, tournament management, match scheduling, real-time scoring, and WebSocket communication for live updates.

### Key Features
- **User Management**: Role-based access control with multiple user roles
- **Tournament Management**: Complete tournament lifecycle management
- **Match Scheduling**: Automated match scheduling with multiple strategies
- **Real-time Scoring**: Live score updates via WebSocket
- **Field Management**: Multi-field tournament support
- **Referee Assignment**: Field referee management system
- **Stage Management**: Support for different tournament stages (Swiss, Playoff, Final)

### Technology Stack
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with HTTP-only cookies
- **Real-time**: Socket.IO WebSocket
- **Validation**: Zod schema validation
- **Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd RMS_BE
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/rms_db"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key"

# Admin credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"

# Application
PORT=5000
NODE_ENV="development"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"
```

4. **Database Setup**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

5. **Start the application**
```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

The API will be available at `http://localhost:5000/api`

### API Documentation
Swagger documentation is available at: `http://localhost:5000/api/docs`

## Authentication

The API uses JWT-based authentication with HTTP-only cookies for security.

### Authentication Flow

1. **Register** (POST `/api/auth/register`)
2. **Login** (POST `/api/auth/login`)
3. **Use JWT token** in subsequent requests

### User Roles
- `ADMIN`: Full system access
- `HEAD_REFEREE`: Tournament management and scoring
- `ALLIANCE_REFEREE`: Match scoring and field management
- `TEAM_LEADER`: Team management
- `TEAM_MEMBER`: Limited access
- `COMMON`: Basic access

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",
  "role": "COMMON"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Response includes JWT token in HTTP-only cookie and response body.

#### Logout
```http
POST /api/auth/logout
```

#### Check Authentication
```http
GET /api/auth/check-auth
Authorization: Bearer <jwt-token>
```

## API Endpoints

### Users Module (`/api/users`)

#### Get All Users
```http
GET /api/users
Authorization: Bearer <jwt-token>
```

#### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer <jwt-token>
```

#### Create User
```http
POST /api/users
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",
  "role": "COMMON",
  "gender": true,
  "dateOfBirth": "1990-01-01T00:00:00.000Z",
  "phoneNumber": "+1234567890"
}
```

#### Update User
```http
PUT /api/users/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "email": "updated@example.com",
  "role": "TEAM_LEADER"
}
```

#### Delete User
```http
DELETE /api/users/:id
Authorization: Bearer <jwt-token>
```

### Tournaments Module (`/api/tournaments`)

#### Get All Tournaments
```http
GET /api/tournaments
Authorization: Bearer <jwt-token>
```

#### Get Tournament by ID
```http
GET /api/tournaments/:id
Authorization: Bearer <jwt-token>
```

#### Create Tournament
```http
POST /api/tournaments
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Spring Robotics Championship",
  "description": "Annual robotics competition",
  "startDate": "2024-03-01T00:00:00.000Z",
  "endDate": "2024-03-03T00:00:00.000Z",
  "numberOfFields": 3
}
```

#### Update Tournament
```http
PUT /api/tournaments/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Updated Tournament Name",
  "description": "Updated description"
}
```

#### Delete Tournament
```http
DELETE /api/tournaments/:id
Authorization: Bearer <jwt-token>
```

### Teams Module (`/api/teams`)

#### Get All Teams
```http
GET /api/teams
Authorization: Bearer <jwt-token>
```

#### Get Team by ID
```http
GET /api/teams/:id
Authorization: Bearer <jwt-token>
```

#### Create Team
```http
POST /api/teams
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Team Alpha",
  "number": "1234",
  "tournamentId": "tournament-uuid"
}
```

#### Import Teams (Bulk)
```http
POST /api/teams/import
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "tournamentId": "tournament-uuid",
  "teams": [
    {
      "name": "Team Alpha",
      "number": "1234"
    },
    {
      "name": "Team Beta", 
      "number": "5678"
    }
  ]
}
```

#### Update Team
```http
PUT /api/teams/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Updated Team Name",
  "number": "9999"
}
```

#### Delete Team
```http
DELETE /api/teams/:id
Authorization: Bearer <jwt-token>
```

### Stages Module (`/api/stages`)

#### Get All Stages
```http
GET /api/stages
Authorization: Bearer <jwt-token>
```

#### Get Stage by ID
```http
GET /api/stages/:id
Authorization: Bearer <jwt-token>
```

#### Create Stage
```http
POST /api/stages
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Qualification Round",
  "type": "SWISS",
  "startDate": "2024-03-01T09:00:00.000Z",
  "endDate": "2024-03-01T17:00:00.000Z",
  "tournamentId": "tournament-uuid",
  "teamsPerAlliance": 2
}
```

#### Update Stage
```http
PUT /api/stages/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Updated Stage Name",
  "status": "COMPLETED"
}
```

#### Advance Teams to Next Stage
```http
POST /api/stages/:id/advance-teams
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "teamIds": ["team-uuid-1", "team-uuid-2"],
  "nextStageId": "next-stage-uuid"
}
```

#### Delete Stage
```http
DELETE /api/stages/:id
Authorization: Bearer <jwt-token>
```

### Matches Module (`/api/matches`)

#### Get All Matches
```http
GET /api/matches
Authorization: Bearer <jwt-token>
```

#### Get Match by ID
```http
GET /api/matches/:id
Authorization: Bearer <jwt-token>
```

#### Create Match
```http
POST /api/matches
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "matchNumber": 1,
  "roundNumber": 1,
  "startTime": "2024-03-01T10:00:00.000Z",
  "scheduledTime": "2024-03-01T10:00:00.000Z",
  "duration": 150,
  "stageId": "stage-uuid",
  "fieldId": "field-uuid",
  "matchType": "FULL",
  "roundType": "QUALIFICATION"
}
```

#### Update Match
```http
PUT /api/matches/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "startTime": "2024-03-01T10:05:00.000Z"
}
```

#### Delete Match
```http
DELETE /api/matches/:id
Authorization: Bearer <jwt-token>
```

### Match Scores Module (`/api/match-scores`)

#### Get Match Scores
```http
GET /api/match-scores
Authorization: Bearer <jwt-token>
```

#### Create Match Score
```http
POST /api/match-scores
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "matchId": "match-uuid",
  "allianceId": "alliance-uuid",
  "scoreData": {
    "autoPoints": 10,
    "teleopPoints": 25,
    "endgamePoints": 15,
    "totalPoints": 50
  }
}
```

#### Get Leaderboard
```http
GET /api/match-scores/leaderboard
Authorization: Bearer <jwt-token>
```

### Match Scheduler Module (`/api/match-scheduler`)

#### Generate Schedule
```http
POST /api/match-scheduler/generate
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "stageId": "stage-uuid",
  "strategy": "FRC",
  "config": {
    "matchesPerTeam": 6,
    "breakDuration": 15,
    "matchDuration": 150
  }
}
```

#### Get Schedule
```http
GET /api/match-scheduler/schedule/:stageId
Authorization: Bearer <jwt-token>
```

### Field Referees Module (`/api/field-referees`)

#### Get Field Referees
```http
GET /api/field-referees
Authorization: Bearer <jwt-token>
```

#### Assign Referee to Field
```http
POST /api/field-referees/assign
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "fieldId": "field-uuid",
  "refereeId": "user-uuid",
  "tournamentId": "tournament-uuid"
}
```

### Score Config Module (`/api/score-config`)

#### Get Score Configurations
```http
GET /api/score-config
Authorization: Bearer <jwt-token>
```

#### Create Score Configuration
```http
POST /api/score-config
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Standard FRC Scoring",
  "tournamentId": "tournament-uuid",
  "elements": [
    {
      "name": "Auto Points",
      "type": "COUNTER",
      "maxValue": 20
    },
    {
      "name": "Teleop Points", 
      "type": "COUNTER",
      "maxValue": 50
    }
  ]
}
```

## Database Schema

### Core Models

#### User
```typescript
{
  id: string
  username: string
  password: string
  role: UserRole
  email?: string
  gender?: boolean
  dateOfBirth?: Date
  phoneNumber?: string
  avatar?: string
  isActive: boolean
  lastLoginAt?: Date
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### Tournament
```typescript
{
  id: string
  name: string
  description?: string
  startDate: Date
  endDate: Date
  adminId: string
  numberOfFields: number
  createdAt: Date
  updatedAt: Date
}
```

#### Stage
```typescript
{
  id: string
  name: string
  type: StageType
  status: StageStatus
  startDate: Date
  endDate: Date
  tournamentId: string
  teamsPerAlliance: number
  createdAt: Date
  updatedAt: Date
}
```

#### Match
```typescript
{
  id: string
  matchNumber: number
  roundNumber?: number
  status: MatchState
  startTime?: Date
  scheduledTime?: Date
  endTime?: Date
  duration?: number
  winningAlliance?: AllianceColor
  stageId: string
  fieldId?: string
  matchType: MatchType
  roundType?: MatchRoundType
  createdAt: Date
  updatedAt: Date
}
```

#### Team
```typescript
{
  id: string
  name: string
  number: string
  tournamentId: string
  createdAt: Date
  updatedAt: Date
}
```

### Enums

#### UserRole
- `ADMIN`
- `HEAD_REFEREE`
- `ALLIANCE_REFEREE`
- `TEAM_LEADER`
- `TEAM_MEMBER`
- `COMMON`

#### StageType
- `SWISS`
- `PLAYOFF`
- `FINAL`

#### MatchState
- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`
- `ERROR`

#### AllianceColor
- `RED`
- `BLUE`

## WebSocket Events

The application uses Socket.IO for real-time communication.

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'jwt-token'
  }
});
```

### Events

#### Client to Server

**Join Field Display**
```javascript
socket.emit('join-field-display', {
  tournamentId: 'tournament-uuid',
  fieldId: 'field-uuid'
});
```

**Update Score**
```javascript
socket.emit('update-score', {
  matchId: 'match-uuid',
  allianceId: 'alliance-uuid',
  scoreData: {
    autoPoints: 10,
    teleopPoints: 25,
    endgamePoints: 15
  }
});
```

**Persist Scores**
```javascript
socket.emit('persist-scores', {
  matchId: 'match-uuid',
  scores: [
    {
      allianceId: 'alliance-uuid-1',
      scoreData: { /* score data */ }
    },
    {
      allianceId: 'alliance-uuid-2', 
      scoreData: { /* score data */ }
    }
  ]
});
```

#### Server to Client

**Score Update**
```javascript
socket.on('score-update', (data) => {
  console.log('Score updated:', data);
  // data: { matchId, allianceId, scoreData }
});
```

**Match State Change**
```javascript
socket.on('match-state-change', (data) => {
  console.log('Match state changed:', data);
  // data: { matchId, state, timestamp }
});
```

**Field Display Update**
```javascript
socket.on('field-display-update', (data) => {
  console.log('Field display updated:', data);
  // data: { fieldId, displayState, matchData }
});
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "username",
      "message": "Username is required"
    }
  ]
}
```

### Common Error Scenarios

#### Authentication Errors
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid token"
}
```

#### Validation Errors
```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "error": "Unprocessable Entity",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

#### Database Errors
```json
{
  "statusCode": 409,
  "message": "Resource already exists",
  "error": "Conflict"
}
```

## Development Guide

### Project Structure
```
src/
├── auth/                 # Authentication module
├── users/               # User management
├── tournaments/         # Tournament management
├── teams/              # Team management
├── stages/             # Stage management
├── matches/            # Match management
├── match-scores/       # Score tracking
├── match-scheduler/    # Match scheduling
├── field-referees/     # Field referee management
├── score-config/       # Scoring configuration
├── websockets/         # WebSocket events
└── utils/              # Utility functions
```

### Adding New Endpoints

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

4. **Add to App Module**
```typescript
@Module({
  imports: [
    // ... other modules
    ExampleModule,
  ],
})
export class AppModule {}
```

### Testing

#### Unit Tests
```bash
npm run test
```

#### E2E Tests
```bash
npm run test:e2e
```

#### Coverage
```bash
npm run test:cov
```

#### Stress Tests
```bash
npm run test:stress
```

### Code Quality

#### Linting
```bash
npm run lint
```

#### Formatting
```bash
npm run format
```

## Deployment

### Docker Deployment

1. **Build Image**
```bash
docker build -t rms-backend .
```

2. **Run Container**
```bash
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret" \
  rms-backend
```

### Environment Variables

#### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret

#### Optional
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `ADMIN_USERNAME` - Default admin username (default: admin)
- `ADMIN_PASSWORD` - Default admin password (default: admin123)
- `FRONTEND_URL` - Frontend URL for CORS

### Production Considerations

1. **Database**
   - Use connection pooling
   - Enable SSL for database connections
   - Regular backups

2. **Security**
   - Use strong JWT secrets
   - Enable HTTPS
   - Configure CORS properly
   - Rate limiting

3. **Performance**
   - Enable compression
   - Use caching where appropriate
   - Monitor application metrics

4. **Monitoring**
   - Log aggregation
   - Error tracking
   - Performance monitoring

### Health Checks

The application provides health check endpoints:

```http
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

## Support

For issues and questions:
1. Check the Swagger documentation at `/api/docs`
2. Review the logs for error details
3. Contact the development team

---

*Last updated: January 2024* 