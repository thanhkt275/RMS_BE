# Stage Advancement Service Implementation

## Overview

The `StageAdvancementService` is a clean, SOLID-principle-based service that handles the complex logic of advancing teams from one tournament stage to the next. This service ensures data consistency and provides comprehensive validation throughout the advancement process.

## Key Features

### 🎯 Single Responsibility Principle (SRP)
The service has one primary responsibility: managing stage advancement logic. It doesn't handle match scheduling, team management, or other concerns - those are delegated to appropriate services.

### 🔒 Data Integrity
All advancement operations are wrapped in database transactions to ensure consistency. If any part of the advancement process fails, all changes are rolled back.

### ✅ Comprehensive Validation
Before advancing teams, the service validates:
- Stage exists and is in ACTIVE status
- All matches in the stage are completed
- Requested number of teams doesn't exceed available teams
- Next stage configuration is valid (if creating new stage)

### 📊 Ranking-Based Advancement
Teams are ranked using multiple criteria in order of priority:
1. Ranking Points (primary)
2. Point Differential
3. Points Scored
4. Tiebreaker 1 (configurable metric)
5. Tiebreaker 2 (configurable metric)

## API Interface

### Core Methods

#### `advanceTeamsToNextStage(stageId: string, options: AdvancementOptions)`
Main entry point for stage advancement. Handles the complete flow from validation to execution.

**Parameters:**
- `stageId`: ID of the stage to complete and advance teams from
- `options`: Configuration object with advancement settings

**Returns:** `StageAdvancementResult` with details about advanced teams and stage changes

#### `getStageRankings(stageId: string)`
Preview team rankings without advancing teams. Useful for showing rankings before advancement.

#### `isStageReadyForAdvancement(stageId: string)`
Checks if a stage can be advanced, returning detailed status information.

### Configuration Options

```typescript
interface AdvancementOptions {
  teamsToAdvance: number;              // Required: Number of teams to advance
  nextStageId?: string;                // Optional: Specific next stage ID
  createNextStage?: boolean;           // Optional: Auto-create next stage
  nextStageConfig?: {                  // Required if createNextStage is true
    name: string;
    type: 'SWISS' | 'PLAYOFF' | 'FINAL';
    startDate: Date;
    endDate: Date;
    teamsPerAlliance?: number;
  };
}
```

## Database Schema Integration

The service integrates seamlessly with the updated Prisma schema:

### Stage Model Changes
- Added `StageStatus` enum with `ACTIVE` and `COMPLETED` values
- Stage status field now uses proper enum instead of string
- Added relationship to teams currently in the stage

### Team Model Changes
- Added `currentStageId` field to track which stage a team is in
- Added `currentStage` relationship for easy querying
- Proper indexing for performance

## Usage Examples

### Basic Team Advancement
```typescript
const result = await stageAdvancementService.advanceTeamsToNextStage('stage-a-id', {
  teamsToAdvance: 8,
  nextStageId: 'stage-b-id'
});

console.log(`Advanced ${result.totalTeamsAdvanced} teams to ${result.nextStage?.name}`);
```

### Auto-Create Next Stage
```typescript
const result = await stageAdvancementService.advanceTeamsToNextStage('swiss-stage-id', {
  teamsToAdvance: 4,
  createNextStage: true,
  nextStageConfig: {
    name: 'Playoff Stage',
    type: 'PLAYOFF',
    startDate: new Date('2025-01-15'),
    endDate: new Date('2025-01-16'),
    teamsPerAlliance: 2
  }
});
```

### Check Advancement Readiness
```typescript
const readiness = await stageAdvancementService.isStageReadyForAdvancement('stage-id');
if (!readiness.ready) {
  console.log(`Cannot advance: ${readiness.reason}`);
  if (readiness.incompleteMatches) {
    console.log(`${readiness.incompleteMatches} matches still incomplete`);
  }
}
```

## Error Handling

The service provides specific error types for different failure scenarios:

- `NotFoundException`: Stage not found
- `BadRequestException`: Various validation failures
  - Stage already completed
  - Incomplete matches remaining
  - Invalid advancement parameters
  - No teams to advance

## Testing

Comprehensive test suite covers:
- ✅ Successful advancement scenarios
- ✅ Validation error cases
- ✅ Database transaction handling
- ✅ Ranking calculation correctness
- ✅ Next stage creation logic

## Performance Considerations

- Efficient database queries with proper indexing
- Single transaction for all advancement operations
- Minimal data fetching with targeted includes
- Proper error handling to avoid unnecessary processing

## Integration Points

The service integrates with:
- **Prisma ORM**: Database operations and transactions
- **NestJS**: Dependency injection and error handling
- **Stages Module**: Part of the broader tournament management system
- **Team Statistics**: Uses existing team performance data

This implementation provides a robust, maintainable, and scalable solution for tournament stage advancement while maintaining clean separation of concerns and comprehensive error handling.
