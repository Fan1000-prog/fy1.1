import { auth, db } from "./client";
import {
  GoogleAuthProvider,
  signInAnonymously,
  signInWithRedirect,
  linkWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";

export interface FirebaseUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  providerId: "google.com" | "anonymous";
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

export async function signInGuest(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function linkAnonymousToGoogle(): Promise<void> {
  if (!auth.currentUser) throw new Error("No current user to link");
  if (!auth.currentUser.isAnonymous) throw new Error("Current user is not anonymous");
  await linkWithRedirect(auth.currentUser, googleProvider);
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export async function syncUserDoc(user: User): Promise<FirebaseUser> {
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);

  const providerId: FirebaseUser["providerId"] = user.isAnonymous
    ? "anonymous"
    : "google.com";

  if (!existing.exists()) {
    const payload = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      isAnonymous: user.isAnonymous,
      providerId,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    const written = await getDoc(ref);
    return written.data() as FirebaseUser;
  }

  const updates = {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
    providerId,
    lastLoginAt: serverTimestamp(),
  };
  await setDoc(ref, updates, { merge: true });
  const written = await getDoc(ref);
  return written.data() as FirebaseUser;
}

export async function getUserData(uid: string): Promise<FirebaseUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as FirebaseUser) : null;
}
