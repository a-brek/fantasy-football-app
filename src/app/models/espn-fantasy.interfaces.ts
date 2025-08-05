/**
 * ESPN Fantasy Football TypeScript Interfaces
 * 
 * Comprehensive interface definitions for all ESPN Fantasy Football API data structures.
 * These interfaces cover league information, teams, players, matchups, rosters, and statistics.
 * 
 * @version 1.0.0
 * @author Generated with Claude Code
 */

// =============================================
// ENUMS AND CONSTANTS
// =============================================

/** Player position types */
export enum PlayerPosition {
  QB = 0,
  RB = 2,
  WR = 3,
  TE = 4,
  K = 5,
  DST = 16,
  FLEX = 23,
  BENCH = 20,
  IR = 21
}

/** Injury status types */
export enum InjuryStatus {
  ACTIVE = 'ACTIVE',
  QUESTIONABLE = 'QUESTIONABLE',
  DOUBTFUL = 'DOUBTFUL',
  OUT = 'OUT',
  IR = 'IR',
  NORMAL = 'NORMAL'
}

/** Acquisition types */
export enum AcquisitionType {
  DRAFT = 'DRAFT',
  ADD = 'ADD',
  TRADE = 'TRADE',
  WAIVER = 'WAIVER'
}

/** Team logo types */
export enum LogoType {
  VECTOR = 'VECTOR',
  CUSTOM = 'CUSTOM',
  CUSTOM_VALID = 'CUSTOM_VALID'
}

/** Notification types for team members */
export enum NotificationType {
  TEAM_PLAYER_INJURY = 'TEAM_PLAYER_INJURY',
  TEAM_PLAYER_AVAILABILITY = 'TEAM_PLAYER_AVAILABILITY',
  TEAM_PLAYER_NEWS = 'TEAM_PLAYER_NEWS',
  TEAM_PLAYER_STARTBENCH = 'TEAM_PLAYER_STARTBENCH',
  TEAM_TRADE_OFFER = 'TEAM_TRADE_OFFER',
  DRAFT = 'DRAFT',
  TEAM_MATCHUP_SCORE = 'TEAM_MATCHUP_SCORE',
  KEY_PLAY = 'KEY_PLAY',
  REDZONE = 'REDZONE',
  ADD_DROP = 'ADD_DROP',
  WEEKLY_RECAP = 'WEEKLY_RECAP',
  WAIVERS = 'WAIVERS',
  CELEBRATION_SHARE = 'CELEBRATION_SHARE'
}

/** Streak types for team records */
export enum StreakType {
  WIN = 'WIN',
  LOSS = 'LOSS',
  TIE = 'TIE'
}

/** Matchup winner types */
export enum MatchupWinner {
  HOME = 'HOME',
  AWAY = 'AWAY',
  TIE = 'TIE'
}

// =============================================
// CORE ENTITY INTERFACES
// =============================================

/**
 * Main League interface representing the complete ESPN Fantasy League data
 */
export interface League {
  /** Draft information */
  draftDetail: DraftDetail;
  
  /** Unique game identifier */
  gameId: number;
  
  /** Unique league identifier */
  id: number;
  
  /** League members array */
  members: Member[];
  
  /** Current scoring period ID */
  scoringPeriodId: number;
  
  /** Season year */
  seasonId: number;
  
  /** Segment identifier */
  segmentId: number;
  
  /** League status information */
  status: LeagueStatus;
  
  /** Array of teams in the league */
  teams: Team[];
  
  /** Schedule information (optional, present in some responses) */
  schedule?: ScheduleItem[];
}

/**
 * Draft detail information
 */
export interface DraftDetail {
  /** Whether the draft has been completed */
  drafted: boolean;
  
  /** Whether the draft is currently in progress */
  inProgress: boolean;
}

/**
 * League member information
 */
export interface Member {
  /** Display name of the member */
  displayName: string;
  
  /** First name */
  firstName: string;
  
