import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  Bookmark,
  CalendarCheck,
  Inbox,
  Settings,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { StatusBadge } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  bookLabel,
  computeReaders,
  effectiveStatus,
  syncSmartNotifications,
  todayISO,
  useBorrows,
  useReservations,
} from "@/lib/store";
import { listAllUsers } from "@/lib/user-profile";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Amanah Library System" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t, lang } = useI18n();
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const libId = user?.libraryId ?? null;
  const { data: borrows = [] } = useBorrows(libId);
  const { data: reservations = [] } = useReservations(libId);
  const [q, setQ] = useState("");
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  useEffect(() => {
    if (libId && borrows.length) syncSmartNotifications(libId, borrows);
  }, [libId, borrows]);

  useEffect(() => {
    if (!isSuperAdmin || authLoading) return;
    listAllUsers()
      .then((list) => setTotalUsers(list.length))
      .catch(() => setTotalUsers(null));
  }, [isSuperAdmin, authLoading]);

  const stats = useMemo(() => {
    const active = borrows.filter((b) => !b.deleted && ["Borrowed", "Reading"].includes(effectiveStatus(b))).length;
    const returned = borrows.filter((b) => !b.deleted && effectiveStatus(b) === "Returned").length;
    const overdue = borrows.filter((b) => !b.deleted && effectiveStatus(b) === "Overdue").length;
    const todayCount = borrows.filter((b) => !b.deleted && (b.borrowDate === todayISO() || b.actualReturnDate === todayISO())).length;
    const readers = computeReaders(borrows.filter((b) => !b.deleted)).length;
    return { active, returned, overdue, todayCount, readers, reservations: reservations.length };
  }, [borrows, reservations]);

  const cards = [
    { label: t("activeBorrowings"), value: stats.active, icon: BookMarked, cls: "text-primary" },
    { label: t("returnedBooks"), value: stats.returned, icon: CalendarCheck, cls: "text-success" },
    { label: t("overdueBooks"), value: stats.overdue, icon: TriangleAlert, cls: "text-destructive" },
    { label: t("reservations"), value: stats.reservations, icon: Bookmark, cls: "text-gold-foreground dark:text-gold" },
    { label: t("todaysActivity"), value: stats.todayCount, icon: Sparkles, cls: "text-primary" },
    { label: t("totalReaders"), value: stats.readers, icon: Users, cls: "text-primary" },
  ];

  const filtered = borrows
    .filter((b) => !b.deleted)
    .filter((b) => {
      if (!q.trim()) return true;
      const hay = [b.borrowerFullName, b.bookNameArabic, b.bookNameEnglish, b.sharhName || "", String(b.juzNumber ?? ""), b.borrowDate].join(" ").toLowerCase();
      return hay.includes(q.toLowerCase());
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  const superLinks = [
    { to: "/app/super", label: t("manageUsers"), icon: ShieldCheck },
    { to: "/app/inbox", label: t("supportInbox"), icon: Inbox },
    { to: "/app/readers", label: t("readers"), icon: Users },
    { to: "/app/settings", label: t("settings"), icon: Settings },
  ] as const;

  return (
    <div>
      {isSuperAdmin && (
        <section className="mb-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                <h2 className="text-lg font-bold">{t("superAdminDashboard")}</h2>
                <Badge className="bg-primary text-primary-foreground">{t("superAdmin")}</Badge>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">{t("superAdminWelcome")}</p>
              {totalUsers !== null && (
                <p className="text-sm font-medium">
                  {t("systemOverview")}: {totalUsers} {lang === "ar" ? "مستخدم" : "registered users"}
                </p>
              )}
            </div>
            <Button asChild className="bg-gradient-primary shrink-0">
              <Link to="/app/super">
                <ShieldCheck className="size-4" /> {t("superAdmin")}
              </Link>
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {superLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex flex-col items-center gap-2 rounded-xl border border-border/80 bg-background/60 p-3 text-center text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5"
              >
                <link.icon className="size-5 text-primary" />
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <PageHeader
        title={`${isSuperAdmin ? t("superAdminDashboard") : t("dashboard")} · ${user?.libraryName ?? ""}`}
        action={
          <Button asChild className="bg-gradient-primary">
            <Link to="/app/ai">
              <Sparkles className="size-4" /> {t("askAi")}
            </Link>
          </Button>
        }
      />

      <div className="mb-6">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("quickSearch")} className="h-11" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c, i) => (
          <div key={c.label} className="animate-fade-up rounded-2xl border border-border bg-card p-4" style={{ animationDelay: `${i * 50}ms` }}>
            <c.icon className={`size-5 ${c.cls}`} />
            <p className="mt-3 text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">{t("recentActivity")}</h2>
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        {filtered.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
            <div className="min-w-0">
              <p className="truncate font-medium">{b.borrowerFullName}</p>
              <p className="truncate text-sm text-muted-foreground">{bookLabel(b, lang)}</p>
            </div>
            <StatusBadge status={effectiveStatus(b)} />
          </div>
        ))}
      </div>
    </div>
  );
}
