/** Staff must heartbeat within this window to stay "Online" in Admin / public lists. */
export const ONLINE_TTL_MS = 2 * 60 * 1000;

/**
 * True only when the account is flagged online AND lastSeen is recent.
 * Prevents sticky "Online" after logout / closed tab / crashed browser.
 */
export function isEffectivelyOnline(
  isOnline: boolean | null | undefined,
  lastSeen: Date | string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!isOnline) return false;
  if (!lastSeen) return false;
  const seenMs = lastSeen instanceof Date ? lastSeen.getTime() : new Date(lastSeen).getTime();
  if (!Number.isFinite(seenMs)) return false;
  return nowMs - seenMs < ONLINE_TTL_MS;
}
