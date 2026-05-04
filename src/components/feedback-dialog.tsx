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
        if (!o && submitting) return;
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
