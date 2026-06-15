import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookMarked, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { bookLabel, effectiveStatus, useBorrows, useMarkReturned } from "@/lib/store";
import type { BorrowStatus } from "@/lib/types";

export const Route = createFileRoute("/app/borrow/")({
  head: () => ({ meta: [{ title: "Borrow Records — Amanah Library System" }] }),
  component: Borrow,
});

const FILTERS: (BorrowStatus | "All")[] = ["All", "Borrowed", "Reading", "Returned", "Overdue"];

function Borrow() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const libId = user!.libraryId!;
  const { data: borrows = [] } = useBorrows(libId);
  const markReturned = useMarkReturned(libId);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const rows = useMemo(
    () =>
      borrows
        .filter((b) => !b.deleted)
        .filter((b) => (filter === "All" ? true : effectiveStatus(b) === filter))
        .filter((b) => {
          if (!q.trim()) return true;
          const hay = [b.borrowerFullName, b.bookNameArabic, b.bookNameEnglish, b.sharhName || "", String(b.juzNumber ?? ""), b.borrowDate].join(" ").toLowerCase();
          return hay.includes(q.toLowerCase());
        })
        .sort((a, b) => b.borrowDate.localeCompare(a.borrowDate)),
    [borrows, q, filter],
  );

  return (
    <div>
      <PageHeader
        title={t("borrowRecords")}
        action={
          <Button asChild className="bg-gradient-primary">
            <Link to="/app/borrow/add">
              <Plus className="size-4" /> {t("addBorrow")}
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="h-11" />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "All" ? t("all") : t(f as never)}
            </Button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<BookMarked className="size-10" />} title={t("empty")} />
      ) : (
        <div className="space-y-2">
          {rows.map((b) => {
            const st = effectiveStatus(b);
            return (
              <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{b.borrowerFullName}</p>
                    <p className="truncate text-sm text-muted-foreground">{bookLabel(b, lang)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("borrowDate")}: {b.borrowDate} · {t("expectedReturn")}: {b.expectedReturnDate}
                      {b.actualReturnDate ? ` · ${t("actualReturn")}: ${b.actualReturnDate}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={st} />
                </div>
                {st !== "Returned" && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markReturned.mutate(b, { onSuccess: () => toast.success(t("saved")) })}
                    >
                      {t("markReturned")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
