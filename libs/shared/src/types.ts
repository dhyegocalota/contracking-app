import type { EventType, Intensity, Position, PushNotificationType, PushSubscriptionType } from './enums';

export type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
};

export type TrackingSession = {
  id: string;
  userId: string;
  publicId: string;
  patientName: string | null;
  gestationalWeek: number | null;
  startedAt: Date;
  endedAt: Date | null;
  timezone: string | null;
};

export type Contraction = {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  intensity: Intensity | null;
  position: Position | null;
  notes: string | null;
};

export type Event = {
  id: string;
  userId: string;
  type: EventType;
  value: string | null;
  occurredAt: Date;
};

export type SessionStats = {
  totalContractions: number;
  averageDuration: number;
  averageInterval: number;
  regularity: 'regular' | 'irregular' | null;
  alertFiveOneOne: boolean;
  lastDilation: string | null;
};

export type SessionResponse = {
  session: TrackingSession;
  contractions: Contraction[];
  events: Event[];
  stats: SessionStats;
};

export type PollResponse = {
  contractions: Contraction[];
  events: Event[];
  stats: SessionStats;
};

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
};

export type TrackingSessionRow = {
  id: string;
  user_id: string;
  public_id: string;
  patient_name: string | null;
  gestational_week: number | null;
  started_at: string;
  ended_at: string | null;
  timezone: string | null;
};

export type ContractionRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  intensity: Intensity | null;
  position: Position | null;
  notes: string | null;
};

export type EventRow = {
  id: string;
  user_id: string;
  type: EventType;
  value: string | null;
  occurred_at: string;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  type: PushNotificationType;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string | null;
  public_id: string | null;
  endpoint: string;
  key_p256dh: string;
  key_auth: string;
  type: PushSubscriptionType;
  created_at: string;
  last_used_at: string | null;
};

export type PushNotificationLogRow = {
  id: string;
  contraction_id: string;
  notification_type: PushNotificationType;
  sent_at: string;
};
