"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FyLogo } from "./fy-logo";

export function SiteNav() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      initial={false}
      animate={{ paddingTop: scrolled ? 6 : 12, paddingBottom: scrolled ? 6 : 12 }}
      transition={reduce ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300",
        scrolled ? "border-border/60 bg-background/85" : "border-transparent bg-background/40",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <FyLogo />
        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#features"
            onClick={(e) => scrollToSection(e, "#features")}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav_features")}
          </a>
          <a
            href="#about"
            onClick={(e) => scrollToSection(e, "#about")}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav_about")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitcher />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="hidden text-sm md:inline-flex">
              {t("nav_login")}
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-medium">
              {t("nav_start")}
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
