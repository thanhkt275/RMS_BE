# RMS Backend - Robotics Management System

[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-red.svg)](https://nestjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.6.0-purple.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive NestJS-based backend system for managing robotics tournaments, featuring real-time scoring, automated match scheduling, and multi-field tournament support.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd RMS_BE

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

The API will be available at `http://localhost:5000/api`

## 📚 Documentation

- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference with examples
- **[Developer Quick Reference](DEVELOPER_QUICK_REFERENCE.md)** - Essential information for developers
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[Swagger UI](http://localhost:5000/api/docs)** - Interactive API documentation

## 🏗️ Architecture

### Technology Stack
- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: JWT with HTTP-only cookies
- **Real-time**: [Socket.IO](https://socket.io/) WebSocket
- **Validation**: [Zod](https://zod.dev/) schema validation
- **Documentation**: Swagger/OpenAPI

### Core Features
- **User Management**: Role-based access control with 6 user roles
- **Tournament Management**: Complete tournament lifecycle
- **Match Scheduling**: Automated scheduling with multiple strategies
- **Real-time Scoring**: Live score updates via WebSocket
- **Multi-field Support**: Manage multiple tournament fields
- **Referee Assignment**: Field referee management system
- **Stage Management**: Swiss, Playoff, and Final stages

## 🗄️ Database Schema

### Key Models
- **User**: Authentication and role management
- **Tournament**: Tournament configuration and metadata
- **Stage**: Tournament stages (Swiss, Playoff, Final)
- **Match**: Individual matches with scheduling
- **Team**: Tournament participants
- **Alliance**: Team alliances in matches
- **MatchScore**: Flexible scoring system
- **Field**: Tournament field management
- **FieldReferee**: Referee assignments

### User Roles
- `ADMIN` - Full system access
- `HEAD_REFEREE` - Tournament management and scoring
- `ALLIANCE_REFEREE` - Match scoring and field management
- `TEAM_LEADER` - Team management
- `TEAM_MEMBER` - Limited access
- `COMMON` - Basic access

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/check-auth
```

### Core Resources
```
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id

GET    /api/tournaments
POST   /api/tournaments
PUT    /api/tournaments/:id
DELETE /api/tournaments/:id

GET    /api/teams
POST   /api/teams
POST   /api/teams/import
PUT    /api/teams/:id
DELETE /api/teams/:id

GET    /api/stages
POST   /api/stages
PUT    /api/stages/:id
POST   /api/stages/:id/advance-teams
DELETE /api/stages/:id

GET    /api/matches
POST   /api/matches
PUT    /api/matches/:id
DELETE /api/matches/:id
```

### Specialized Endpoints
```
GET    /api/match-scores/leaderboard
POST   /api/match-scheduler/generate
GET    /api/match-scheduler/schedule/:stageId
POST   /api/field-referees/assign
```

## 🔌 WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'jwt-token' }
});
```

### Key Events
- `join-field-display` - Join field display room
- `update-score` - Update match scores
- `persist-scores` - Save scores to database
- `score-update` - Receive score updates
- `match-state-change` - Match status changes
- `field-display-update` - Field display updates

## 🛠️ Development

### Available Scripts
```bash
# Development
npm run start:dev      # Start with hot reload
npm run start:debug    # Start with debugger
npm run build          # Build for production
npm run start:prod     # Start production server

# Database
npx prisma generate    # Generate Prisma client
npx prisma migrate dev # Run migrations
npx prisma studio      # Open database GUI

# Testing
npm run test           # Unit tests
npm run test:watch     # Watch mode
npm run test:e2e       # End-to-end tests
npm run test:cov       # Coverage report
npm run test:stress    # Load testing

# Code Quality
npm run lint           # ESLint
npm run format         # Prettier
```

### Project Structure
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

## 🔐 Security

### Authentication
- JWT-based authentication with HTTP-only cookies
- Role-based access control (RBAC)
- Rate limiting on authentication endpoints
- Secure password hashing with bcrypt

### Security Features
- CORS configuration for cross-origin requests
- Input validation with Zod schemas
- SQL injection prevention via Prisma ORM
- XSS protection through proper content types

## 🧪 Testing

### Test Coverage
- **Unit Tests**: Service and utility functions
- **Integration Tests**: API endpoints
- **E2E Tests**: Complete user workflows
- **Load Tests**: Performance under stress

### Running Tests
```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# Load testing
npm run test:stress
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t rms-backend .
docker run -p 5000:5000 rms-backend
```

### Manual Deployment
```bash
# Install PM2
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
```

For detailed deployment instructions, see the [Deployment Guide](DEPLOYMENT_GUIDE.md).

## 📊 Monitoring

### Health Checks
```bash
# Application health
curl http://localhost:5000/api/health

# Database connectivity
npx prisma db execute --stdin <<< "SELECT 1;"
```

### Logging
- Structured logging with NestJS Logger
- Log rotation and management
- Error tracking and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
1. Check the [API Documentation](API_DOCUMENTATION.md)
2. Review the [Developer Quick Reference](DEVELOPER_QUICK_REFERENCE.md)
3. Explore the [Swagger UI](http://localhost:5000/api/docs)
4. Check existing issues and discussions

### Common Issues
- **Database Connection**: Ensure PostgreSQL is running and credentials are correct
- **JWT Issues**: Verify `JWT_SECRET` environment variable is set
- **WebSocket Connection**: Check CORS settings and authentication token
- **Prisma Client**: Run `npx prisma generate` after schema changes

## 🔄 Version History

### v1.0.0 (Current)
- Initial release with core tournament management
- Real-time scoring system
- Multi-field tournament support
- Automated match scheduling
- Role-based access control
- WebSocket integration
- Comprehensive API documentation

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) for the excellent framework
- [Prisma](https://www.prisma.io/) for the powerful ORM
- [Socket.IO](https://socket.io/) for real-time communication
- [Zod](https://zod.dev/) for runtime type validation

---

**Built with ❤️ for the robotics community**

*Last updated: January 2024*
