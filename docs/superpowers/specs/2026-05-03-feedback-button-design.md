# Feedback Button — Design

**Date:** 2026-05-03
**Status:** Approved, ready for implementation plan
**Scope:** Add a "Send feedback" floating button to the chat page that opens a popup with a message field. Submissions are written directly from the client to a new top-level Firestore collection guarded by security rules. Authed users only.

---

## 1. Goals

1. Authed users can submit free-form feedback from inside the chat page.
2. Submissions land in Firestore and are reviewable from the Firebase console.
3. Auth identity (uid + email) is attached to every submission for follow-up.
4. Schema and security rules block tampering, oversized payloads, and impersonation.
5. UI fits the existing design system (Base UI dialog, sonner toasts, i18n via `useT()`).

## 2. Non-goals

- Admin UI for triaging feedback in-app (use Firebase console for v1).
- Email notifications on new feedback (deferrable to a Cloud Function later).
- Categories, ratings, screenshots, "include current chat ID" toggle.
- Anonymous submission toggle (decided against — auth A path).
- Mobile composer "Tools" dropdown compression — separate UI task tracked elsewhere.
- Rate limiting beyond auth (deferrable to a Cloud Function trigger if abuse appears).
- Unauthed feedback (e.g., from landing page).

## 3. Architecture

```
src/app/chat/page.tsx
  └── <FeedbackButton />                ← floating, fixed position, bottom-right
        └── on click: opens
              <FeedbackDialog />        ← Base UI dialog
                ├── textarea (message, required, max 2000 chars)
                ├── Cancel + Submit buttons
                └── on submit:
                      submitFeedback({ message })  // src/lib/firebase/feedback.ts
                        └── addDoc(collection(db, "feedback"), { ... })
                      └── toast.success(...)
                      └── close dialog
```

### Files touched

| Path | Change |
|---|---|
| `src/components/feedback-button.tsx` | **New.** Floating pill button, opens dialog. Lucide icon + label. |
| `src/components/feedback-dialog.tsx` | **New.** Base UI dialog matching `auth-collision-dialog.tsx` pattern. |
| `src/lib/firebase/feedback.ts` | **New.** `submitFeedback({ message })` — pulls uid/email from auth context, writes to `feedback/`. |
| `src/app/chat/page.tsx` | Mount `<FeedbackButton />` once at page root. |
| `src/lib/i18n.tsx` | Add `feedback.*` keys for `fr`, `mg`, `en`. |
| `firestore.rules` | Add top-level `feedback` collection rule (create-only for authed users). |

## 4. Firestore data model

Document at `feedback/{auto-id}`:

```ts
{
  uid: string;          // request.auth.uid (enforced by rule)
  email: string;        // pulled from auth context client-side
  message: string;      // 1..2000 chars
  createdAt: Timestamp; // Timestamp.now() set client-side
  userAgent: string;    // navigator.userAgent, capped at 500 chars by writer
  path: string;         // window.location.pathname, e.g., "/chat"
}
```

## 5. Firestore security rules

Add to `firestore.rules` inside `service cloud.firestore { match /databases/{database}/documents { ... } }`:

```
// IMPORTANT: keep `hasOnly([...])` field list in sync with `submitFeedback()` writer.
match /feedback/{id} {
  allow create: if request.auth != null
                && request.resource.data.uid == request.auth.uid
                && request.resource.data.message is string
                && request.resource.data.message.size() > 0
                && request.resource.data.message.size() <= 2000
                && request.resource.data.keys().hasOnly(
                     ['uid','email','message','createdAt','userAgent','path']
                   );
  allow read, update, delete: if false;  // admin-only via console
}
```

**Why these guards:**
- `uid == request.auth.uid` — blocks impersonation.
- Message size guard — blocks giant payloads.
- `hasOnly([...])` — rejects extra fields, prevents schema drift and covert data exfil.
- No client read/update/delete — feedback is write-once from the user's perspective.

## 6. Writer

`src/lib/firebase/feedback.ts`:

