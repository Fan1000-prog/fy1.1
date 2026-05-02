"use client";

import { Check, ChevronDown } from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LOCALES: { value: Locale; label: string; flag: string; full: string }[] = [
  { value: "fr", label: "FR", flag: "🇫🇷", full: "Français" },
  { value: "mg", label: "MG", flag: "🇲🇬", full: "Malagasy" },
  { value: "en", label: "EN", flag: "🇬🇧", full: "English" },
];

export function LangSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const current = LOCALES.find((l) => l.value === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Language: ${current.full}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <span aria-hidden="true">{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-36">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.value}
            onSelect={() => setLocale(l.value)}
            onClick={() => setLocale(l.value)}
            className="gap-2 cursor-pointer"
          >
            <span aria-hidden="true">{l.flag}</span>
            <span className="flex-1">{l.full}</span>
            {l.value === locale && <Check className="h-3.5 w-3.5 text-brand" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
