# Stage Advancement API Documentation

## Overview

The Stage Advancement API provides endpoints for managing tournament stage progression, team advancement, and ranking systems. All endpoints follow RESTful conventions and implement proper authorization.

## Base URL
```
/stages
```

## Authentication

All endpoints require authentication using JWT tokens. Stage advancement operations require `ADMIN` role.

## Endpoints

### 1. Advance Teams to Next Stage

**POST** `/stages/:id/advance`

Advances the top-performing teams from the current stage to the next stage based on rankings.

#### Authorization
- Role: `ADMIN` only

#### Parameters
- `id` (path): Stage ID to advance teams from

#### Request Body
```typescript
{
  teamsToAdvance: number;              // Required: Number of teams to advance (1-100)
  nextStageId?: string;                // Optional: Specific next stage UUID
  createNextStage?: boolean;           // Optional: Auto-create next stage (default: false)
  nextStageConfig?: {                  // Required if createNextStage is true
    name: string;                      // Stage name (1-100 chars)
    type: "SWISS" | "PLAYOFF" | "FINAL"; // Stage type
    startDate: string;                 // ISO date string
    endDate: string;                   // ISO date string (must be after startDate)
    teamsPerAlliance?: number;         // Teams per alliance (1-10, default: 2)
  };
}
```

#### Response
```typescript
{
  success: boolean;
  message: string;
  data: {
    advancedTeams: Array<{
      id: string;
      teamNumber: string;
      name: string;
      currentStageId: string | null;
    }>;
    completedStage: {
      id: string;
      name: string;
      status: string;
    };
    nextStage?: {
      id: string;
      name: string;
      type: string;
    };
    totalTeamsAdvanced: number;
  };
}
```

#### Example Request
```bash
curl -X POST /stages/stage-abc123/advance \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "teamsToAdvance": 8,
    "nextStageId": "stage-def456"
  }'
```

#### Example Response
```json
{
  "success": true,
  "message": "Successfully advanced 8 teams from stage \"Swiss Stage A\" to \"Swiss Stage B\"",
  "data": {
    "advancedTeams": [
      {
        "id": "team-001",
        "teamNumber": "1001",
        "name": "Team Alpha",
        "currentStageId": "stage-def456"
      }
    ],
    "completedStage": {
      "id": "stage-abc123",
      "name": "Swiss Stage A",
      "status": "COMPLETED"
    },
    "nextStage": {
      "id": "stage-def456",
      "name": "Swiss Stage B",
      "type": "SWISS"
    },
    "totalTeamsAdvanced": 8
  }
}
```

### 2. Get Stage Rankings

**GET** `/stages/:id/rankings`

Retrieves current team rankings for a stage based on performance metrics.

#### Authorization
- Authenticated users only

#### Parameters
- `id` (path): Stage ID to get rankings for

#### Response
```typescript
{
  success: boolean;
  message: string;
  data: Array<{
    teamId: string;
    teamNumber: string;
    teamName: string;
    wins: number;
    losses: number;
    ties: number;
    pointsScored: number;
    pointsConceded: number;
    pointDifferential: number;
    rankingPoints: number;
    tiebreaker1: number;
    tiebreaker2: number;
    rank?: number;
  }>;
}
```

#### Example Request
```bash
curl -X GET /stages/stage-abc123/rankings \
  -H "Authorization: Bearer <jwt-token>"
```

#### Example Response
```json
{
  "success": true,
  "message": "Retrieved rankings for stage",
  "data": [
    {
      "teamId": "team-001",
      "teamNumber": "1001",
      "teamName": "Team Alpha",
      "wins": 5,
      "losses": 1,
      "ties": 0,
      "pointsScored": 150,
      "pointsConceded": 80,
      "pointDifferential": 70,
      "rankingPoints": 15,
      "tiebreaker1": 25.0,
      "tiebreaker2": 0.8,
      "rank": 1
    }
  ]
}
```

### 3. Check Stage Readiness

**GET** `/stages/:id/readiness`

Checks if a stage is ready for advancement (all matches completed, teams available).

#### Authorization
- Authenticated users only

#### Parameters
- `id` (path): Stage ID to check readiness for

#### Response
```typescript
{
  success: boolean;
  message: string;
  data: {
    ready: boolean;
    reason?: string;
    incompleteMatches?: number;
    totalTeams?: number;
  };
}
```

