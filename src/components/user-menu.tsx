"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, LogOut, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/firebase/auth-context";
import { useI18n } from "@/lib/i18n";
import { linkAnonymousToGoogle, logOut } from "@/lib/firebase/auth";

function initials(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || fallback;
}

export function UserMenu() {
  const { user, firebaseUser, reportCollision } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const isAnon = user.isAnonymous;
  const displayName = isAnon
    ? t("menu_guest_label")
    : firebaseUser?.displayName ?? user.displayName ?? t("menu_guest_label");
  const photo = isAnon ? null : firebaseUser?.photoURL ?? user.photoURL ?? null;

  async function handleUpgrade() {
    setBusy(true);
    try {
      await linkAnonymousToGoogle();
      setBusy(false);
    } catch (err) {
      const handled = reportCollision(err as Parameters<typeof reportCollision>[0]);
      if (!handled) {
        console.error(err);
        toast.error(t("auth_error_generic"));
      }
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await logOut();
      setBusy(false);
    } catch (err) {
      console.error(err);
      toast.error(t("auth_error_generic"));
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60"
        disabled={busy}
      >
        <Avatar className="h-7 w-7">
          {photo && <AvatarImage src={photo} alt={displayName} />}
          <AvatarFallback className="text-xs">
            {initials(isAnon ? null : displayName, "G")}
          </AvatarFallback>
        </Avatar>
        <span className="flex-1 truncate text-sm font-medium">{displayName}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        {!isAnon && firebaseUser?.email && (
          <>
            <div className="flex flex-col px-2 py-1.5">
              <span className="text-sm font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {firebaseUser.email}
              </span>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {isAnon && (
          <>
            <DropdownMenuItem onSelect={handleUpgrade} disabled={busy}>
              <Sparkles className="mr-2 h-4 w-4" />
              {t("menu_upgrade")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={handleLogout} disabled={busy}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("menu_logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
