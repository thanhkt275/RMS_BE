
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  username: 'username',
  password: 'password',
  role: 'role',
  email: 'email',
  gender: 'gender',
  DateOfBirth: 'DateOfBirth',
  phoneNumber: 'phoneNumber',
  avatar: 'avatar',
  isActive: 'isActive',
  lastLoginAt: 'lastLoginAt',
  emailVerified: 'emailVerified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById'
};

exports.Prisma.TournamentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  startDate: 'startDate',
  endDate: 'endDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  adminId: 'adminId',
  numberOfFields: 'numberOfFields'
};

exports.Prisma.StageScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  status: 'status',
  startDate: 'startDate',
  endDate: 'endDate',
  tournamentId: 'tournamentId',
  teamsPerAlliance: 'teamsPerAlliance',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MatchScalarFieldEnum = {
  id: 'id',
  matchNumber: 'matchNumber',
  roundNumber: 'roundNumber',
  status: 'status',
  startTime: 'startTime',
  scheduledTime: 'scheduledTime',
  endTime: 'endTime',
  duration: 'duration',
  winningAlliance: 'winningAlliance',
  stageId: 'stageId',
  scoredById: 'scoredById',
  roundType: 'roundType',
  scheduleId: 'scheduleId',
  fieldId: 'fieldId',
  matchType: 'matchType',
  matchDuration: 'matchDuration',
  updatedAt: 'updatedAt'
};

exports.Prisma.MatchRefereeScalarFieldEnum = {
  id: 'id',
  matchId: 'matchId',
  userId: 'userId',
  role: 'role',
  position: 'position',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AllianceScalarFieldEnum = {
  id: 'id',
  color: 'color',
  score: 'score',
  autoScore: 'autoScore',
  driveScore: 'driveScore',
  matchId: 'matchId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeamScalarFieldEnum = {
  id: 'id',
  teamNumber: 'teamNumber',
  name: 'name',
  organization: 'organization',
  avatar: 'avatar',
  description: 'description',
  teamLead: 'teamLead',
  teamLeadId: 'teamLeadId',
  teamMembers: 'teamMembers',
  tournamentId: 'tournamentId',
  currentStageId: 'currentStageId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeamAllianceScalarFieldEnum = {
  id: 'id',
  teamId: 'teamId',
  allianceId: 'allianceId',
  stationPosition: 'stationPosition',
  isSurrogate: 'isSurrogate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeamStatsScalarFieldEnum = {
  id: 'id',
  teamId: 'teamId',
  tournamentId: 'tournamentId',
  stageId: 'stageId',
  wins: 'wins',
  losses: 'losses',
  ties: 'ties',
  pointsScored: 'pointsScored',
  pointsConceded: 'pointsConceded',
  matchesPlayed: 'matchesPlayed',
  rankingPoints: 'rankingPoints',
  opponentWinPercentage: 'opponentWinPercentage',
  pointDifferential: 'pointDifferential',
  rank: 'rank',
  tiebreaker1: 'tiebreaker1',
  tiebreaker2: 'tiebreaker2',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FieldScalarFieldEnum = {
  id: 'id',
  name: 'name',
  number: 'number',
  location: 'location',
  description: 'description',
  tournamentId: 'tournamentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FieldDisplayScalarFieldEnum = {
  id: 'id',
  fieldId: 'fieldId',
  displayState: 'displayState',
  currentMatchId: 'currentMatchId',
  customMessage: 'customMessage',
  lastUpdatedBy: 'lastUpdatedBy',
  autoAdvance: 'autoAdvance',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FieldRefereeScalarFieldEnum = {
  id: 'id',
  fieldId: 'fieldId',
  userId: 'userId',
  isHeadRef: 'isHeadRef',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ScoreConfigScalarFieldEnum = {
  id: 'id',
  tournamentId: 'tournamentId',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ScoreElementScalarFieldEnum = {
  id: 'id',
  scoreConfigId: 'scoreConfigId',
  name: 'name',
  code: 'code',
  description: 'description',
  pointsPerUnit: 'pointsPerUnit',
  category: 'category',
  elementType: 'elementType',
  displayOrder: 'displayOrder',
  icon: 'icon',
  color: 'color'
};

exports.Prisma.BonusConditionScalarFieldEnum = {
  id: 'id',
  scoreConfigId: 'scoreConfigId',
  name: 'name',
  code: 'code',
  description: 'description',
  bonusPoints: 'bonusPoints',
  condition: 'condition',
  displayOrder: 'displayOrder'
};

exports.Prisma.PenaltyConditionScalarFieldEnum = {
  id: 'id',
  scoreConfigId: 'scoreConfigId',
  name: 'name',
  code: 'code',
  description: 'description',
  penaltyPoints: 'penaltyPoints',
  condition: 'condition',
  displayOrder: 'displayOrder'
};

exports.Prisma.MatchScoreScalarFieldEnum = {
  id: 'id',
  matchId: 'matchId',
  allianceId: 'allianceId',
  scoreElementId: 'scoreElementId',
  units: 'units',
  totalPoints: 'totalPoints',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  ADMIN: 'ADMIN',
  HEAD_REFEREE: 'HEAD_REFEREE',
  ALLIANCE_REFEREE: 'ALLIANCE_REFEREE',
  TEAM_LEADER: 'TEAM_LEADER',
  TEAM_MEMBER: 'TEAM_MEMBER',
  COMMON: 'COMMON'
};

exports.StageType = exports.$Enums.StageType = {
  SWISS: 'SWISS',
  PLAYOFF: 'PLAYOFF',
  FINAL: 'FINAL'
};

exports.StageStatus = exports.$Enums.StageStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED'
};

exports.MatchState = exports.$Enums.MatchState = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ERROR: 'ERROR'
};

exports.AllianceColor = exports.$Enums.AllianceColor = {
  RED: 'RED',
  BLUE: 'BLUE'
};

exports.MatchRoundType = exports.$Enums.MatchRoundType = {
  QUALIFICATION: 'QUALIFICATION',
  SWISS: 'SWISS',
  PLAYOFF: 'PLAYOFF',
  FINAL: 'FINAL'
};

exports.MatchType = exports.$Enums.MatchType = {
  FULL: 'FULL',
  TELEOP_ENDGAME: 'TELEOP_ENDGAME'
};

exports.DisplayState = exports.$Enums.DisplayState = {
  TEAM_LIST: 'TEAM_LIST',
  RANKING: 'RANKING',
  SCHEDULE: 'SCHEDULE',
  LIVE: 'LIVE',
  FINAL_RESULTS: 'FINAL_RESULTS',
  FINISHED: 'FINISHED',
  CUSTOM_MESSAGE: 'CUSTOM_MESSAGE'
};

exports.ElementType = exports.$Enums.ElementType = {
  COUNTER: 'COUNTER',
  BOOLEAN: 'BOOLEAN',
  TIMER: 'TIMER'
};

exports.Prisma.ModelName = {
  User: 'User',
  Tournament: 'Tournament',
  Stage: 'Stage',
  Match: 'Match',
  MatchReferee: 'MatchReferee',
  Alliance: 'Alliance',
  Team: 'Team',
  TeamAlliance: 'TeamAlliance',
  TeamStats: 'TeamStats',
  Field: 'Field',
  FieldDisplay: 'FieldDisplay',
  FieldReferee: 'FieldReferee',
  ScoreConfig: 'ScoreConfig',
  ScoreElement: 'ScoreElement',
  BonusCondition: 'BonusCondition',
  PenaltyCondition: 'PenaltyCondition',
  MatchScore: 'MatchScore'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
