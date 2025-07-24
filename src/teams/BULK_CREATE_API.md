# Bulk Team Creation API Documentation

## Overview

The Bulk Team Creation API provides a development endpoint for quickly creating 8 or 16 teams with minimal data for testing purposes.

## Endpoint

**POST** `/api/teams/bulk-create`

### Authorization
- **Role**: `ADMIN` only
- **Authentication**: JWT token required

### Request Body

```typescript
{
  tournamentId: string;     // UUID of the target tournament
  count: number;           // Number of teams to create (must be 8 or 16)
  namePrefix?: string;     // Prefix for team names (default: "Dev Team")
  referralSource?: string; // Referral source (default: "Development")
}
```

### Response

```typescript
{
  success: boolean;
  message: string;
  data: {
    tournament: {
      id: string;
      name: string;
    };
    teamsCreated: number;
    teams: Array<{
      id: string;
      teamNumber: string;
      name: string;
      referralSource: string;
      tournamentId: string;
      userId: string;
      createdAt: string;
      updatedAt: string;
      tournament: Tournament;
      teamMembers: Array<TeamMember>;
    }>;
  };
}
```

### Example Request

```bash
curl -X POST /api/teams/bulk-create \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "550e8400-e29b-41d4-a716-446655440000",
    "count": 16,
    "namePrefix": "Test Team",
    "referralSource": "Development Testing"
  }'
```

### Example Response

```json
{
  "success": true,
  "message": "Successfully created 16 teams for development",
  "data": {
    "tournament": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Spring Championship 2024"
    },
    "teamsCreated": 16,
    "teams": [
      {
        "id": "team-uuid-1",
        "teamNumber": "SC00001",
        "name": "Test Team 01",
        "referralSource": "Development Testing",
        "tournamentId": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "admin-user-id",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "tournament": { ... },
        "teamMembers": [
          {
            "id": "member-uuid-1",
            "name": "Member 1 of Test Team 01",
            "province": "Hà Nội",
            "ward": "Phường 1",
            "organization": "Dev Organization 1",
            "teamId": "team-uuid-1",
            ...
          },
          {
            "id": "member-uuid-2",
            "name": "Member 2 of Test Team 01",
            "province": "Hồ Chí Minh",
            "ward": "Phường 3",
            "organization": "Dev Organization 1",
            "teamId": "team-uuid-1",
            ...
          }
        ]
      }
      // ... more teams
    ]
  }
}
```

## Features

### Team Generation
- Creates the specified number of teams (8 or 16)
- Generates sequential team names with the provided prefix
- Creates unique team numbers using the tournament name prefix
- Assigns all teams to the requesting admin user

### Team Member Generation
- Creates 2 team members for each team
- Uses realistic Vietnamese provinces and wards
- Generates sequential member names and organizations
- Provides minimal required data to satisfy schema constraints

### Data Consistency
- All teams are created within a single transaction-like operation
- Team numbers are generated sequentially to avoid conflicts
- Proper foreign key relationships are maintained

## Error Responses

### 400 Bad Request - Invalid Count
```json
{
  "success": false,
  "message": "Count must be either 8 or 16 teams",
  "error": "ValidationError"
}
```

### 400 Bad Request - Tournament Not Found
```json
{
  "success": false,
  "message": "Tournament with ID {tournamentId} does not exist.",
  "error": "BadRequestException"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized access",
  "error": "UnauthorizedException"
}
```

### 403 Forbidden - Insufficient Permissions
```json
{
  "success": false,
  "message": "Access denied. Admin role required.",
  "error": "ForbiddenException"
}
```

## Usage Notes

- This endpoint is designed for development and testing purposes
- Only ADMIN users can access this endpoint
- Teams are created with minimal but valid data
- Team members have randomized Vietnamese location data
- The endpoint is optimized for quick tournament setup during development

## Integration Example

```typescript
// TypeScript/JavaScript example
const createDevTeams = async (tournamentId: string, count: 8 | 16) => {
  try {
    const response = await fetch('/api/teams/bulk-create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tournamentId,
        count,
        namePrefix: 'Dev Team',
        referralSource: 'Development'
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`Created ${result.data.teamsCreated} teams successfully`);
      return result.data.teams;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Failed to create teams:', error);
    throw error;
  }
};
```