  /** Unique member ID (GUID format) */
  id: string;
  
  /** Last name */
  lastName: string;
  
  /** Array of notification settings */
  notificationSettings: NotificationSetting[];
}

/**
 * Member notification settings
 */
export interface NotificationSetting {
  /** Whether the notification is enabled */
  enabled: boolean;
  
  /** Unique notification ID */
  id: string;
  
  /** Type of notification */
  type: NotificationType;
}

/**
 * League status information
 */
export interface LeagueStatus {
  /** When the league was activated (timestamp) */
  activatedDate: number;
  
  /** League type when created */
  createdAsLeagueType: number;
  
  /** Current league type */
  currentLeagueType: number;
  
  /** Current matchup period */
  currentMatchupPeriod: number;
  
  /** Final scoring period of the season */
  finalScoringPeriod: number;
  
  /** First scoring period of the season */
  firstScoringPeriod: number;
  
  /** Whether the league is currently active */
  isActive: boolean;
  
  /** Whether the league has expired */
  isExpired: boolean;
  
  /** Whether the league is full */
  isFull: boolean;
  
  /** Whether playoff matchups have been edited */
  isPlayoffMatchupEdited: boolean;
  
  /** Whether the league is marked for deletion */
  isToBeDeleted: boolean;
  
  /** Whether the league is viewable */
  isViewable: boolean;
  
  /** Whether waiver order has been edited */
  isWaiverOrderEdited: boolean;
  
  /** Latest scoring period */
  latestScoringPeriod: number;
  
  /** Array of previous seasons */
  previousSeasons: number[];
  
  /** Last standings update timestamp */
  standingsUpdateDate: number;
  
  /** Number of teams that have joined */
  teamsJoined: number;
  
  /** Current transaction scoring period */
  transactionScoringPeriod: number;
  
  /** Last waiver execution timestamp */
  waiverLastExecutionDate: number;
  
  /** Waiver process status by date */
  waiverProcessStatus: { [date: string]: number };
}

// =============================================
// TEAM INTERFACES
// =============================================

/**
 * Team information interface
 */
export interface Team {
  /** Team abbreviation */
  abbrev: string;
  
  /** Current projected rank */
  currentProjectedRank: number;
  
  /** Division ID */
  divisionId: number;
  
  /** Draft day projected rank */
  draftDayProjectedRank: number;
  
  /** Unique team ID */
  id: number;
  
  /** Whether the team is active */
  isActive: boolean;
  
  /** Team logo URL */
  logo: string;
  
  /** Logo type */
  logoType: LogoType;
  
  /** Team name */
  name: string;
  
  /** Array of owner IDs */
  owners: string[];
  
  /** Playoff seed */
  playoffSeed: number;
  
  /** Total points scored */
  points: number;
  
  /** Points adjustment */
  pointsAdjusted: number;
  
  /** Points delta */
  pointsDelta: number;
  
  /** Primary owner ID */
  primaryOwner: string;
  
  /** Calculated final rank */
  rankCalculatedFinal: number;
  
  /** Final rank */
  rankFinal: number;
  
  /** Team record information */
  record: TeamRecord;
  
  /** Team roster (optional, present in roster data) */
  roster?: TeamRoster;
  
  /** Transaction counter information */
  transactionCounter: TransactionCounter;
  
  /** Statistical values by stat type */
  valuesByStat: { [statId: string]: number };
  
  /** Waiver rank */
  waiverRank: number;
}

/**
 * Team record information
 */
export interface TeamRecord {
  /** Away game record */
  away: RecordDetail;
  
  /** Division record */
  division: RecordDetail;
  
  /** Home game record */
  home: RecordDetail;
  
  /** Overall record */
  overall: RecordDetail;
}

/**
 * Detailed record information
 */
export interface RecordDetail {
  /** Games back from leader */
  gamesBack: number;
  
  /** Number of losses */
  losses: number;
  
