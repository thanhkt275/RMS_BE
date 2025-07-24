# Section-Based Scoring System

This enhanced scoring system allows admins to create score configurations with **sections** (like "auto" and "teleop" periods) and define custom **formulas** to calculate the total score.

## Key Features

1. **Score Sections**: Group related score elements, bonuses, and penalties into logical sections
2. **Custom Formulas**: Define how section scores combine to create the total score
3. **Backward Compatibility**: Still supports legacy direct elements/bonuses/penalties

## Example: Game with Auto and Teleop Periods

### 1. Create Score Configuration with Sections

```json
POST /api/score-configs
{
  "name": "2024 Game Rules",
  "description": "Two-period game: Autonomous and Teleoperated",
  "totalScoreFormula": "auto * 1.5 + teleop",
  "scoreSections": [
    {
      "name": "Autonomous Period",
      "code": "auto",
      "description": "15-second autonomous period",
      "displayOrder": 0,
      "scoreElements": [
        {
          "name": "Auto Cubes Scored",
          "code": "auto_cubes",
          "pointsPerUnit": 6,
          "elementType": "COUNTER",
          "displayOrder": 0
        },
        {
          "name": "Auto Cones Scored", 
          "code": "auto_cones",
          "pointsPerUnit": 4,
          "elementType": "COUNTER",
          "displayOrder": 1
        }
      ],
      "bonusConditions": [
        {
          "name": "Auto Mobility Bonus",
          "code": "auto_mobility",
          "bonusPoints": 5,
          "condition": {
            "type": "simple",
            "elementCode": "auto_mobility",
            "operator": ">=",
            "value": 1
          },
          "displayOrder": 0
        }
      ]
    },
    {
      "name": "Teleoperated Period",
      "code": "teleop", 
      "description": "2:15 teleoperated period",
      "displayOrder": 1,
      "scoreElements": [
        {
          "name": "Teleop Cubes Scored",
          "code": "teleop_cubes",
          "pointsPerUnit": 3,
          "elementType": "COUNTER",
          "displayOrder": 0
        },
        {
          "name": "Teleop Cones Scored",
          "code": "teleop_cones", 
          "pointsPerUnit": 2,
          "elementType": "COUNTER",
          "displayOrder": 1
        }
      ],
      "bonusConditions": [
        {
          "name": "Endgame Climb",
          "code": "endgame_climb",
          "bonusPoints": 10,
          "condition": {
            "type": "simple",
            "elementCode": "climb_success",
            "operator": ">=", 
            "value": 1
          },
          "displayOrder": 0
        }
      ]
    }
  ]
}
```

### 2. How Scoring Works

When calculating scores for a match:

**Example Element Scores:**
```json
{
  "auto_cubes": 2,      // 2 cubes in auto = 2 × 6 = 12 points
  "auto_cones": 1,      // 1 cone in auto = 1 × 4 = 4 points  
  "auto_mobility": 1,   // Mobility bonus = 5 points
  "teleop_cubes": 5,    // 5 cubes in teleop = 5 × 3 = 15 points
  "teleop_cones": 8,    // 8 cones in teleop = 8 × 2 = 16 points
  "climb_success": 1    // Climb bonus = 10 points
}
```

**Section Calculations:**
- **Auto Section Score**: 12 + 4 + 5 = 21 points
- **Teleop Section Score**: 15 + 16 + 10 = 41 points

**Total Score (using formula "auto * 1.5 + teleop"):**
- Total = 21 × 1.5 + 41 = 31.5 + 41 = **72.5 points**

### 3. API Endpoints

#### Section Management
```http
# Add a section to existing config
POST /api/score-configs/{configId}/sections

# Update a section
PATCH /api/score-configs/sections/{sectionId}

# Delete a section  
DELETE /api/score-configs/sections/{sectionId}

# Add elements to a section
POST /api/score-configs/sections/{sectionId}/elements
POST /api/score-configs/sections/{sectionId}/bonuses  
POST /api/score-configs/sections/{sectionId}/penalties
```

#### Formula Management
```http
# Update the total score formula
PATCH /api/score-configs/{configId}/formula
{
  "formula": "auto * 2 + teleop + (auto > 20 ? 5 : 0)"
}
```

#### Score Calculation
```http
# Calculate with sections (new method)
POST /api/score-configs/calculate-sections/{matchId}/{allianceId}
{
  "elementScores": {
    "auto_cubes": 2,
    "teleop_cones": 5,
    ...
  }
}
```

### 4. Formula Examples

- **Simple Addition**: `"auto + teleop"`
- **Weighted Sections**: `"auto * 1.5 + teleop"`  
- **Complex Formula**: `"auto * 2 + teleop + endgame * 0.5"`
- **Conditional Logic**: Available through bonus/penalty conditions

### 5. Response Format

The new calculation endpoint returns detailed section breakdown:

```json
{
  "matchId": "match123",
  "allianceId": "alliance456", 
  "totalScore": 72.5,
  "usingSections": true,
  "formula": "auto * 1.5 + teleop",
  "calculationLog": {
    "sections": [
      {
        "sectionCode": "auto",
        "sectionName": "Autonomous Period",
        "totalScore": 21,
        "elements": [...],
        "bonuses": [...],
        "penalties": []
      },
      {
        "sectionCode": "teleop", 
        "sectionName": "Teleoperated Period",
        "totalScore": 41,
        "elements": [...],
        "bonuses": [...],
        "penalties": []
      }
    ],
    "sectionScores": {
      "auto": 21,
      "teleop": 41
    },
    "totalScore": 72.5
  }
}
```

## Migration Path

Existing score configurations continue to work unchanged. To migrate:

1. Create sections for your logical game periods
2. Move existing elements/bonuses/penalties to appropriate sections  
3. Define a formula (or leave empty to sum all sections)
4. Update your frontend to use the new calculation endpoint

The system supports both old and new approaches simultaneously.
