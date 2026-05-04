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
