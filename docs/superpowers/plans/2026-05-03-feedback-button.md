# Feedback Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating "Send feedback" button on `/chat` that opens a dialog where authed users can submit a free-form message. Submissions go directly from the client to a new top-level Firestore `feedback` collection, guarded by security rules.

**Architecture:** New `<FeedbackButton />` mounts at the root of `src/app/chat/page.tsx` (fixed-position, bottom-right). It controls a new `<FeedbackDialog />` that wraps the existing Base UI `<Dialog />` primitive. On submit, it calls `submitFeedback(user, { message })` from `src/lib/firebase/feedback.ts`, which writes a doc to `feedback/{auto-id}` via the Firebase client SDK. Security rules enforce ownership, size limits, and a closed field set.

**Tech Stack:** Next.js (custom build per `AGENTS.md`), TypeScript, Firebase Auth + Firestore (client SDK), Base UI dialog, sonner for toasts, Lucide icons. i18n via existing `useI18n()` hook with flat key names.

**Spec deviations / corrections to spec:** Spec §3, §6, §7 used dotted i18n keys (`feedback.title`) and a `useT()` hook name. The codebase actually uses flat keys (`feedback_title`) and `useI18n()`. This plan uses the codebase conventions throughout.

**Verification:** No automated tests in repo. Each task ends with a manual smoke step or rules-emulator check.

---

## File Structure

| Path | Role | Status |
|---|---|---|
| `firestore.rules` | Allow `create` to `feedback/{id}` for authed users with strict shape; deny read/update/delete. | Modify |
| `src/lib/firebase/feedback.ts` | `submitFeedback(user, { message })` — writes doc to `feedback/`. | Create |
| `src/components/feedback-dialog.tsx` | Controlled Base UI dialog with textarea, submit/cancel, char counter, toasts. | Create |
| `src/components/feedback-button.tsx` | Floating pill button that mounts `<FeedbackDialog />` and controls its open state. | Create |
| `src/lib/i18n.tsx` | Add `feedback_*` flat keys to all three locales (`fr`, `mg`, `en`). | Modify |
| `src/app/chat/page.tsx` | Render `<FeedbackButton />` once at page root. | Modify |

---

## Task 1: Update Firestore rules

**Files:**
- Modify: `firestore.rules`

**Why:** The collection has to accept writes before any client code runs. Deploying rules first avoids a window where the client gets `permission-denied`.

- [ ] **Step 1: Add the `feedback` rule**

Replace the contents of `firestore.rules` with:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /chats/{chatId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }

    // IMPORTANT: keep `hasOnly([...])` field list in sync with submitFeedback() in
    // src/lib/firebase/feedback.ts. If you add a field there, add it here.
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
  }
}
```

- [ ] **Step 2: Deploy rules to the live Firebase project**

Run: `firebase deploy --only firestore:rules`
Expected: deploy succeeds. (Project must be selected in `.firebaserc`. If not, run `firebase use <projectId>` first.)

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(firestore): allow authed feedback writes with strict schema"
```

---

## Task 2: Create the writer

**Files:**
- Create: `src/lib/firebase/feedback.ts`

**Why:** Single place that defines the doc shape. The rules' `hasOnly([...])` list mirrors this writer — keep them in sync.

- [ ] **Step 1: Write the file**

Create `src/lib/firebase/feedback.ts`:

```ts
import { db } from "./client";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import type { User } from "firebase/auth";

const MAX_MESSAGE = 2000;
const MAX_UA = 500;

// IMPORTANT: keep this shape in sync with `firestore.rules` `match /feedback/{id}`.
// Adding a field here requires updating the rules' `hasOnly([...])` list.
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
    userAgent:
      typeof navigator !== "undefined"
        ? navigator.userAgent.slice(0, MAX_UA)
        : "",
    path: typeof window !== "undefined" ? window.location.pathname : "",
  });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebase/feedback.ts
git commit -m "feat(firebase): add submitFeedback writer"
```

---

## Task 3: Add i18n keys

**Files:**
- Modify: `src/lib/i18n.tsx`

**Why:** All user-facing copy must go through `useI18n()` per existing convention. Plan uses flat keys — match the existing `chat_*` / `auth_*` style.

- [ ] **Step 1: Add `feedback_*` keys to all three locales**

