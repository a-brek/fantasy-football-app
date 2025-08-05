// Temporary stub service to make app compile while we complete the store migration
import { Team, ScheduleItem, League, Member } from './models/espn-fantasy.interfaces';

const mockMember: Member = {
  displayName: 'Mock User',
  firstName: 'Mock',
  lastName: 'User', 
  id: 'mock-id',
  notificationSettings: []
};

const mockTeam: Team = {
  id: 1,
  name: 'Sample Team',
  abbrev: 'ST',
  owners: ['mock-id'],
  record: {
    overall: {
      pointsFor: 100,
      pointsAgainst: 90,
      wins: 5,
      losses: 3,
      ties: 0,
      percentage: 0.625,
      gamesBack: 0,
      streakLength: 2,
      streakType: 'WIN' as any
    },
    home: {
      pointsFor: 50,
      pointsAgainst: 45,
      wins: 3,
      losses: 1,
      ties: 0,
      percentage: 0.75,
      gamesBack: 0,
      streakLength: 1,
      streakType: 'WIN' as any
    },
    away: {
      pointsFor: 50,
      pointsAgainst: 45,
      wins: 2,
      losses: 2,
      ties: 0,
      percentage: 0.5,
      gamesBack: 1,
      streakLength: 1,
      streakType: 'LOSS' as any
    },
    division: {
      pointsFor: 100,
      pointsAgainst: 90,
      wins: 5,
      losses: 3,
      ties: 0,
      percentage: 0.625,
      gamesBack: 0,
      streakLength: 2,
      streakType: 'WIN' as any
    }
  },
  logo: '',
  logoType: 'CUSTOM' as any,
  isActive: true,
  currentProjectedRank: 1,
  divisionId: 0,
  draftDayProjectedRank: 1,
  playoffSeed: 1,
  points: 100,
  pointsAdjusted: 0,
  pointsDelta: 0,
  primaryOwner: 'mock-id',
  rankCalculatedFinal: 1,
  rankFinal: 1,
  transactionCounter: {
    acquisitionBudgetSpent: 0,
    acquisitions: 0,
    drops: 0,
    matchupAcquisitionTotals: {},
    misc: 0,
    moveToActive: 0,
    moveToIR: 0,
    paid: 0,
    teamCharges: 0,
    trades: 0
  },
  valuesByStat: {},
  waiverRank: 1
};

const mockMatchup: ScheduleItem = {
  matchupPeriodId: 1,
  away: {
    teamId: 1,
    totalPoints: 85,
    gamesPlayed: 1
  },
  home: {
    teamId: 2,
    totalPoints: 92,
    gamesPlayed: 1
  },
  winner: 'HOME' as any,
  id: 1
};

const mockLeague: League = {
  id: 1,
  seasonId: 2024,
  gameId: 1,
  segmentId: 0,
  scoringPeriodId: 1,
  members: [mockMember],
  teams: [mockTeam],
  draftDetail: {
    drafted: true,
    inProgress: false
  },
  status: {
    activatedDate: Date.now(),
    createdAsLeagueType: 0,
    currentLeagueType: 0,
    currentMatchupPeriod: 1,
    finalScoringPeriod: 17,
    firstScoringPeriod: 1,
    isActive: true,
    isExpired: false,
    isFull: true,
    isPlayoffMatchupEdited: false,
    isToBeDeleted: false,
    isViewable: true,
    isWaiverOrderEdited: false,
    latestScoringPeriod: 1,
    previousSeasons: [],
    standingsUpdateDate: Date.now(),
    teamsJoined: 12,
    transactionScoringPeriod: 1,
    waiverLastExecutionDate: Date.now(),
    waiverProcessStatus: {}
  }
};

export const StubService = {
  isLoading: () => false,
  isLoadingMatchups: () => false,
  isLoadingTeams: () => false,
  isLoadingRosters: () => false,
  isLoadingStandings: () => false,
  currentWeek: () => 1,
  teams: () => [mockTeam],
  matchups: () => [mockMatchup],
  standings: () => [mockTeam],
  rosters: () => [mockTeam],
  league: () => mockLeague,
  currentWeekMatchups: () => [mockMatchup],
  getTeamById: (id: any) => mockTeam,
  initializeData: async () => {},
  refreshData: async () => {},
  loadTeams: async () => {},
  loadMatchups: async () => {},
  loadStandings: async () => {},
  loadRosters: async () => {}
};

export const StubErrorHandler = {
  getUserFriendlyMessage: (error?: any) => 'An error occurred'
};