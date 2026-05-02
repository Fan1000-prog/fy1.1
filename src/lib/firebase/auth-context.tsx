"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
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
  reportCollision: (err: AuthError) => boolean;
  clearCollision: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  firebaseUser: null,
  loading: true,
  collisionPending: null,
  reportCollision: () => false,
  clearCollision: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [collisionPending, setCollisionPending] =
    useState<CollisionPending | null>(null);

  useEffect(() => {
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

  const reportCollision = useCallback((err: AuthError) => {
    if (err?.code === "auth/credential-already-in-use") {
      const credential = GoogleAuthProvider.credentialFromError(err);
      const email = (err.customData?.email as string | undefined) ?? null;
      setCollisionPending({ email, credential });
      return true;
    }
    return false;
  }, []);

  const clearCollision = useCallback(() => setCollisionPending(null), []);

  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      loading,
      collisionPending,
      reportCollision,
      clearCollision,
    }),
    [user, firebaseUser, loading, collisionPending, reportCollision, clearCollision],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