  /** Win percentage */
  percentage: number;
  
  /** Points scored against */
  pointsAgainst: number;
  
  /** Points scored for */
  pointsFor: number;
  
  /** Current streak length */
  streakLength: number;
  
  /** Type of current streak */
  streakType: StreakType;
  
  /** Number of ties */
  ties: number;
  
  /** Number of wins */
  wins: number;
}

/**
 * Transaction counter information
 */
export interface TransactionCounter {
  /** Budget spent on acquisitions */
  acquisitionBudgetSpent: number;
  
  /** Total number of acquisitions */
  acquisitions: number;
  
  /** Total number of drops */
  drops: number;
  
  /** Acquisitions by matchup period */
  matchupAcquisitionTotals: { [period: string]: number };
  
  /** Miscellaneous transactions */
  misc: number;
  
  /** Moves to active roster */
  moveToActive: number;
  
  /** Moves to injured reserve */
  moveToIR: number;
  
  /** Paid transactions */
  paid: number;
  
  /** Team charges */
  teamCharges: number;
  
  /** Number of trades */
  trades: number;
}

// =============================================
// ROSTER AND PLAYER INTERFACES
// =============================================

/**
 * Team roster information
 */
export interface TeamRoster {
  /** Applied statistical total */
  appliedStatTotal: number;
  
  /** Array of roster entries */
  entries: RosterEntry[];
}

/**
 * Individual roster entry
 */
export interface RosterEntry {
  /** When the player was acquired (timestamp) */
  acquisitionDate: number;
  
  /** How the player was acquired */
  acquisitionType: AcquisitionType;
  
  /** Player's injury status */
  injuryStatus: InjuryStatus;
  
  /** Lineup slot ID where player is positioned */
  lineupSlotId: number;
  
  /** Pending transaction IDs (if any) */
  pendingTransactionIds: number[] | null;
  
  /** Unique player ID */
  playerId: number;
  
  /** Player pool entry information */
  playerPoolEntry: PlayerPoolEntry;
  
  /** Current status */
  status: string;
}

/**
 * Player pool entry information
 */
export interface PlayerPoolEntry {
  /** Applied statistical total */
  appliedStatTotal: number;
  
  /** Unique player ID */
  id: number;
  
  /** Keeper value */
  keeperValue: number;
  
  /** Future keeper value */
  keeperValueFuture: number;
  
  /** Whether lineup is locked */
  lineupLocked: boolean;
  
  /** Team ID the player is on */
  onTeamId: number;
  
  /** Detailed player information */
  player: Player;
  
  /** Player ratings */
  ratings: { [key: string]: PlayerRating };
  
  /** Whether roster is locked */
  rosterLocked: boolean;
  
  /** Player status */
  status: string;
  
  /** Whether trades are locked */
  tradeLocked: boolean;
  
  /** Universe ID */
  universeId: number;
}

/**
 * Detailed player information
 */
export interface Player {
  /** Whether the player is active */
  active: boolean;
  
  /** Default position ID */
  defaultPositionId: number;
  
  /** Draft rankings by rank type */
  draftRanksByRankType: { [rankType: string]: DraftRank };
  
  /** Whether the player can be dropped */
  droppable: boolean;
  
  /** Array of eligible lineup slots */
  eligibleSlots: number[];
  
  /** Player's first name */
  firstName: string;
  
  /** Player's full name */
  fullName: string;
  
  /** Unique player ID */
  id: number;
  
  /** Whether the player is injured */
  injured: boolean;
  
  /** Injury status */
  injuryStatus: InjuryStatus;
  
  /** Player's last name */
  lastName: string;
  
  /** Ownership information */
  ownership: PlayerOwnership;
  
  /** Professional team ID */
  proTeamId: number;
  
  /** Array of player statistics */
  stats: PlayerStat[];
}

/**
 * Draft ranking information
 */
export interface DraftRank {
  /** Auction value */
  auctionValue: number;
  
