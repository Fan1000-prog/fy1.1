import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const APP_NAME = "fy-server";

/**
 * Server-side Firebase, used to verify ID tokens and meter usage.
 *
 * Credentials come from FIREBASE_SERVICE_ACCOUNT — the service-account JSON as
 * a single-line string. Without it the API cannot authenticate anyone, which is
 * deliberate: an unauthenticated /api/chat is a public endpoint that spends the
 * project's money, so failing closed is the only safe default.
 */
function initAdmin(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");

  let parsed: { project_id: string; client_email: string; private_key: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  }

  return initializeApp(
    {
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        // Env vars flatten newlines; the PEM parser needs them back.
        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
      }),
    },
    APP_NAME
  );
}

export function adminAuth() {
  return getAuth(initAdmin());
}

export function adminDb() {
  return getFirestore(initAdmin());
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

let cachedApp: App | undefined;
export function warmAdmin() {
  cachedApp ??= initAdmin();
  return cachedApp;
}
