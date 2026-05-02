"use client";

import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/firebase/auth-context";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark">
      <I18nProvider>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