  /** Whether the ranking is published */
  published: boolean;
  
  /** Rank number */
  rank: number;
  
  /** Rank source ID */
  rankSourceId: number;
  
  /** Rank type */
  rankType: string;
  
  /** Slot ID */
  slotId: number;
}

/**
 * Player ownership information
 */
export interface PlayerOwnership {
  /** Average auction value */
  auctionValueAverage: number;
  
  /** Average draft position */
  averageDraftPosition: number;
  
  /** Percentage change in ownership */
  percentChange: number;
  
  /** Percentage of leagues where owned */
  percentOwned: number;
  
  /** Percentage of leagues where started */
  percentStarted: number;
}

/**
 * Player statistical information
 */
export interface PlayerStat {
  /** Applied average (optional) */
  appliedAverage?: number;
  
  /** Applied statistics */
  appliedStats: { [statId: string]: number };
  
  /** Applied total */
  appliedTotal: number;
  
  /** External ID */
  externalId: string;
  
  /** Stat ID */
  id: string;
  
  /** Professional team ID */
  proTeamId: number;
  
  /** Scoring period ID */
  scoringPeriodId: number;
  
  /** Season ID */
  seasonId: number;
  
  /** Stat source ID */
  statSourceId: number;
  
  /** Stat split type ID */
  statSplitTypeId: number;
  
  /** Raw statistics */
  stats: { [statId: string]: number };
}

/**
 * Player rating information
 */
export interface PlayerRating {
  /** Positional ranking */
  positionalRanking: number;
  
  /** Total ranking */
  totalRanking: number;
  
  /** Total rating value */
  totalRating: number;
}

// =============================================
// MATCHUP AND SCHEDULE INTERFACES
// =============================================

/**
 * Schedule item for matchups
 */
export interface ScheduleItem {
  /** Away team information */
  away: ScheduleTeam;
  
  /** Home team information */
  home: ScheduleTeam;
  
  /** Unique matchup ID (optional) */
  id?: number;
  
  /** Matchup period ID */
  matchupPeriodId: number;
  
  /** Winner of the matchup (optional) */
  winner?: MatchupWinner;
}

/**
 * Team information in schedule context
 */
export interface ScheduleTeam {
  /** Cumulative score information (optional, in detailed matchup data) */
  cumulativeScore?: CumulativeScore;
  
  /** Number of games played */
  gamesPlayed: number;
  
  /** Points by scoring period (optional) */
  pointsByScoringPeriod?: { [period: string]: number };
  
  /** Team ID */
  teamId: number;
  
  /** Total points scored */
  totalPoints: number;
}

/**
 * Cumulative score information
 */
export interface CumulativeScore {
  /** Number of losses */
  losses: number;
  
  /** Score by individual statistics */
  scoreByStat: { [statId: string]: StatScore };
  
  /** Statistics by slot (optional) */
  statBySlot: any; // This appears to be null in the data
  
  /** Number of ties */
  ties: number;
  
  /** Number of wins */
  wins: number;
}

/**
 * Individual statistic score
 */
export interface StatScore {
  /** Whether the stat is ineligible */
  ineligible: boolean;
  
  /** Rank for this statistic */
  rank: number;
  
  /** Result (usually null in regular season) */
  result: any;
  
  /** Score value */
  score: number;
}

// =============================================
// API RESPONSE WRAPPERS
// =============================================

/**
 * API response wrapper for league data
 */
export interface LeagueResponse {
  /** The main league data */
  league: League;
  
  /** Response status */
  status?: string;
  
  /** Any error messages */
  error?: string;
}

/**
 * API response wrapper for team data
 */
export interface TeamsResponse {
  /** Array of teams */
  teams: Team[];
  
  /** Response status */
  status?: string;
  
  /** Any error messages */
  error?: string;
}

/**
 * API response wrapper for roster data
 */
