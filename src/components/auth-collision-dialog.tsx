"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/firebase/auth-context";
import { useI18n } from "@/lib/i18n";
import { logOut, signInWithGoogle } from "@/lib/firebase/auth";

export function AuthCollisionDialog() {
  const { collisionPending, clearCollision } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const open = collisionPending !== null;

  async function handleConfirm() {
    setBusy(true);
    try {
      await logOut();
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      toast.error(t("auth_error_generic"));
      setBusy(false);
      clearCollision();
    }
  }

  function handleCancel() {
    clearCollision();
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("auth_collision_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("auth_collision_body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={handleCancel}>
            {t("auth_collision_cancel")}
          </AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={handleConfirm}>
            {t("auth_collision_confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
