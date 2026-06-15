import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Download } from "lucide-react";
import { Logo } from "./Logo";
import { LangToggle, ThemeToggle } from "./Toggles";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { canInstall, install } = usePwaInstall();

  const nav = [
    { to: "/", label: t("home") },
    { to: "/about", label: t("about") },
    { to: "/contact", label: t("contact") },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary ${
                  path === n.to ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            {canInstall && (
              <Button variant="outline" size="sm" onClick={install} className="gap-1.5">
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Install App</span>
              </Button>
            )}
            <LangToggle />
            <ThemeToggle />
            <Button asChild size="sm" className="ms-1">
              <Link to={user?.role === "admin" ? "/app/dashboard" : "/login"}>
                {user?.role === "admin" ? t("dashboard") : t("signIn")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 text-center md:flex-row md:justify-between md:text-start">
          <Logo />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Amanah Library System · {t("appTagline")}
          </p>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="hover:text-primary">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
