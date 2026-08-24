import type { NextRequest } from "next/server";
import { adminAuth, isAdminConfigured } from "./firebase-admin";

export interface AuthedUser {
  uid: string;
  isAnonymous: boolean;
}

export type AuthResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; status: number; error: string };

/**
 * Verifies the Firebase ID token on an API request.
 *
 * Fails closed in every branch. `RequireAuth` on the client only hides UI — it
 * does nothing to stop a direct POST, so this is the only thing standing
 * between the open internet and the project's billing account.
 */
export async function requireUser(req: NextRequest): Promise<AuthResult> {
  if (!isAdminConfigured()) {
    // Refusing to serve is correct: without admin credentials we cannot tell
    // users apart, so we could neither authenticate nor meter anyone.
    console.error("[auth] FIREBASE_SERVICE_ACCOUNT missing — refusing request");
    return { ok: false, status: 503, error: "auth_not_configured" };
  }

  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return { ok: false, status: 401, error: "missing_token" };
  }

  try {
    // checkRevoked: a signed-out or disabled account must stop working
    // immediately, not when its hour-long token happens to expire.
    const decoded = await adminAuth().verifyIdToken(token, true);
    return {
      ok: true,
      user: {
        uid: decoded.uid,
        isAnonymous: decoded.firebase?.sign_in_provider === "anonymous",
      },
    };
  } catch {
    return { ok: false, status: 401, error: "invalid_token" };
  }
}