In `src/lib/i18n.tsx`, append the following entries to the `fr`, `mg`, and `en` translation objects (just before the closing `},` of each locale, alongside other `chat_*` keys):

For `fr`:
```ts
    feedback_button: "Feedback",
    feedback_title: "Envoyer un retour",
    feedback_helper: "Dis-nous ce qui marche, ce qui ne va pas, ou ce que tu aimerais que Fy fasse. N'inclus pas de mots de passe ou de données personnelles.",
    feedback_placeholder: "Ton retour…",
    feedback_submit: "Envoyer",
    feedback_cancel: "Annuler",
    feedback_success: "Merci — retour bien reçu.",
    feedback_error: "Échec de l'envoi. Réessayez.",
```

For `mg`:
```ts
    feedback_button: "Hevitra",
    feedback_title: "Mandefa hevitra",
    feedback_helper: "Lazao izay mandeha tsara, izay tsy mety, na izay tianao hataon'i Fy. Aza ampidirina ny teny miafina na ny vaovao manokana.",
    feedback_placeholder: "Ny hevitrao…",
    feedback_submit: "Alefa",
    feedback_cancel: "Aoka",
    feedback_success: "Misaotra — voaray ny hevitra.",
    feedback_error: "Tsy nahomby ny fandefasana. Andramo indray.",
```

For `en`:
```ts
    feedback_button: "Feedback",
    feedback_title: "Send feedback",
    feedback_helper: "Tell us what's working, what's broken, or what you wish Fy did. Don't include passwords or personal data.",
    feedback_placeholder: "Your feedback…",
    feedback_submit: "Send",
    feedback_cancel: "Cancel",
    feedback_success: "Thanks — feedback received.",
    feedback_error: "Couldn't send. Try again.",
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS — `TranslationKey` (derived from `keyof typeof translations.fr`) now includes the new keys; type check passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n.tsx
git commit -m "feat(i18n): add feedback_* keys for fr/mg/en"
```

---

## Task 4: Create `<FeedbackDialog />`

**Files:**
- Create: `src/components/feedback-dialog.tsx`

**Why:** Controlled dialog with the form. Kept separate from the trigger so the button stays small and the dialog can be tested in isolation.

- [ ] **Step 1: Write the file**

Create `src/components/feedback-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/firebase/auth-context";
import { submitFeedback } from "@/lib/firebase/feedback";

const MAX_MESSAGE = 2000;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmed = message.trim();
  const canSubmit = !!user && trimmed.length > 0 && !submitting;

  async function handleSubmit() {
    if (!user || !canSubmit) return;
    setSubmitting(true);
    try {
      await submitFeedback(user, { message: trimmed });
      toast.success(t("feedback_success"));
      setMessage("");
      onOpenChange(false);
    } catch (err) {
      console.error("[feedback] submit failed:", err);
      toast.error(t("feedback_error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && submitting) return; // don't close mid-submit
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("feedback_title")}</DialogTitle>
          <DialogDescription>{t("feedback_helper")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <textarea
            autoFocus
            rows={5}
            maxLength={MAX_MESSAGE}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("feedback_placeholder")}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="self-end text-xs text-muted-foreground tabular-nums">
            {message.length}/{MAX_MESSAGE}
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" disabled={submitting} />}>
            {t("feedback_cancel")}
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? "…" : t("feedback_submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/feedback-dialog.tsx
git commit -m "feat(feedback): add FeedbackDialog component"
```

---

## Task 5: Create `<FeedbackButton />`

**Files:**
- Create: `src/components/feedback-button.tsx`

**Why:** The trigger. Floating, fixed position, hides while the dialog is open so it doesn't sit behind the modal.

- [ ] **Step 1: Write the file**

Create `src/components/feedback-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/firebase/auth-context";
import { FeedbackDialog } from "./feedback-dialog";
import { cn } from "@/lib/utils";

export function FeedbackButton() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-label={t("feedback_title")}
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 z-40 gap-2 rounded-full shadow-md md:bottom-4 max-md:bottom-20",
          open && "pointer-events-none opacity-0"
        )}
      >
        <MessageCircleQuestion className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t("feedback_button")}</span>
      </Button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/feedback-button.tsx
git commit -m "feat(feedback): add floating FeedbackButton"
```

---

## Task 6: Mount `<FeedbackButton />` on the chat page

