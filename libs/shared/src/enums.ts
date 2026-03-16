export enum Intensity {
  MILD = 'mild',
  MODERATE = 'moderate',
  STRONG = 'strong',
}

export enum Position {
  LYING = 'lying',
  SITTING = 'sitting',
  STANDING = 'standing',
  WALKING = 'walking',
  SQUATTING = 'squatting',
  BALL = 'ball',
}

export enum EventType {
  WATER_BREAK = 'water_break',
  MEAL = 'meal',
  DILATION = 'dilation',
  NOTE = 'note',
}

export enum DateRange {
  TODAY = 'today',
  THREE_DAYS = '3d',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  CUSTOM = 'custom',
}

export enum SyncStatus {
  NOT_AUTHENTICATED = 'not_authenticated',
  OFFLINE = 'offline',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  UNSYNCED = 'unsynced',
}
