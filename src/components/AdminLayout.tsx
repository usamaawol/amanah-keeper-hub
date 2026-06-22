import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  BookMarked,
  Bookmark,
  CheckCircle2,
  CloudOff,
  Download,
  History,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Menu,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  WifiOff,
} from "lucide-react";
import { Logo } from "./Logo";
import { LangToggle, ThemeToggle } from "./Toggles";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useOnline, usePendingCount } from "@/lib/store";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import {
  getLastSyncedAt,
  runBackgroundSync,
  startRealtimeSync,
  stopRealtimeSync,
  useSyncStatus,
} from "@/lib/sync-client";
import { useQueryClient } from "@tanstack/react-query";
import { canAccessLibrary } from "@/lib/roles";
import { pushSettingsToCloud } from "@/lib/cloud-push";
import { getSettings } from "@/lib/settings";

function VerificationPendingScreen() {
  const { t, lang } = useI18n();
  const { user, resendVerificationEmail, refreshUser, signOut } = useAuth();
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
    } finally {
      setResending(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="size-12" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {lang === "ar" ? "تحقق من بريدك الإلكتروني" : "Verify Your Email"}
          </h1>
          <p className="text-muted-foreground">
            {lang === "ar"
              ? `لقد أرسلنا رسالة تحقق إلى ${user?.email}. اضغط على الرابط في الرسالة لتأكيد حسابك.`
              : `We've sent a verification email to ${user?.email}. Click the link in the email to confirm your account.`}
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={handleResend} disabled={resending} className="w-full">
            {resending ? (
              <>
                <RefreshCw className="mr-2 size-4 animate-spin" />
                {lang === "ar" ? "جارٍ الإرسال..." : "Resending..."}
              </>
            ) : (
              <>
                <Mail className="mr-2 size-4" />
                {lang === "ar" ? "إعادة إرسال رسالة التحقق" : "Resend Verification Email"}
              </>
            )}
          </Button>

          <Button onClick={handleRefresh} variant="outline" disabled={refreshing} className="w-full">
            {refreshing ? (
              <>
                <RefreshCw className="mr-2 size-4 animate-spin" />
                {lang === "ar" ? "جارٍ التحقق..." : "Checking..."}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 size-4" />
                {lang === "ar" ? "لقد قمت بالتحقق؟ تحقق الآن" : "Already verified? Check Now"}
              </>
            )}
          </Button>

          <Button onClick={signOut} variant="ghost" className="w-full">
            {lang === "ar" ? "تسجيل الخروج" : "Sign Out"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { user, loading, profileLoaded, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const online = useOnline();
  const syncStatus = useSyncStatus();
  const pendingCount = usePendingCount();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { canInstall, install } = usePwaInstall();

  // ── Start real-time sync once we have a valid authenticated user ──────────
  useEffect(() => {
    if (!user?.libraryId || !user?.uid) return;
    let cancelled = false;
    void startRealtimeSync(
      user.libraryId,
      user.uid,
      (queryKey) => queryClient.invalidateQueries({ queryKey }),
    ).then(() => {
      if (!cancelled) void runBackgroundSync(user.libraryId!, user.uid, true);
    });
    return () => {
      cancelled = true;
      void stopRealtimeSync();
    };
  // Re-run only when the user identity changes (login / account switch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.libraryId]);

  // ── Sync local settings changes to cloud ──────────────────────────────────
  useEffect(() => {
    if (!user?.uid || !user?.libraryName) return;
    const handler = () => {
      const s = getSettings();
      pushSettingsToCloud(user.uid, {
        libraryName: user.libraryName!,
        language: s.language,
        theme: s.theme,
        displayName: user.displayName,
        updatedAt: s.updatedAt ?? new Date().toISOString(),
      });
    };
    window.addEventListener("amanah-settings-changed", handler);
    return () => window.removeEventListener("amanah-settings-changed", handler);
  }, [user?.uid, user?.libraryName, user?.displayName]);

  // ── Auto-flush + background sync when connectivity returns or tab refocuses ─
  useEffect(() => {
    if (!user?.uid || !user?.libraryId) return;

    const syncNow = () => {
      if (!navigator.onLine) return;
      void runBackgroundSync(user.libraryId!, user.uid, true).then(() => {
        queryClient.invalidateQueries({ queryKey: ["borrows", user.libraryId] });
        queryClient.invalidateQueries({ queryKey: ["reservations", user.libraryId] });
        queryClient.invalidateQueries({ queryKey: ["notifications", user.libraryId] });
      });
    };

    if (online) {
      const timer = setTimeout(syncNow, 1500);
      return () => clearTimeout(timer);
    }
  }, [online, user?.uid, user?.libraryId, queryClient]);

  useEffect(() => {
    if (!user?.libraryId || !user?.uid) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void runBackgroundSync(user.libraryId!, user.uid, true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user?.libraryId, user?.uid]);

  useEffect(() => {
    if (!loading && profileLoaded && (!user || !canAccessLibrary(user.role, user.disabled))) {
      navigate({ to: "/login" });
    }
  }, [loading, profileLoaded, user, navigate]);

  if (loading || !profileLoaded || !user || !canAccessLibrary(user.role, user.disabled)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // Block verification screen when offline — library must work fully offline
  const needsVerification = online && !user.emailVerified;

  if (needsVerification) {
    return <VerificationPendingScreen />;
  }

  const items = [
    { to: "/app/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { to: "/app/borrow", label: t("borrowRecords"), icon: BookMarked },
    { to: "/app/reservations", label: t("reservations"), icon: Bookmark },
    ...(isSuperAdmin
      ? [
          { to: "/app/super", label: t("superAdmin"), icon: ShieldCheck },
          { to: "/app/readers", label: t("readers"), icon: Users },
          { to: "/app/inbox", label: t("supportInbox"), icon: Inbox },
        ]
      : []),
    { to: "/app/ai", label: t("aiAssistant"), icon: Sparkles },
    { to: "/app/notifications", label: t("notifications"), icon: Bell },
    { to: "/app/history", label: t("history"), icon: History },
    { to: "/app/settings", label: t("settings"), icon: Settings },
  ];

  const isActive = (to: string) => path === to || path.startsWith(to + "/");

  // Bottom nav: always show these 4 core items + a "More" button
  const coreNav = [
    { to: "/app/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { to: "/app/borrow",    label: t("borrowRecords"), icon: BookMarked },
    { to: "/app/ai",        label: t("aiAssistant"), icon: Sparkles },
    { to: "/app/history",   label: t("history"), icon: History },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="px-2 py-3">
          <Logo className="[&_span]:text-sidebar-foreground" />
        </div>
        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(it.to)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-gold"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <it.icon className="size-5 shrink-0" />
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-sidebar-accent/50 p-3">
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              {user.photoURL && <AvatarImage src={user.photoURL} />}
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                {(user.displayName || user.email || "AK").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.libraryName}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 md:hidden">
            <Logo />
          </div>
          <div className="ms-auto flex items-center gap-1">
            {/* Sync status indicator */}
            {!online ? (
              <span className="hidden items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground sm:flex">
                <WifiOff className="size-3.5" />
                {t("offline")}
                {pendingCount > 0 && (
                  <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </span>
            ) : syncStatus === "syncing" ? (
              <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary sm:flex">
                <Loader2 className="size-3.5 animate-spin" />
                {t("syncing")}
              </span>
            ) : syncStatus === "synced" ? (
              <button
                type="button"
                onClick={() => user?.libraryId && user?.uid && runBackgroundSync(user.libraryId, user.uid, true)}
                className="hidden items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success sm:flex"
                title={
                  getLastSyncedAt()
                    ? `${t("lastSynced")}: ${new Date(getLastSyncedAt()!).toLocaleString()}`
                    : t("synced")
                }
              >
                <CheckCircle2 className="size-3.5" />
                {t("synced")}
                {pendingCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 py-0 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            ) : (
              <span className="hidden items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground sm:flex">
                <CloudOff className="size-3.5" />
                {t("offline")}
              </span>
            )}
            {canInstall && (
              <Button
                variant="outline"
                size="sm"
                onClick={install}
                className="hidden gap-1.5 sm:flex"
                title="Install app"
              >
                <Download className="size-3.5" />
                Install
              </Button>
            )}
            {canInstall && (
              <Button
                variant="ghost"
                size="icon"
                onClick={install}
                className="flex sm:hidden"
                title="Install app"
                aria-label="Install app"
              >
                <Download className="size-5" />
              </Button>
            )}
            <LangToggle />
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={signOut} aria-label={t("signOut")}>
              <LogOut className="size-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-8">
          <div className="mx-auto w-full max-w-5xl animate-fade-in">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav — 4 core items + More sheet */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border/60 bg-background/95 px-1 py-1.5 backdrop-blur-xl md:hidden">
        {coreNav.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium ${
              isActive(it.to) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <it.icon className="size-5" />
            <span className="truncate">{it.label.split(" ")[0]}</span>
          </Link>
        ))}

        {/* More — opens full menu sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium text-muted-foreground">
              <Menu className="size-5" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl pb-8">
            <SheetHeader className="mb-3">
              <SheetTitle className="text-start text-sm">{user.libraryName}</SheetTitle>
            </SheetHeader>
            <nav className="grid grid-cols-3 gap-2">
              {items.map((it) => (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-[11px] font-medium transition-colors ${
                    isActive(it.to)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <it.icon className="size-5" />
                  <span className="text-center leading-tight">{it.label}</span>
                </Link>
              ))}
              {/* Sign out inside menu */}
              <button
                onClick={() => { setMobileMenuOpen(false); signOut(); }}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-[11px] font-medium text-destructive"
              >
                <LogOut className="size-5" />
                <span>{t("signOut")}</span>
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
