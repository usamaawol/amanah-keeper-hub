import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookMarked, Pencil, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { bookLabel, effectiveStatus, useBorrows, useMarkReturned, useUndoReturn } from "@/lib/store";
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
  const undoReturn = useUndoReturn(libId);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const rows = useMemo(
    () =>
      borrows
        .filter((b) => !b.deleted)
        .filter((b) => (filter === "All" ? true : effectiveStatus(b) === filter))
        .filter((b) => {
          if (!q.trim()) return true;
          const hay = [
            b.borrowerFullName,
            b.phoneNumber || "",
            b.email || "",
            b.bookNameArabic,
            b.bookNameEnglish,
            b.author || "",
            b.sharhName || "",
            String(b.juzNumber ?? ""),
            b.borrowDate,
            b.notes || "",
            b.remarks || "",
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q.toLowerCase());
        })
        .sort((a, b) => b.borrowDate.localeCompare(a.borrowDate)),
    [borrows, q, filter],
  );

  return (
    <div>
      {/* Print Header */}
      <div className="print-only mb-8">
        <div className="flex justify-between items-end border-b-2 border-primary pb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">{user?.libraryName}</h1>
            <p className="text-sm text-muted-foreground">{t("borrowReport")}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{t("generatedOn")}: {new Date().toLocaleDateString()}</p>
            <p>{t("totalBooks")}: {rows.length}</p>
          </div>
        </div>
      </div>

      <div className="no-print">
        <PageHeader
          title={t("borrowRecords")}
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="hidden sm:flex gap-2"
              >
                <Printer className="size-4" />
                {t("print")}
              </Button>
              <Button asChild className="bg-gradient-primary">
                <Link to="/app/borrow/add">
                  <Plus className="size-4" /> {t("addBorrow")}
                </Link>
              </Button>
            </div>
          }
        />
      </div>
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
                    <p className="font-semibold">
                      {b.borrowerFullName}
                      {b.phoneNumber && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ({b.phoneNumber})
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {bookLabel(b, lang)}
                      {b.author && ` — ${b.author}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("borrowDate")}: {b.borrowDate} · {t("expectedReturn")}: {b.expectedReturnDate}
                      {b.actualReturnDate ? ` · ${t("actualReturn")}: ${b.actualReturnDate}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={st} />
                </div>
                {st !== "Returned" && (
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link to="/app/borrow/edit" search={{ id: b.id }}>
                        <Pencil className="size-3.5" />
                        {t("edit")}
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm(t("confirmReturn"))) {
                          markReturned.mutate(b, { onSuccess: () => toast.success(t("saved")) });
                        }
                      }}
                    >
                      {t("markReturned")}
                    </Button>
                  </div>
                )}
                {st === "Returned" && (
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => undoReturn.mutate(b, { onSuccess: () => toast.success(t("saved")) })}
                    >
                      {t("undoReturn")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      asChild
                    >
                      <Link to="/app/borrow/edit" search={{ id: b.id }}>
                        <Pencil className="size-3.5" />
                        {t("edit")}
                      </Link>
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
