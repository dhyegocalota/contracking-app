import type {
  Contraction,
  EventType,
  Intensity,
  PollResponse,
  Position,
  SessionResponse,
  TrackingSession,
  User,
} from '@contracking/shared';
import { AUTH_TOKEN_STORAGE_KEY } from '@contracking/shared';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8788';

export class AuthenticationError extends Error {}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function assertSuccessful(response: Response): Promise<void> {
  if (response.status === 401) throw new AuthenticationError('Unauthenticated');
  if (!response.ok) throw new Error(await response.text());
}

export async function sendMagicLink({
  email,
  turnstileToken,
}: {
  email: string;
  turnstileToken: string;
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/magic-link`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, turnstileToken }),
  });
  await assertSuccessful(response);
}

export async function verifyOtp({ email, otp }: { email: string; otp: string }): Promise<{ sessionId: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ email, otp }),
  });
  await assertSuccessful(response);
  return response.json();
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  await assertSuccessful(response);
  return response.json();
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...getAuthHeaders() },
  });
  await assertSuccessful(response);
}

type CreateSessionData = { patientName?: string; gestationalWeek?: number; timezone?: string };

export async function createSession(data: CreateSessionData): Promise<TrackingSession> {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  await assertSuccessful(response);
  return response.json();
}

export async function fetchSessions(): Promise<TrackingSession[]> {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  await assertSuccessful(response);
  return response.json();
}

export async function fetchSession(id: string): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  await assertSuccessful(response);
  return response.json();
}

type UpdateSessionData = { patientName?: string; gestationalWeek?: number; endedAt?: string };

export async function updateSession(id: string, data: UpdateSessionData): Promise<TrackingSession> {
  const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  await assertSuccessful(response);
  return response.json();
}

export async function deleteSession(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { ...getAuthHeaders() },
  });
  await assertSuccessful(response);
}

export async function createContraction(sessionId: string): Promise<Contraction> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/contractions`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({}),
  });
  await assertSuccessful(response);
  return response.json();
}

type UpdateContractionData = { endedAt?: string; intensity?: Intensity; position?: Position; notes?: string };

export async function updateContraction(id: string, data: UpdateContractionData): Promise<Contraction> {
  const response = await fetch(`${API_BASE_URL}/contractions/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  await assertSuccessful(response);
  return response.json();
}

export async function deleteContraction(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/contractions/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { ...getAuthHeaders() },
  });
  await assertSuccessful(response);
}

type CreateEventData = { type: EventType; value?: string };

export async function createEvent(sessionId: string, data: CreateEventData): Promise<Event> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/events`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  await assertSuccessful(response);
  return response.json();
}

export async function deleteEvent(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/events/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { ...getAuthHeaders() },
  });
  await assertSuccessful(response);
}

export type SyncSessionData = {
  patientName: string | null;
  gestationalWeek: number | null;
  timezone: string;
  startedAt: string;
  contractions: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    intensity: string | null;
    position: string | null;
    notes: string | null;
  }[];
  events: {
    id: string;
    type: string;
    value: string | null;
    occurredAt: string;
  }[];
  deletedIds: string[];
};

export async function syncSession(data: SyncSessionData): Promise<SessionResponse> {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const response = await fetch(`${API_BASE_URL}/sync`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ ...data, authToken: token }),
  });
  await assertSuccessful(response);
  return response.json();
}

export async function fetchMySession(): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE_URL}/my-session`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  await assertSuccessful(response);
  return response.json();
}

export async function fetchPublicSession(publicId: string): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE_URL}/public/${publicId}`);
  await assertSuccessful(response);
  return response.json();
}

export async function pollPublicSession(publicId: string, after: string): Promise<PollResponse> {
  const response = await fetch(`${API_BASE_URL}/public/${publicId}/poll?after=${after}`);
  await assertSuccessful(response);
  return response.json();
}
