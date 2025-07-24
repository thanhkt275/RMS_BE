# Bulk Team Creation - Usage Examples

## Quick Start

This endpoint allows you to quickly create 8 or 16 teams for development and testing purposes.

### Prerequisites

1. You must be logged in as an ADMIN user
2. You need a tournament ID where you want to create the teams
3. The tournament must exist in the database

### Basic Usage

#### Example 1: Create 8 teams with default settings

```bash
curl -X POST http://localhost:5000/api/teams/bulk-create \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "your-tournament-uuid-here",
    "count": 8
  }'
```

#### Example 2: Create 16 teams with custom naming

```bash
curl -X POST http://localhost:5000/api/teams/bulk-create \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "your-tournament-uuid-here",
    "count": 16,
    "namePrefix": "Test Team",
    "referralSource": "Development Testing"
  }'
```

### JavaScript/Frontend Integration

```javascript
// Using fetch API
const createDevTeams = async (tournamentId, count = 8) => {
  try {
    const response = await fetch('/api/teams/bulk-create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
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
      console.log(`✅ Created ${result.data.teamsCreated} teams successfully!`);
      console.log(`Tournament: ${result.data.tournament.name}`);
      return result.data.teams;
    } else {
      console.error('❌ Failed to create teams:', result.message);
      throw new Error(result.message);
    }
    
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
};

// Usage
createDevTeams('your-tournament-id', 16)
  .then(teams => {
    console.log('Teams created:', teams.length);
    teams.forEach(team => {
      console.log(`- ${team.name} (${team.teamNumber})`);
    });
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

### React Hook Example

```typescript
import { useState } from 'react';

interface BulkCreateTeamsParams {
  tournamentId: string;
  count: 8 | 16;
  namePrefix?: string;
  referralSource?: string;
}

export const useBulkCreateTeams = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bulkCreateTeams = async (params: BulkCreateTeamsParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teams/bulk-create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          namePrefix: 'Dev Team',
          referralSource: 'Development',
          ...params
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { bulkCreateTeams, loading, error };
};

// Component usage
const DevToolsPanel = () => {
  const { bulkCreateTeams, loading, error } = useBulkCreateTeams();
  const [tournamentId, setTournamentId] = useState('');

  const handleCreate8Teams = async () => {
    try {
      const result = await bulkCreateTeams({
        tournamentId,
        count: 8,
        namePrefix: 'Test Team'
      });
      alert(`Created ${result.teamsCreated} teams successfully!`);
    } catch (error) {
      alert('Failed to create teams');
    }
  };

  const handleCreate16Teams = async () => {
    try {
      const result = await bulkCreateTeams({
        tournamentId,
        count: 16,
        namePrefix: 'Competition Team'
      });
      alert(`Created ${result.teamsCreated} teams successfully!`);
    } catch (error) {
      alert('Failed to create teams');
    }
  };

  return (
    <div className="dev-tools-panel">
      <h3>Development Tools - Bulk Team Creation</h3>
      
      <div className="form-group">
        <label>Tournament ID:</label>
        <input
          type="text"
          value={tournamentId}
          onChange={(e) => setTournamentId(e.target.value)}
          placeholder="Enter tournament UUID"
        />
      </div>

      <div className="button-group">
        <button 
          onClick={handleCreate8Teams} 
          disabled={!tournamentId || loading}
        >
          {loading ? 'Creating...' : 'Create 8 Teams'}
        </button>
        
        <button 
          onClick={handleCreate16Teams} 
          disabled={!tournamentId || loading}
        >
          {loading ? 'Creating...' : 'Create 16 Teams'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}
    </div>
  );
};
```

### What Gets Created

For each team, the endpoint will create:

1. **Team Record**:
   - Unique team number (e.g., "TC00001", "TC00002", etc.)
   - Team name with sequential numbering (e.g., "Dev Team 01", "Dev Team 02")
   - Links to the specified tournament
   - Links to the admin user who created them

2. **Team Members** (2 per team):
   - Member 1: "Member 1 of [Team Name]"
   - Member 2: "Member 2 of [Team Name]"
   - Random Vietnamese provinces and wards
   - Sequential organization names

### Common Use Cases

#### 1. Setting up a test tournament quickly
```bash
# Create 16 teams for a tournament bracket
curl -X POST http://localhost:5000/api/teams/bulk-create \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "tournament-id",
    "count": 16,
    "namePrefix": "Bracket Team"
  }'
```

#### 2. Creating teams for Swiss-system testing
```bash
# Create 8 teams for Swiss rounds
curl -X POST http://localhost:5000/api/teams/bulk-create \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "tournament-id",
    "count": 8,
    "namePrefix": "Swiss Team"
  }'
```

### Error Handling

The endpoint provides clear error messages for common issues:

- **Invalid count**: Must be exactly 8 or 16
- **Tournament not found**: Check your tournament ID
- **Unauthorized**: Make sure you're logged in as ADMIN
- **Network errors**: Check your connection and server status

### Tips

1. **Get Tournament ID**: Use `GET /api/tournaments` to list available tournaments
2. **Check Results**: Use `GET /api/teams?tournamentId=your-id` to verify teams were created
3. **Cleanup**: Teams can be deleted individually using `DELETE /api/teams/:id` if needed
4. **Team Numbers**: The system automatically generates unique team numbers based on tournament name initials

This endpoint is perfect for quickly setting up development environments and testing tournament functionality without manually creating teams one by one.
