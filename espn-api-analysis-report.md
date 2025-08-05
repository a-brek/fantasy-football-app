# ESPN Fantasy Football API Analysis Report

## Overview
This report analyzes the structure and data relationships of the ESPN Fantasy Football API endpoints. Four API views were examined:
- `mMatchup` - Match results and scoring data
- `mStandings` - League standings (minimal data)
- `mRoster` - Team rosters and player information
- `mTeam` - Complete team information and league metadata

## Data Files Generated
- `matchup-data.json` (653.5KB) - Comprehensive matchup data
- `standings-data.json` - Minimal standings data
- `roster-data.json` - Detailed roster and player information
- `team-data.json` - Complete team and league information

## API Endpoint Analysis

### 1. Matchup Data (`view=mMatchup`)

**Top-level Structure:**
- `draftDetail`: Draft status information
- `gameId`: League game identifier
- `id`: League ID
- `schedule`: Array of 103 matchup objects
- `scoringPeriodId`, `seasonId`, `segmentId`: Time-based identifiers
- `status`: League status information
- `teams`: Team data (minimal in this view)

**Key Matchup Object Structure:**
```javascript
{
  "id": 1,
  "matchupPeriodId": 1,
  "winner": "HOME",
  "away": {
    "teamId": 1,
    "totalPoints": 65.54,
    "pointsByScoringPeriod": {"1": 65.54},
    "cumulativeScore": {
      "wins": 0, "losses": 0, "ties": 0,
      "scoreByStat": {/* detailed stat breakdowns */}
    }
  },
  "home": {/* same structure as away */}
}
```

**Key Insights:**
- Contains complete scoring history for all matchups
- Detailed stat-by-stat breakdowns (42+ different stats)
- Historical cumulative scoring data
- Winner determination for each matchup

### 2. Standings Data (`view=mStandings`)

**Structure:**
- Similar top-level structure to matchup data
- `teams`: Minimal team data (only team IDs)

**Key Insights:**
- Very minimal data compared to other views
- Only provides team IDs without standings information
- May require combination with other views for complete standings

### 3. Roster Data (`view=mRoster`)

**Top-level Structure:**
- Similar base structure without `schedule`
- `teams`: Array of 12 team objects with detailed roster information

**Key Team/Roster Structure:**
```javascript
{
  "id": 1,
  "roster": {
    "entries": [
      {
        "playerId": 3117251,
        "lineupSlotId": 20,
        "acquisitionDate": timestamp,
        "acquisitionType": "DRAFT",
        "injuryStatus": "NORMAL",
        "playerPoolEntry": {
          "id": 3117251,
          "player": {
            "fullName": "Christian McCaffrey",
            "defaultPositionId": 2,
            "proTeamId": 25,
            "eligibleSlots": [2, 3, 23, 7, 20, 21],
            "ownership": {
              "percentOwned": 60.01,
              "percentStarted": 15.06,
              "averageDraftPosition": 15.96
            },
            "stats": {/* seasonal and weekly stats */}
          }
        }
      }
    ]
  }
}
```

**Key Insights:**
- Complete player information including names, positions, pro teams
- Detailed ownership percentages and draft position data
- Player eligibility for different lineup slots
- Comprehensive statistical data (34+ stat categories)
- Acquisition history and injury status

### 4. Team Data (`view=mTeam`) - Most Comprehensive

**Top-level Structure:**
- `members`: Array of league members (12 people)
- `teams`: Complete team information
- All standard league metadata

**Key Team Object Structure:**
```javascript
{
  "id": 1,
  "abbrev": "FIN",
  "name": null,
  "logo": "https://g.espncdn.com/lm-static/logo-packs/...",
  "isActive": true,
  "record": {
    "overall": {
      "wins": 3,
      "losses": 11,
      "ties": 0,
      "percentage": 0.214,
      "pointsFor": 1198.22,
      "pointsAgainst": 1694.54
    }
  },
  "owners": ["{OWNER-GUID}"],
  "playoffSeed": 12,
  "currentProjectedRank": 12,
  "waiverRank": 12
}
```

**League Members Structure:**
```javascript
{
  "id": "{GUID}",
  "displayName": "Username",
  "firstName": "First",
  "lastName": "Last"
}
```

