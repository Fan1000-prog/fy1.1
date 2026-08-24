import { adminDb } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Per-user daily quotas.
 *
 * These exist to bound spend, not to be stingy. Every chat turn costs real
 * money and /api/chat is reachable from the open internet, so an unmetered
 * endpoint is an unbounded bill. Tune via env once real usage is known.
 */
export interface Quota {
  turnsPerDay: number;
  searchesPerDay: number;
}

function num(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Anonymous users get a smaller allowance: the account is free to recreate, so
 * its quota is the cheapest thing on the menu to bypass.
 */
export function quotaFor(isAnonymous: boolean): Quota {
  return isAnonymous
    ? {
        turnsPerDay: num("QUOTA_ANON_TURNS_PER_DAY", 10),
        searchesPerDay: num("QUOTA_ANON_SEARCHES_PER_DAY", 2),
      }
    : {
        turnsPerDay: num("QUOTA_USER_TURNS_PER_DAY", 50),
        searchesPerDay: num("QUOTA_USER_SEARCHES_PER_DAY", 10),
      };
}

/** UTC day key, so the reset boundary can't be shifted by changing timezone. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface UsageSnapshot {
  turns: number;
  searches: number;
}

/**
 * Atomically claims one turn against the user's daily allowance.
 *
 * Returns null when the allowance is spent. The increment and the check happen
 * in one transaction so parallel requests cannot both slip past the limit.
 */
export async function claimTurn(
  uid: string,
  quota: Quota
): Promise<UsageSnapshot | null> {
  const ref = adminDb().collection("usage").doc(uid);
  const day = today();

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const fresh = !data || data.day !== day;

    const turns = fresh ? 0 : (data.turns ?? 0);
    const searches = fresh ? 0 : (data.searches ?? 0);

    if (turns >= quota.turnsPerDay) return null;

    tx.set(
      ref,
      { day, turns: turns + 1, searches, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return { turns: turns + 1, searches };
  });
}

/**
 * Claims one grounded search. Search is metered separately because it is the
 * single most expensive action Fy can take — roughly 3x the cost of the text
 * turn that wraps it, once the monthly free allotment is gone.
 */
export async function claimSearch(uid: string, quota: Quota): Promise<boolean> {
  const ref = adminDb().collection("usage").doc(uid);
  const day = today();

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const fresh = !data || data.day !== day;
    const searches = fresh ? 0 : (data.searches ?? 0);

    if (searches >= quota.searchesPerDay) return false;

    tx.set(
      ref,
      {
        day,
        turns: fresh ? 0 : (data.turns ?? 0),
        searches: searches + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  });
}
