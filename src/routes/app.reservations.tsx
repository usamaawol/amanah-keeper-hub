import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  bookKey,
  bookLabel,
  effectiveStatus,
  nowISO,
  useBorrows,
  useDeleteReservation,
  useReservations,
  useSaveReservation,
} from "@/lib/store";
import { uid } from "@/lib/db";
import type { Reservation } from "@/lib/types";

export const Route = createFileRoute("/app/reservations")({
  head: () => ({ meta: [{ title: "Reservations — Amanah Library System" }] }),
  component: Reservations,
});

function Reservations() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const libId = user!.libraryId!;
  const { data: reservations = [] } = useReservations(libId);
  const { data: borrows = [] } = useBorrows(libId);
  const save = useSaveReservation(libId);
  const del = useDeleteReservation(libId);
  const [names, setNames] = useState<Record<string, string>>({});

  const holderFor = (r: Reservation) =>
    borrows.find((b) => !b.deleted && bookKey(b) === r.bookKey && effectiveStatus(b) !== "Returned")?.borrowerFullName;

  // books currently borrowed but with no reservation yet
  const reservableBooks = borrows
    .filter((b) => !b.deleted && effectiveStatus(b) !== "Returned")
    .filter((b) => !reservations.some((r) => r.bookKey === bookKey(b)));

  const createRes = (b: (typeof borrows)[number]) => {
    const res: Reservation = {
      id: uid(),
      libraryId: libId,
      bookKey: bookKey(b),
      bookNameArabic: b.bookNameArabic,
      bookNameEnglish: b.bookNameEnglish,
      sharhName: b.sharhName,
      juzNumber: b.juzNumber,
      queue: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    save.mutate(res);
  };

  const addToQueue = (r: Reservation) => {
    const name = (names[r.id] ?? "").trim();
    if (!name) return;
    save.mutate({ ...r, queue: [...r.queue, { name, addedAt: nowISO() }] });
    setNames((n) => ({ ...n, [r.id]: "" }));
  };

  const removeFromQueue = (r: Reservation, idx: number) => {
    save.mutate({ ...r, queue: r.queue.filter((_, i) => i !== idx) });
  };

  return (
    <div>
      <PageHeader title={t("reservations")} />

      {reservableBooks.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {reservableBooks.map((b) => (
            <Button key={b.id} size="sm" variant="outline" onClick={() => createRes(b)}>
              <Plus className="size-4" /> {bookLabel(b, lang)}
            </Button>
          ))}
        </div>
      )}

      {reservations.length === 0 ? (
        <EmptyState icon={<Bookmark className="size-10" />} title={t("noReservations")} />
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{bookLabel(r, lang)}</p>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => del.mutate(r.id)}>
                  <X className="size-4" />
                </Button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("currentHolder")}: <span className="font-medium text-foreground">{holderFor(r) ?? "—"}</span>
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("queue")}</p>
              <ol className="mt-1.5 space-y-1.5">
                {r.queue.map((q, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-1.5 text-sm">
                    <span>
                      {i + 1}. {q.name}
                    </span>
                    <button onClick={() => removeFromQueue(r, i)} className="text-muted-foreground hover:text-destructive">
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex gap-2">
                <Input
                  value={names[r.id] ?? ""}
                  onChange={(e) => setNames((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder={t("addToQueue")}
                  className="h-9"
                />
                <Button size="sm" onClick={() => addToQueue(r)}>
                  {t("add")}
                </Button>
              </div>
              {r.queue.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 text-primary"
                  onClick={() => toast.success(`${t("notifyNext")}: ${r.queue[0].name}`)}
                >
                  {t("notifyNext")}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
