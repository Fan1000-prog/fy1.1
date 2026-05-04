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
