"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  type AuthError,
  type User,
} from "firebase/auth";
import { auth } from "./client";
import { syncUserDoc, type FirebaseUser } from "./auth";

export interface CollisionPending {
  email: string | null;
  credential: ReturnType<typeof GoogleAuthProvider.credentialFromError>;
}

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  collisionPending: CollisionPending | null;
  clearCollision: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  firebaseUser: null,
  loading: true,
  collisionPending: null,
  clearCollision: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [collisionPending, setCollisionPending] =
    useState<CollisionPending | null>(null);
  const redirectHandled = useRef(false);

  useEffect(() => {
    if (redirectHandled.current) return;
    redirectHandled.current = true;

    getRedirectResult(auth).catch((err: AuthError) => {
      if (err?.code === "auth/credential-already-in-use") {
        const credential = GoogleAuthProvider.credentialFromError(err);
        const email =
          (err.customData?.email as string | undefined) ?? null;
        setCollisionPending({ email, credential });
      } else {
        console.error("getRedirectResult error:", err);
      }
    });

    const unsub = onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (next) {
        try {
          const synced = await syncUserDoc(next);
          setFirebaseUser(synced);
        } catch (err) {
          console.error("syncUserDoc failed:", err);
          setFirebaseUser(null);
        }
      } else {
        setFirebaseUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const clearCollision = useCallback(() => setCollisionPending(null), []);

  const value = useMemo(
    () => ({ user, firebaseUser, loading, collisionPending, clearCollision }),
    [user, firebaseUser, loading, collisionPending, clearCollision]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
