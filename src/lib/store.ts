import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteReservation,
  getBorrows,
  getNotifications,
  getReservations,
  putBorrow,
  putNotification,
  putReservation,
  uid,
} from "./db";
import type {
  AppNotification,
  BorrowedBook,
  BorrowRecord,
  ReaderProfile,
  Reservation,
} from "./types";
export { uid } from "./db";
import { logAudit } from "./audit";

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
export function nowISO() {
  return new Date().toISOString();
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function effectiveStatus(r: BorrowRecord): BorrowRecord["status"] {
  // If it's a multi-book record, derive status from books
  if (r.books && r.books.length > 0) {
    const allReturned = r.books.every((b) => b.status === "Returned");
    if (allReturned) return "Returned";
    
    const anyOverdue = r.expectedReturnDate && r.expectedReturnDate < todayISO();
    if (anyOverdue) return "Overdue";
    
    return "Borrowed";
  }

  // Legacy fallback
  if (r.status === "Returned") return "Returned";
  if (r.actualReturnDate) return "Returned";
  if (r.expectedReturnDate && r.expectedReturnDate < todayISO()) return "Overdue";
  return r.status || "Borrowed";
}

export function bookLabel(r: { bookNameEnglish?: string; bookNameArabic?: string; sharhName?: string | null; juzNumber?: string | null; books?: BorrowedBook[] }, lang: "en" | "ar" | "om") {
  if (r.books && r.books.length > 0) {
    if (r.books.length === 1) return bookLabel(r.books[0], lang);
    return lang === "ar" ? `${r.books.length} كتب` : `${r.books.length} books`;
  }
  const name = lang === "ar" ? r.bookNameArabic || r.bookNameEnglish : r.bookNameEnglish || r.bookNameArabic;
  const parts = [r.sharhName, name].filter(Boolean);
  let label = parts.join(" — ") || name || "—";
  if (r.juzNumber) label += ` (${lang === "ar" ? "جزء" : "Juz"} ${r.juzNumber})`;
  return label;
}

export function bookKey(r: { bookNameEnglish?: string; bookNameArabic?: string; sharhName?: string | null; juzNumber?: string | null }) {
  return [r.sharhName || "", r.bookNameEnglish || "", r.bookNameArabic || "", r.juzNumber ?? ""]
    .join("|")
    .toLowerCase()
    .trim();
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** Returns the number of locally-queued writes not yet synced to Firestore. */
export function usePendingCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const { getPendingSyncCount } = await import("./db");
        const n = await getPendingSyncCount();
        if (!cancelled) setCount(n);
      } catch { /* ignore */ }
    };
    refresh();
    // Re-check every 5 seconds so the badge stays accurate
    const interval = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  return count;
}

export function useBorrows(libraryId: string | null) {
  return useQuery({
    queryKey: ["borrows", libraryId],
    queryFn: () => getBorrows(libraryId!),
    enabled: !!libraryId && typeof window !== "undefined",
  });
}

export function useReservations(libraryId: string | null) {
  return useQuery({
    queryKey: ["reservations", libraryId],
    queryFn: () => getReservations(libraryId!),
    enabled: !!libraryId && typeof window !== "undefined",
  });
}

export function useNotifications(libraryId: string | null) {
  return useQuery({
    queryKey: ["notifications", libraryId],
    queryFn: () => getNotifications(libraryId!),
    enabled: !!libraryId && typeof window !== "undefined",
  });
}

export function computeReaders(borrows: BorrowRecord[]): ReaderProfile[] {
  const map = new Map<string, ReaderProfile>();
  for (const b of borrows) {
    const name = b.borrowerFullName.trim();
    if (!name) continue;
    const p = map.get(name) ?? { name, totalBorrowed: 0, returned: 0, currentlyBorrowed: 0, books: [] };
    
    if (b.books && b.books.length > 0) {
      for (const book of b.books) {
        p.totalBorrowed += 1;
        if (book.status === "Returned") p.returned += 1;
        else p.currentlyBorrowed += 1;
        const lbl = bookLabel(book, "en");
        if (!p.books.includes(lbl)) p.books.push(lbl);
      }
    } else {
      // Legacy
      p.totalBorrowed += 1;
      const st = effectiveStatus(b);
      if (st === "Returned") p.returned += 1;
      else p.currentlyBorrowed += 1;
      const lbl = bookLabel(b, "en");
      if (!p.books.includes(lbl)) p.books.push(lbl);
    }
    map.set(name, p);
  }
  return Array.from(map.values()).sort((a, b) => b.totalBorrowed - a.totalBorrowed);
}

function notif(libraryId: string, type: AppNotification["type"], en: string, ar: string): AppNotification {
  return { id: uid(), libraryId, type, messageEn: en, messageAr: ar, createdAt: nowISO(), read: false };
}

export function useAddBorrow(libraryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<BorrowRecord, "id" | "libraryId" | "createdAt" | "updatedAt" | "actualReturnDate" | "deleted" | "deletedAt" | "deletedBy" | "books"> & { books: Omit<BorrowedBook, "id" | "status" | "actualReturnDate">[] }) => {
      const rec: BorrowRecord = {
        ...input,
        id: uid(),
        libraryId,
        books: input.books.map((b) => ({
          ...b,
          id: uid(),
          status: "Borrowed",
          actualReturnDate: null,
        })),
        status: "Borrowed", // legacy field
        actualReturnDate: null, // legacy field
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      await putBorrow(rec);
      logAudit(libraryId.replace(/^lib_/, ""), "borrow_create");
      const lbl = bookLabel(rec, "en");
      const lblAr = bookLabel(rec, "ar");
      await putNotification(
        notif(libraryId, "borrow", `${rec.borrowerFullName} borrowed ${lbl}.`, `${rec.borrowerFullName} استعار ${lblAr}.`),
      );
      return rec;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["borrows", libraryId] });
      qc.invalidateQueries({ queryKey: ["notifications", libraryId] });
    },
  });
}