**Files:**
- Modify: `src/app/chat/page.tsx`

**Why:** The button needs to render inside the chat page so it sits over the chat UI. The component handles auth gating internally (returns `null` if no user).

- [ ] **Step 1: Add the import**

In `src/app/chat/page.tsx`, add to the existing imports near `AuthCollisionDialog`:

```ts
import { FeedbackButton } from "@/components/feedback-button";
```

- [ ] **Step 2: Render the button at page root**

Find where `<AuthCollisionDialog />` is rendered (search the file for that JSX). Render `<FeedbackButton />` as a sibling, immediately after it. Both are fixed-position overlays with no layout impact.

Example of the change (pattern, not exact diff — adapt to whatever surrounding JSX exists):

```tsx
        <AuthCollisionDialog />
        <FeedbackButton />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Manual smoke — happy path**

Run: `npm run dev`. Sign in. Visit `/chat`.

Expected:
- Pill button visible bottom-right with icon + "Feedback" label on `≥sm`, icon-only on `<sm`.
- On mobile width: button sits at `bottom-20` and does not overlap the composer.
- Click → dialog opens, textarea autofocuses.
- Type a short message ("Test from manual smoke"). Click Send.
- Toast: "Thanks — feedback received." Dialog closes. Textarea clears for next open.
- Open Firebase console → Firestore → `feedback/` collection. New doc visible with `uid`, `email`, `message`, `createdAt`, `userAgent`, `path = "/chat"`.

- [ ] **Step 5: Manual smoke — empty / oversize / network failure**

Empty: open dialog, leave textarea empty → Send button is disabled.

Oversize: paste 2500 chars → textarea caps at 2000 (browser-enforced). Counter shows `2000/2000`.

Network failure: in DevTools, switch network to Offline. Click Send.
Expected: error toast "Couldn't send. Try again.", dialog stays open with message preserved. Restore network.

- [ ] **Step 6: Manual smoke — tampering attempts (rules verification)**

In DevTools console while signed in:

```js
// Wrong uid
const { collection, addDoc, Timestamp, getFirestore } = await import("firebase/firestore");
const db = getFirestore();
await addDoc(collection(db, "feedback"), {
  uid: "not-my-uid",
  email: "x@y.z",
  message: "spoof attempt",
  createdAt: Timestamp.now(),
  userAgent: "test",
  path: "/chat",
});
```
Expected: `FirebaseError: Missing or insufficient permissions.`

```js
// Extra field
await addDoc(collection(db, "feedback"), {
  uid: (await import("firebase/auth")).getAuth().currentUser.uid,
  email: "x@y.z",
  message: "extra field attempt",
  createdAt: Timestamp.now(),
  userAgent: "test",
  path: "/chat",
  secret: "x",
});
```
Expected: `FirebaseError: Missing or insufficient permissions.`

- [ ] **Step 7: Commit**

```bash
git add src/app/chat/page.tsx
git commit -m "feat(chat): mount FeedbackButton on /chat"
```

---

## Task 7: Final smoke + spec sign-off

**Files:**
- (no code changes)

- [ ] **Step 1: Run the full manual matrix from spec §8**

Cover every row:
1. Authed user types → submits → toast + doc lands in `feedback/`.
2. Empty message → Send disabled.
3. 2001-char message → capped at 2000 by `maxLength`.
4. Tampered uid → rule rejects (Step 6 above).
5. Extra field → rule rejects (Step 6 above).
6. Network drop mid-submit → error toast, dialog stays open, message preserved.
7. Mobile viewport → button at `bottom-20`, no composer overlap.
8. Esc / click-outside closes dialog → confirm message is **not** persisted across opens (intentional per spec §8).

- [ ] **Step 2: Done — no commit**

If any step fails, file findings against the spec at `docs/superpowers/specs/2026-05-03-feedback-button-design.md` §10 (risks) before shipping.

---

## Out of scope (do NOT implement here)

- Admin UI for triaging feedback (use Firebase console).
- Email notifications on new feedback (deferrable to a Cloud Function later).
- Categories / ratings / screenshots / "include current chat ID" toggle.
- Anonymous submission toggle.
- Mobile composer "Tools" dropdown compression — separate UI task tracked elsewhere.
- Rate limiting beyond auth.
- Feedback access from landing/login pages.