export interface RosterResponse {
  /** Array of teams with roster information */
  teams: Team[];
  
  /** Response status */
  status?: string;
  
  /** Any error messages */
  error?: string;
}

/**
 * API response wrapper for matchup data
 */
export interface MatchupResponse {
  /** Array of schedule items */
  schedule: ScheduleItem[];
  
  /** League information */
  league?: Partial<League>;
  
  /** Response status */
  status?: string;
  
  /** Any error messages */
  error?: string;
}

/**
 * API response wrapper for standings data
 */
export interface StandingsResponse {
  /** Complete league data including standings */
  league: League;
  
  /** Response status */
  status?: string;
  
  /** Any error messages */
  error?: string;
}

// =============================================
// UTILITY TYPES AND HELPERS
// =============================================

/**
 * Utility type for optional fields in API requests
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for required fields in API responses
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Common query parameters for ESPN Fantasy API
 */
export interface ESPNApiQueryParams {
  /** League ID */
  leagueId?: number;
  
  /** Season year */
  seasonId?: number;
  
  /** Scoring period */
  scoringPeriodId?: number;
  
  /** Matchup period */
  matchupPeriodId?: number;
  
  /** View parameters */
  view?: string[];
}

/**
 * ESPN Fantasy API endpoints configuration
 */
export interface ESPNApiEndpoints {
  /** Base API URL */
  baseUrl: string;
  
  /** League endpoint */
  league: string;
  
  /** Teams endpoint */
  teams: string;
  
  /** Roster endpoint */
  roster: string;
  
  /** Matchups endpoint */
  matchups: string;
  
  /** Standings endpoint */
  standings: string;
}

/**
 * Statistical categories mapping
 */
export interface StatCategories {
  /** Passing statistics */
  passing: { [key: string]: string };
  
  /** Rushing statistics */
  rushing: { [key: string]: string };
  
  /** Receiving statistics */
  receiving: { [key: string]: string };
  
  /** Kicking statistics */
  kicking: { [key: string]: string };
  
  /** Defense/Special Teams statistics */
  defense: { [key: string]: string };
}

// =============================================
// TYPE GUARDS AND VALIDATION
// =============================================

/**
 * Type guard to check if an object is a valid League
 */
export function isLeague(obj: any): obj is League {
  return obj && 
         typeof obj.id === 'number' &&
         typeof obj.seasonId === 'number' &&
         Array.isArray(obj.teams) &&
         Array.isArray(obj.members);
}

/**
 * Type guard to check if an object is a valid Team
 */
export function isTeam(obj: any): obj is Team {
  return obj &&
         typeof obj.id === 'number' &&
         typeof obj.name === 'string' &&
         obj.record &&
         Array.isArray(obj.owners);
}

/**
 * Type guard to check if an object is a valid Player
 */
export function isPlayer(obj: any): obj is Player {
  return obj &&
         typeof obj.id === 'number' &&
         typeof obj.fullName === 'string' &&
         typeof obj.defaultPositionId === 'number' &&
         Array.isArray(obj.eligibleSlots);
}

/**
 * Common statistical IDs used in ESPN Fantasy Football
 */
export const STAT_IDS = {
  // Passing
  PASSING_YARDS: '3',
  PASSING_TDS: '4',
  PASSING_INTS: '20',
  PASSING_2PT: '19',
  
  // Rushing  
  RUSHING_YARDS: '24',
  RUSHING_TDS: '25',
  RUSHING_2PT: '26',
  
  // Receiving
  RECEIVING_YARDS: '42',
  RECEIVING_TDS: '43',
  RECEIVING_2PT: '44',
  RECEPTIONS: '53',
  
  // Kicking
  FIELD_GOALS: '72',
  EXTRA_POINTS: '74',
  
  // Defense
  DEFENSIVE_TDS: '95',
  INTERCEPTIONS: '96',
  FUMBLE_RECOVERIES: '97',
  SACKS: '99'
} as const;

export default League;