```ts
import { db } from "./client";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import type { User } from "firebase/auth";

const MAX_MESSAGE = 2000;
const MAX_UA = 500;

export async function submitFeedback(
  user: User,
  input: { message: string }
): Promise<void> {
  const message = input.message.trim();
  if (!message) throw new Error("Message is required");
  if (message.length > MAX_MESSAGE) throw new Error("Message too long");

  await addDoc(collection(db, "feedback"), {
    uid: user.uid,
    email: user.email ?? "",
    message,
    createdAt: Timestamp.now(),
    userAgent: (typeof navigator !== "undefined" ? navigator.userAgent : "").slice(0, MAX_UA),
    path: typeof window !== "undefined" ? window.location.pathname : "",
  });
}
```

## 7. UI details

### Floating button (`<FeedbackButton />`)

- Position: `fixed bottom-4 right-4` on desktop, `fixed bottom-20 right-4` on `<md` (clears the composer on mobile).
- Visual: small pill button, neutral surface, `MessageCircleQuestion` icon from `lucide-react` + "Feedback" label.
- Label hides on `<sm` screens (icon-only). `aria-label="Send feedback"` always.
- Z-index above chat content, below modals/toasts.
- Hidden while `<FeedbackDialog />` is open.

### Dialog (`<FeedbackDialog />`)

- Reuses existing `<Dialog />` primitive (`src/components/ui/dialog.tsx`).
- Title: `t("feedback.title")` — "Send feedback".
- Helper line above textarea: `t("feedback.helper")` — "Tell us what's working, what's broken, or what you wish Fy did. Don't include passwords or personal data."
- `<textarea>`: required, `maxLength={2000}`, autofocus, 5 rows, character counter `${len}/2000` bottom-right.
- Footer: `Cancel` (ghost) + `Submit` (primary, disabled when empty or submitting, spinner during submit).
- Submit flow:
  1. Disable submit, show spinner.
  2. `await submitFeedback(user, { message })`.
  3. Success: `toast.success(t("feedback.success"))`, close dialog, clear textarea.
  4. Failure: `toast.error(t("feedback.error"))`, keep dialog open, re-enable button. Log error to console for debug.

### i18n keys

Add to `src/lib/i18n.tsx` for all three locales (`fr`, `mg`, `en`):

- `feedback.button` — "Feedback"
- `feedback.title` — "Send feedback"
- `feedback.helper` — "Tell us what's working, what's broken, or what you wish Fy did. Don't include passwords or personal data."
- `feedback.placeholder` — "Your feedback…"
- `feedback.submit` — "Send"
- `feedback.cancel` — "Cancel"
- `feedback.success` — "Thanks — feedback received."
- `feedback.error` — "Couldn't send. Try again."

### Accessibility

- Dialog traps focus (Base UI default).
- Esc closes the dialog (default behavior).
- Click-outside closes the dialog.
- Floating button has `aria-label="Send feedback"`.

## 8. Manual test matrix

| Scenario | Expected |
|---|---|
| Authed user opens dialog, types, submits | Doc lands in `feedback/`, toast shows, dialog closes |
| Submit with empty message | Submit button disabled; can't fire |
| Submit 2001-char message | `maxLength` caps it; if bypassed, rule rejects |
| Unauthed user (route guard blocks `/chat`, but defense-in-depth) | Rule rejects write; toast shows error |
| Tampered client adds extra field `{ secret: "x" }` | `hasOnly([...])` rejects |
| Tampered client uses another user's `uid` | `uid == request.auth.uid` rejects |
| Network drop mid-submit | Toast shows error, dialog stays open with message preserved |
| Mobile viewport | Button at `bottom-20` clears composer; doesn't overlap |
| Esc / click-outside closes dialog | Yes; message lost (not persisted across opens) |

## 9. Rollout

1. Deploy `firestore.rules` first (`firebase deploy --only firestore:rules`) so the collection accepts writes.
2. Deploy app code.
3. Submit a test feedback from the deployer's account.
4. Verify doc in Firebase console.

## 10. Risks

- **Spam from authed accounts:** no v1 mitigation. If it happens, add a Cloud Function trigger that throttles per-uid (max N/hour).
- **PII in messages:** mitigated by helper-line copy asking users not to include passwords or personal data. Triage process should redact if needed.
- **Schema drift:** if v2 adds fields (e.g., category), `firestore.rules` `hasOnly([...])` must be updated in the same PR as the writer change. Comment in rules file flags this.

## 11. Open questions

None blocking. Spec is implementation-ready.
