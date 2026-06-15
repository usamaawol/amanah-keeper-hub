import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, History, Trash2 } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { bookLabel, effectiveStatus, useBorrows, useDeleteBorrow } from "@/lib/store";

export const Route = createFileRoute("/app/history")({
  head: () => ({ meta: [{ title: "History — Amanah Library System" }] }),
  component: HistoryPage,
});

// Persist show/hide preference in localStorage
const HIDDEN_KEY = "amanah-history-hidden";

function loadHidden(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function saveHidden(set: Set<string>) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set]));
}

function HistoryPage() {
  const { t, lang } = useI18n();
  const { user, isSuperAdmin } = useAuth();
  const { data: borrows = [] } = useBorrows(user!.libraryId!);
  const deleteBorrow = useDeleteBorrow(user!.libraryId!);
  const [q, setQ] = useState("");
  const [showReturned, setShowReturned] = useState(true);
  const [showBorrowed, setShowBorrowed] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(loadHidden);
  const [collapsed, setCollapsed] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  const toggleHidden = (eventKey: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventKey)) next.delete(eventKey);
      else next.add(eventKey);
      saveHidden(next);
      return next;
    });
  };

  const handleDelete = () => {
    if (recordToDelete && user) {
      deleteBorrow.mutate({ id: recordToDelete, deletedBy: user.uid }, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setRecordToDelete(null);
        }
      });
    }
  };

  const events = useMemo(() => {
    const list: {
      key: string;
      borrowDate: string;
      returnDate: string | null;
      label: string;
      sub: string;
      status: ReturnType<typeof effectiveStatus>;
      borrowId: string;
      deleted?: boolean;
    }[] = [];

    for (const b of borrows) {
      // Skip deleted records unless super admin
      if (b.deleted && !isSuperAdmin) continue;
      const st = effectiveStatus(b);
      list.push({
        key: `record-${b.id}`,
        borrowDate: b.borrowDate,
        returnDate: b.actualReturnDate ?? null,
        label: b.borrowerFullName,
        sub: bookLabel(b, lang),
        status: st,
        borrowId: b.id,
        deleted: b.deleted,
      });
    }

    return list
      .filter((e) => {
        if (!showReturned && e.status === "Returned") return false;
        if (!showBorrowed && e.status !== "Returned") return false;
        if (q.trim() && !(e.label + e.sub).toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.borrowDate.localeCompare(a.borrowDate));
  }, [borrows, q, lang, showReturned, showBorrowed, isSuperAdmin]);

  const visible = events.filter((e) => !hiddenIds.has(e.key));
  const hiddenCount = events.filter((e) => hiddenIds.has(e.key)).length;

  return (
    <div>
      <PageHeader title={t("history")} subtitle={t("featHistoryDesc")} />

      {/* Controls */}
      <div className="mb-4 space-y-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          className="h-11"
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter toggles */}
          <Button
            size="sm"
            variant={showBorrowed ? "default" : "outline"}
            onClick={() => setShowBorrowed((v) => !v)}
            className="gap-1.5"
          >
            <span className="size-2 rounded-full bg-primary" />
            {t("Borrowed")}
          </Button>
          <Button
            size="sm"
            variant={showReturned ? "default" : "outline"}
            onClick={() => setShowReturned((v) => !v)}
            className="gap-1.5"
          >
            <span className="size-2 rounded-full bg-success" />
            {t("Returned")}
          </Button>

          {/* Collapse / expand all */}
          <Button
            size="sm"
            variant="outline"
            className="ms-auto gap-1.5"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
            {collapsed ? "Expand all" : "Collapse all"}
          </Button>
        </div>

        {hiddenCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {hiddenCount} record{hiddenCount !== 1 ? "s" : ""} hidden.{" "}
            <button
              className="text-primary underline underline-offset-2"
              onClick={() => {
                setHiddenIds(new Set());
                saveHidden(new Set());
              }}
            >
              Show all
            </button>
          </p>
        )}
      </div>

      {events.length === 0 ? (
        <EmptyState icon={<History className="size-10" />} title={t("empty")} />
      ) : collapsed ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {events.length} event{events.length !== 1 ? "s" : ""} collapsed.{" "}
          <button
            className="text-primary underline underline-offset-2"
            onClick={() => setCollapsed(false)}
          >
            Expand
          </button>
        </div>
      ) : (
        <ol className="relative space-y-3 border-s-2 border-border ps-5">
          {visible.map((e) => (
            <li key={e.key} className="relative">
              <span className="absolute -start-[27px] top-1.5 size-3 rounded-full bg-gradient-primary" />
              <div className={`rounded-xl border border-border bg-card p-3.5 ${e.deleted ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("borrowDate")}: {e.borrowDate}
                    {e.returnDate && (
                      <span className="ms-2">
                        → {t("actualReturn")}: {e.returnDate}
                      </span>
                    )}
                    {e.deleted && <span className="ms-2 text-red-500">(Deleted)</span>}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={e.status} />
                    <button
                      onClick={() => toggleHidden(e.key)}
                      title="Hide this entry"
                      className="rounded p-0.5 text-muted-foreground transition hover:text-foreground"
                    >
                      <EyeOff className="size-3.5" />
                    </button>
                    {!e.deleted && (
                      <button
                        onClick={() => {
                          setRecordToDelete(e.borrowId);
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete this entry"
                        className="rounded p-0.5 text-red-500 transition hover:text-red-700"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1 font-medium">{e.label}</p>
                <p className="text-sm text-muted-foreground">{e.sub}</p>
              </div>
            </li>
          ))}

          {/* Hidden entries section */}
          {hiddenCount > 0 && (
            <li className="relative">
              <span className="absolute -start-[27px] top-1.5 size-3 rounded-full bg-muted" />
              <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3.5">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {hiddenCount} hidden record{hiddenCount !== 1 ? "s" : ""}
                  </p>
                  <button
                    className="ms-auto text-xs text-primary underline underline-offset-2"
                    onClick={() => {
                      setHiddenIds(new Set());
                      saveHidden(new Set());
                    }}
                  >
                    Show all
                  </button>
                </div>
              </div>
            </li>
          )}
        </ol>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteHistoryTitle")}</DialogTitle>
            <DialogDescription>{t("deleteHistoryMessage")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{t("cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBorrow.isPending}>{t("deleteConfirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
