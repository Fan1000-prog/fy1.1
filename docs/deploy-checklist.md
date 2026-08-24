# Deploy checklist — fy on Vercel + Firebase

Firebase project: `fy-webapp` (configured in `.firebaserc`).

## 1. Vercel project setup

- [ ] `vercel login`
- [ ] From the repo root: `vercel link` (creates `.vercel/` — gitignored)
- [ ] First deploy: `vercel deploy` (preview) or `vercel deploy --prod`

## 2. Environment variables on Vercel

Copy these from `.env.local` into **Vercel → Project → Settings → Environment Variables**. Set them for **Production**, **Preview**, and **Development** scopes (toggle the three checkboxes when adding each var).

Client SDK (must be `NEXT_PUBLIC_*` so they reach the browser):

- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`

Server-side (used by `/api/*` routes; never prefix with `NEXT_PUBLIC_`):

- [ ] `GEMINI_API_KEY` — Gemini Developer API key (`VERTEX_API_KEY` still works as a fallback)
- [ ] `FIREBASE_SERVICE_ACCOUNT` — **required**. Service-account JSON on one line.
      Without it every `/api/chat` request returns 503, because the server can
      neither verify ID tokens nor meter usage.
- [ ] `QUOTA_ANON_TURNS_PER_DAY` / `QUOTA_ANON_SEARCHES_PER_DAY` (optional, default 10 / 2)
- [ ] `QUOTA_USER_TURNS_PER_DAY` / `QUOTA_USER_SEARCHES_PER_DAY` (optional, default 50 / 10)
- [ ] `YOUTUBE_API_KEY` (optional; without it video title/thumbnail are always null)
- [ ] Any other server keys you've added since (search `process.env.` under `src/`)

After saving env vars, redeploy so the new values bake in: `vercel deploy --prod` or trigger via the dashboard.

## 3. Firebase authorized domains

Without this step, Google sign-in via `signInWithRedirect` will refuse to return to your Vercel URL.

- [ ] Open `console.firebase.google.com` → project `fy-webapp` → **Authentication → Settings → Authorized domains**
- [ ] Add your Vercel production domain: `<your-project>.vercel.app`
- [ ] Add your custom domain if you've attached one
- [ ] For preview URLs, add specific ones as needed (Firebase has no wildcard support)
- [ ] `localhost` is already authorized — leave it

## 4. Firestore rules

- [ ] Already deployed to `fy-webapp` from this checkout. To redeploy after rule edits:
  ```bash
  firebase use fy-webapp
  firebase deploy --only firestore:rules
  ```
- [ ] Confirm in console: **Firestore → Rules** should show the `users/{uid}` self-access
      policy, the `chats/{chatId}/messages/{messageId}` subcollection rule, and
      `usage/{uid}` as read-own / write-never (the server writes it via the Admin SDK).

## 4b. Cost guardrails — do this BEFORE enabling billing

- [ ] `FIREBASE_SERVICE_ACCOUNT` set (above). An unauthenticated `/api/chat`
      with billing on is an open tap.
- [ ] Per-user quotas reviewed against what you can afford — see `docs/cost-model.md`
- [ ] Billing budget alert set well below the tier cap
- [ ] No idle paid resources left in any project:
      `gcloud sql instances list --project=<id>`

## 5. Smoke test on production URL

Run the same matrix you did locally, against the Vercel URL:

- [ ] `/login` → "Continue as guest" — lands on `/chat`, anon doc created in Firestore
- [ ] `/login` → "Continue with Google" — redirects to Google, returns, lands on `/chat`
- [ ] User menu → Log out — returns to `/`; revisiting `/chat` redirects to `/login`
- [ ] Direct `/chat` while signed out — redirects to `/login`
- [ ] Guest → "Link Google account" with a fresh Google account — same UID, doc updated
- [ ] Guest → "Link Google account" with an account already in this project → Cancel — anon session preserved
- [ ] Same as above → Confirm — signs into existing account
- [ ] Language switcher works (fr/mg/en) on `/login`
- [ ] No `permission-denied` errors in browser console
- [ ] Send a chat message — reply streams in token by token
- [ ] `curl -X POST <url>/api/chat -d '{}'` with no auth header → `401`, not a reply

## 6. Common failure modes

| Symptom | Likely cause |
|---|---|
| Google sign-in redirects then drops you on a blank page | Vercel domain not in Firebase authorized domains |
| `Firebase: Error (auth/unauthorized-domain)` in console | Same as above |
| `permission-denied` on Firestore writes | Rules not deployed, or `request.auth` is null (signed out) |
| `Firebase: Error (auth/api-key-not-valid)` | `NEXT_PUBLIC_FIREBASE_API_KEY` missing or wrong scope on Vercel |
| `/api/chat` returns 500 | `GEMINI_API_KEY` not set on Vercel; check function logs |
| `/api/chat` returns 503 `auth_not_configured` | `FIREBASE_SERVICE_ACCOUNT` missing or not valid JSON |
| `/api/chat` returns 401 for signed-in users | Client not sending the ID token, or token from a different Firebase project |
| `/api/chat` returns 429 `quota_exceeded` | Working as intended — daily per-user cap reached |
| Chat answers arrive all at once, not streamed | A proxy is buffering; confirm `X-Accel-Buffering: no` survives |
| Every model call 404s | Model ID retired — run `npm run models:check` |
| Build fails on Vercel but succeeds locally | Env var only set for one scope (Production but not Preview, etc.) |

## 7. Optional follow-ups

- Custom domain via Vercel → Domains, then add to Firebase authorized domains.
- Firebase App Check (anti-abuse): protects Firestore from non-app callers. Easy add later, requires reCAPTCHA v3 site key.
- Vercel Analytics or Firebase Analytics for traffic data.
