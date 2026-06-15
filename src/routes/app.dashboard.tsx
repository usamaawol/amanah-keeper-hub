import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookMarked, Bookmark, CalendarCheck, Sparkles, TriangleAlert, Users } from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { StatusBadge } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Amanah Library System" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const libId = user?.libraryId ?? null;
  const { data: borrows = [] } = useBorrows(libId);
  const { data: reservations = [] } = useReservations(libId);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (libId && borrows.length) syncSmartNotifications(libId, borrows);
  }, [libId, borrows]);

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

  return (
    <div>
      <PageHeader
        title={`${t("dashboard")} · ${user?.libraryName ?? ""}`}
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
