"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    localStorage.setItem("fy-user", name.trim());
    router.push("/chat");
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center fy-hero-gradient px-4">
      {/* Top bar */}
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
          <ThemeToggle />
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-brand-foreground shadow-lg">
            fy
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{t("login_title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("login_subtitle")}</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm">
                {t("login_name")}
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("login_name_placeholder")}
                required
                autoFocus
                className="rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={!name.trim() || loading}
              className={cn(
                "w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90",
                loading && "opacity-70"
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-foreground border-t-transparent" />
                  {t("login_btn")}
                </span>
              ) : (
                t("login_btn")
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
