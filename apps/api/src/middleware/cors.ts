import type { Environment } from '../types';

const CORS_ALLOW_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
const CORS_ALLOW_HEADERS = 'Content-Type, Authorization';

function buildCorsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': CORS_ALLOW_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleCorsPreflight({ request, env }: { request: Request; env: Environment }): Response | null {
  if (request.method !== 'OPTIONS') return null;

  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(env.DASHBOARD_URL),
  });
}

export function withCors({ response, origin }: { response: Response; origin: string }): Response {
  const cloned = new Response(response.body, response);
  const corsHeaders = buildCorsHeaders(origin);

  for (const [key, value] of Object.entries(corsHeaders)) {
    cloned.headers.set(key, value);
  }

  return cloned;
}
