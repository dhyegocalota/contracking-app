import type {
  Contraction,
  ContractionRow,
  Event,
  EventRow,
  TrackingSession,
  TrackingSessionRow,
  User,
  UserRow,
} from '@contracking/shared';

export function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: new Date(row.created_at),
  };
}

export function mapTrackingSessionRow(row: TrackingSessionRow): TrackingSession {
  return {
    id: row.id,
    userId: row.user_id,
    publicId: row.public_id,
    patientName: row.patient_name,
    gestationalWeek: row.gestational_week,
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    timezone: row.timezone,
  };
}

export function mapContractionRow(row: ContractionRow): Contraction {
  return {
    id: row.id,
    userId: row.user_id,
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    intensity: row.intensity,
    position: row.position,
    notes: row.notes,
  };
}

export function mapEventRow(row: EventRow): Event {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    value: row.value,
    occurredAt: new Date(row.occurred_at),
  };
}