**League Status Information:**
- `currentMatchupPeriod`: 17
- `finalScoringPeriod`: 17
- `latestScoringPeriod`: 19
- `isActive`: true
- Draft status and waiver information

## Data Relationships

### Primary Keys and Relationships:
1. **Team ID** (`teamId`/`id`) - Links teams across all endpoints
2. **Player ID** (`playerId`) - Links players in roster data
3. **Matchup Period ID** - Links to specific weeks/matchups
4. **Member ID** (GUID) - Links team owners to league members

### Data Hierarchy:
```
League (id: 532886)
├── Teams (12 teams)
│   ├── Team Metadata (name, logo, record)
│   ├── Roster (16 players per team)
│   │   └── Player Stats & Info
│   └── Matchup History
├── Members (12 league members)
└── League Settings & Status
```

## Important Fields for Fantasy Dashboard

### Essential Team Information:
- `team.id` - Team identifier
- `team.abbrev` - Team abbreviation
- `team.logo` - Team logo URL
- `team.record.overall.*` - Win/loss record and points
- `team.playoffSeed` - Playoff positioning
- `team.owners` - Owner identification

### Critical Player Data:
- `player.fullName` - Player name
- `player.defaultPositionId` - Primary position
- `player.proTeamId` - NFL team
- `player.eligibleSlots` - Valid lineup positions
- `player.ownership.*` - Ownership percentages
- `player.stats` - Performance statistics

### Matchup Information:
- `schedule[].away/home.teamId` - Team matchups
- `schedule[].away/home.totalPoints` - Scoring
- `schedule[].winner` - Match results
- `schedule[].matchupPeriodId` - Week identifier

### League Context:
- `status.currentMatchupPeriod` - Current week
- `status.finalScoringPeriod` - Season end
- `members[]` - League participants
- `draftDetail` - Draft completion status

## Data Model Recommendations

### 1. Normalized Database Structure:
```sql
-- Core entities
Leagues (id, name, season, status)
Teams (id, league_id, name, abbrev, logo, owner_id)
Players (id, name, position, pro_team_id)
Members (id, display_name, first_name, last_name)

-- Relationships
TeamRosters (team_id, player_id, lineup_slot, acquisition_date)
Matchups (id, league_id, period_id, home_team_id, away_team_id, home_score, away_score, winner)
PlayerStats (player_id, team_id, period_id, stat_type, value)
TeamRecords (team_id, wins, losses, ties, points_for, points_against)
```

### 2. API Integration Strategy:
- **Primary Data Source**: `mTeam` view for complete team and league information
- **Player Details**: `mRoster` view for roster and player statistics
- **Matchup History**: `mMatchup` view for scoring and results
- **Redundancy**: `mStandings` provides minimal value, can be skipped

### 3. Caching Strategy:
- **Static Data**: Team logos, player names, league members (cache for season)
- **Semi-Static**: Rosters, team records (cache for week, refresh twice weekly)
- **Dynamic**: Current matchup scores, live stats (refresh frequently during games)

### 4. Dashboard Data Structure:
```javascript
// Recommended flattened structure for frontend
{
  "league": {
    "id": 532886,
    "currentWeek": 17,
    "finalWeek": 17,
    "isActive": true
  },
  "teams": [
    {
      "id": 1,
      "name": "Team Name",
      "abbrev": "FIN",
      "logo": "url",
      "owner": "Display Name",
      "record": {
        "wins": 3, "losses": 11,
        "pointsFor": 1198.22,
        "pointsAgainst": 1694.54,
        "percentage": 0.214
      },
      "roster": [/* simplified player objects */],
      "currentMatchup": {/* current week opponent and scores */}
    }
  ],
  "standings": [/* teams sorted by record */],
  "matchups": {
    "current": [/* this week's matchups */],
    "history": [/* past matchups */]
  }
}
```

## Conclusion

The ESPN Fantasy Football API provides comprehensive data through multiple views. The `mTeam` and `mRoster` views contain the most essential information for building a fantasy football dashboard. The data is well-structured but requires careful normalization and caching strategies for optimal performance in a modern web application.

The API design follows ESPN's internal data model closely, which means some denormalization and data transformation will be necessary to create an optimal user experience. The wealth of statistical data and historical information makes it excellent for building detailed analytics and visualizations.