#### Example Request
```bash
curl -X GET /stages/stage-abc123/readiness \
  -H "Authorization: Bearer <jwt-token>"
```

#### Example Response (Ready)
```json
{
  "success": true,
  "message": "Stage is ready for advancement",
  "data": {
    "ready": true,
    "totalTeams": 16
  }
}
```

#### Example Response (Not Ready)
```json
{
  "success": true,
  "message": "Stage is not ready for advancement: 3 matches are still incomplete",
  "data": {
    "ready": false,
    "reason": "3 matches are still incomplete",
    "incompleteMatches": 3,
    "totalTeams": 16
  }
}
```

### 4. Preview Advancement

**GET** `/stages/:id/advancement-preview`

Previews which teams would be advanced without actually performing the advancement.

#### Authorization
- Authenticated users only

#### Parameters
- `id` (path): Stage ID to preview advancement for
- `teamsToAdvance` (query, optional): Number of teams to advance (default: half of total teams)

#### Response
```typescript
{
  success: boolean;
  message: string;
  data: {
    teamsToAdvance: Array<TeamRanking>;
    remainingTeams: Array<TeamRanking>;
    totalTeams: number;
    advancementPercentage: number;
  };
}
```

#### Example Request
```bash
curl -X GET "/stages/stage-abc123/advancement-preview?teamsToAdvance=8" \
  -H "Authorization: Bearer <jwt-token>"
```

#### Example Response
```json
{
  "success": true,
  "message": "Preview: 8 teams would be advanced",
  "data": {
    "teamsToAdvance": [
      {
        "teamId": "team-001",
        "teamNumber": "1001",
        "teamName": "Team Alpha",
        "rank": 1
      }
    ],
    "remainingTeams": [
      {
        "teamId": "team-009",
        "teamNumber": "1009",
        "teamName": "Team Omega",
        "rank": 9
      }
    ],
    "totalTeams": 16,
    "advancementPercentage": 50
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```typescript
{
  success: false;
  message: string;
  error: string;
}
```

### Common Error Status Codes

- `400 Bad Request`: Invalid parameters, validation errors, business logic violations
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions (e.g., non-admin trying to advance teams)
- `404 Not Found`: Stage not found
- `500 Internal Server Error`: Server-side errors

### Example Error Response
```json
{
  "success": false,
  "message": "Cannot advance 10 teams when only 8 teams participated in the stage",
  "error": "ValidationError"
}
```

## Validation Rules

### Stage Advancement
- `teamsToAdvance`: Must be between 1 and 100
- Cannot advance more teams than participated in the stage
- All matches in the stage must be completed
- Stage must be in `ACTIVE` status
- Cannot specify both `nextStageId` and `createNextStage`
- When `createNextStage` is true, `nextStageConfig` is required

### Next Stage Configuration
- `name`: Required, 1-100 characters
- `type`: Must be valid enum value (`SWISS`, `PLAYOFF`, `FINAL`)
- `endDate`: Must be after `startDate`
- `teamsPerAlliance`: Must be between 1 and 10

## Business Logic

### Ranking System
Teams are ranked using the following criteria in order of priority:
1. Ranking Points (primary)
2. Point Differential
3. Points Scored
4. Tiebreaker 1 (configurable metric)
5. Tiebreaker 2 (configurable metric)

### Stage Status Transitions
- Stage starts as `ACTIVE`
- When teams are advanced, the stage becomes `COMPLETED`
- Completed stages cannot be advanced again

### Team Advancement
- Teams' `currentStageId` is updated to point to the next stage
- Only top-ranking teams are advanced
- Operation is atomic (all changes in database transaction)

## Integration Examples

### Complete Workflow
```javascript
// 1. Check if stage is ready
const readiness = await fetch('/stages/stage-123/readiness');
if (!readiness.data.ready) {
  console.log('Stage not ready:', readiness.data.reason);
  return;
}

// 2. Preview advancement
const preview = await fetch('/stages/stage-123/advancement-preview?teamsToAdvance=8');
console.log(`Would advance ${preview.data.teamsToAdvance.length} teams`);

// 3. Advance teams
const result = await fetch('/stages/stage-123/advance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teamsToAdvance: 8,
    nextStageId: 'stage-456'
  })
});

console.log(`Advanced ${result.data.totalTeamsAdvanced} teams`);
```

This API provides comprehensive stage management capabilities with proper validation, error handling, and preview functionality for tournament administrators.