export function useMarkReturned(libraryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rec: BorrowRecord) => {
      // If multi-book, mark all books as returned
      let updated: BorrowRecord;
      if (rec.books && rec.books.length > 0) {
        updated = {
          ...rec,
          books: rec.books.map((b) => ({
            ...b,
            status: "Returned",
            actualReturnDate: todayISO(),
          })),
          updatedAt: nowISO(),
        };
      } else {
        updated = {
          ...rec,
          status: "Returned",
          actualReturnDate: todayISO(),
          updatedAt: nowISO(),
        };
      }

      await putBorrow(updated);
      logAudit(libraryId.replace(/^lib_/, ""), "record_return");
      const lbl = bookLabel(rec, "en");
      const lblAr = bookLabel(rec, "ar");
      await putNotification(
        notif(libraryId, "return", `${rec.borrowerFullName} returned ${lbl}.`, `${rec.borrowerFullName} أعاد ${lblAr}.`),
      );
      
      // Reservation check (simplified for now, usually checks first book's key)
      const reservations = await getReservations(libraryId);
      const firstBook = rec.books?.[0] || rec;
      const res = reservations.find((r) => r.bookKey === bookKey(firstBook as never));
      if (res && res.queue.length > 0) {
        const next = res.queue[0];
        await putNotification(
          notif(libraryId, "reservation", `${next.name} is next in queue for ${lbl}.`, `${next.name} هو التالي في قائمة الانتظار لـ ${lblAr}.`),
        );
      }
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["borrows", libraryId] });
      qc.invalidateQueries({ queryKey: ["notifications", libraryId] });
    },
  });
}

export function useUndoReturn(libraryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rec: BorrowRecord) => {
      let updated: BorrowRecord;
      if (rec.books && rec.books.length > 0) {
        updated = {
          ...rec,
          books: rec.books.map((b) => ({
            ...b,
            status: "Borrowed",
            actualReturnDate: null,
          })),
          updatedAt: nowISO(),
        };
      } else {
        updated = {
          ...rec,
          status: "Borrowed",
          actualReturnDate: null,
          updatedAt: nowISO(),
        };
      }
      await putBorrow(updated);
      logAudit(libraryId.replace(/^lib_/, ""), "record_undo_return");
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["borrows", libraryId] });
    },
  });
}

export function useSaveReservation(libraryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (res: Reservation) => {
      await putReservation({ ...res, updatedAt: nowISO() });
      logAudit(libraryId.replace(/^lib_/, ""), "reservation_create");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations", libraryId] }),
  });
}

export function useDeleteReservation(libraryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteReservation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations", libraryId] }),
  });
}

export function useDeleteBorrow(libraryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deletedBy }: { id: string; deletedBy: string }) => {
      const borrows = await getBorrows(libraryId);
      const rec = borrows.find((b) => b.id === id);
      if (!rec) return null;
      const updated: BorrowRecord = {
        ...rec,
        deleted: true,
        deletedAt: nowISO(),
        deletedBy,
        updatedAt: nowISO(),
      };
      await putBorrow(updated);
      logAudit(libraryId.replace(/^lib_/, ""), "record_delete");
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["borrows", libraryId] });
    },
  });
}

export function useEditBorrow(libraryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (changes: Partial<BorrowRecord> & { id: string }) => {
      const borrows = await getBorrows(libraryId);
      const existing = borrows.find((b) => b.id === changes.id);
      if (!existing) throw new Error("Record not found");
      const updated: BorrowRecord = {
        ...existing,
        ...changes,
        // Preserve immutable fields
        id: existing.id,
        libraryId: existing.libraryId,
        createdAt: existing.createdAt,
        // Always bump updatedAt
        updatedAt: nowISO(),
      };
      await putBorrow(updated);
      logAudit(libraryId.replace(/^lib_/, ""), "record_update");
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["borrows", libraryId] });
      qc.invalidateQueries({ queryKey: ["notifications", libraryId] });
    },
  });
}

/** Generate smart due/overdue notifications based on borrow records. */
export async function syncSmartNotifications(libraryId: string, borrows: BorrowRecord[]) {
  const existing = await getNotifications(libraryId);
  const today = todayISO();
  for (const b of borrows) {
    if (b.deleted || effectiveStatus(b) === "Returned") continue;
    const diff = daysBetween(today, b.expectedReturnDate);
    const lbl = bookLabel(b, "en");
    const lblAr = bookLabel(b, "ar");
    if (diff === 1) {
      const tag = `due-${b.id}-${b.expectedReturnDate}`;
      if (!existing.some((n) => n.id === tag)) {
        await putNotification({
          id: tag,
          libraryId,
          type: "due",
          messageEn: `${b.borrowerFullName}'s return for ${lbl} is due tomorrow.`,
          messageAr: `موعد إرجاع ${b.borrowerFullName} لـ ${lblAr} غداً.`,
          createdAt: nowISO(),
          read: false,
        });
      }
    } else if (diff < 0) {
      const tag = `overdue-${b.id}-${today}`;
      if (!existing.some((n) => n.id === tag)) {
        await putNotification({
          id: tag,
          libraryId,
          type: "overdue",
          messageEn: `${b.borrowerFullName} is overdue by ${Math.abs(diff)} day(s) for ${lbl}.`,
          messageAr: `${b.borrowerFullName} متأخر بـ ${Math.abs(diff)} يوم لـ ${lblAr}.`,
          createdAt: nowISO(),
          read: false,
        });
      }
    }
  }
}
