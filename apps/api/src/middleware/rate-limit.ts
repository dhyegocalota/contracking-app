import { MAGIC_LINK_MAX_SENDS_PER_WINDOW, MAGIC_LINK_WINDOW_MINUTES } from '@contracking/shared';
import { COUNT_MAGIC_LINKS_IN_WINDOW } from '../db/queries';

const MINUTES_TO_MILLISECONDS = 60 * 1000;

export async function isMagicLinkRateLimited({
  userId,
  database,
}: {
  userId: string;
  database: D1Database;
}): Promise<boolean> {
  const windowStart = new Date(Date.now() - MAGIC_LINK_WINDOW_MINUTES * MINUTES_TO_MILLISECONDS).toISOString();
  const result = await database
    .prepare(COUNT_MAGIC_LINKS_IN_WINDOW)
    .bind(userId, windowStart)
    .first<{ count: number }>();
  return (result?.count ?? 0) >= MAGIC_LINK_MAX_SENDS_PER_WINDOW;
}
