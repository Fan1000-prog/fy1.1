"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/firebase/auth-context";
import { LangSwitcher } from "@/components/lang-switcher";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { signInGuest, signInWithGoogle } from "@/lib/firebase/auth";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [busy, setBusy] = useState<"google" | "guest" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/chat");
    }
  }, [authLoading, user, router]);

  async function handleGoogle() {
    setBusy("google");
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      setError(t("auth_error_generic"));
      setBusy(null);
    }
  }

  async function handleGuest() {
    setBusy("guest");
    setError(null);
    try {
      await signInGuest();
      router.push("/chat");
    } catch (err) {
      console.error(err);
      setError(t("auth_error_generic"));
      setBusy(null);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-full items-center justify-center fy-hero-gradient">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center fy-hero-gradient px-4">
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Retour</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangSwitcher />
        </div>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-brand-foreground shadow-lg">
            fy
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{t("login_title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("login_subtitle")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleGoogle}
              disabled={busy !== null}
              className={cn(
                "w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90",
                busy === "google" && "opacity-70"
              )}
            >
              {busy === "google" ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-foreground border-t-transparent" />
                  {t("login_google")}
                </span>
              ) : (
                t("login_google")
              )}
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>{t("login_or")}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGuest}
              disabled={busy !== null}
              className={cn(
                "w-full rounded-xl",
                busy === "guest" && "opacity-70"
              )}
            >
              {busy === "guest" ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                  {t("login_guest")}
                </span>
              ) : (
                t("login_guest")
              )}
            </Button>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
