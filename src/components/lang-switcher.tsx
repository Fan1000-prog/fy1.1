"use client";

import { useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: "fr", label: "FR", flag: "🇫🇷" },
  { value: "mg", label: "MG", flag: "🇲🇬" },
  { value: "en", label: "EN", flag: "🇬🇧" },
];

export function LangSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={cn("flex items-center gap-0.5 rounded-full border border-border bg-muted p-0.5", className)}>
      {LOCALES.map((l) => (
        <button
          key={l.value}
          onClick={() => setLocale(l.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
            locale === l.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{l.flag}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}
