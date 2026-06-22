import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useBorrows, useEditBorrow, uid } from "@/lib/store";
import type { BookType, BorrowStatus, BorrowedBook } from "@/lib/types";

// ── Route definition ─────────────────────────────────────────────────────────
const searchSchema = z.object({ id: z.string() });

export const Route = createFileRoute("/app/borrow/edit")({
  head: () => ({ meta: [{ title: "Edit Record — Amanah Library System" }] }),
  validateSearch: searchSchema,
  component: EditBorrow,
});

// ── Form state ────────────────────────────────────────────────────────────────
interface FormState {
  borrowerFullName: string;
  phoneNumber: string;
  books: (Omit<BorrowedBook, "id"> & { id?: string; tempId?: string })[];
  borrowDate: string;
  expectedReturnDate: string;
  notes: string;
  remarks: string;
}

const STATUSES: BorrowStatus[] = ["Borrowed", "Reading", "Returned", "Overdue"];

// ── Component ─────────────────────────────────────────────────────────────────
function EditBorrow() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useSearch({ from: "/app/borrow/edit" });
  const libId = user!.libraryId!;

  const { data: borrows = [], isLoading } = useBorrows(libId);
  const editBorrow = useEditBorrow(libId);

  const record = borrows.find((b) => b.id === id && !b.deleted);

  // Pre-fill form once the record is available
  const [form, setForm] = useState<FormState | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (record && !form) {
      let books: FormState["books"] = [];
      if (Array.isArray(record.books) && record.books.length > 0) {
        books = record.books.map(b => ({ ...b }));
      } else {
        // Migration of legacy single-book record
        books = [{
          bookType: record.bookType || "single",
          bookNameArabic: record.bookNameArabic || "",
          bookNameEnglish: record.bookNameEnglish || "",
          sharhName: record.sharhName || null,
          juzNumber: record.juzNumber || null,
          author: record.author || null,
          status: record.status || "Borrowed",
          actualReturnDate: record.actualReturnDate || null,
        }];
      }

      setForm({
        borrowerFullName: record.borrowerFullName,
        phoneNumber: record.phoneNumber ?? "",
        books,
        borrowDate: record.borrowDate,
        expectedReturnDate: record.expectedReturnDate,
        notes: record.notes ?? "",
        remarks: record.remarks ?? "",
      });
    }
  }, [record, form]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setDirty(true);
  };

  const updateBook = (idx: number, changes: Partial<BorrowedBook>) => {
    setForm(f => {
      if (!f) return f;
      const nextBooks = [...f.books];
      nextBooks[idx] = { ...nextBooks[idx], ...changes };
      return { ...f, books: nextBooks };
    });
    setDirty(true);
  };

  const addBook = () => {
    setForm(f => {
      if (!f) return f;
      return {
        ...f,
        books: [...f.books, {
          tempId: uid(),
          bookType: "multi",
          bookNameArabic: "",
          bookNameEnglish: "",
          author: null,
          sharhName: null,
          juzNumber: null,
          status: "Borrowed",
          actualReturnDate: null,
        }]
      };
    });
    setDirty(true);
  };

  const removeBook = (idx: number) => {
    setForm(f => {
      if (!f || f.books.length <= 1) return f;
      const nextBooks = f.books.filter((_, i) => i !== idx);
      return { ...f, books: nextBooks };
    });
    setDirty(true);
  };

  const handleCancel = () => {
    if (dirty) {
      if (!window.confirm(t("confirmUnsaved"))) return;
    }
    navigate({ to: "/app/borrow" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !record) return;

    // Validation
    if (!form.borrowerFullName.trim()) {
      toast.error(t("borrowerName"));
      return;
    }
    
    const validBooks = form.books.filter(b => b.bookNameEnglish.trim() || b.bookNameArabic.trim());
    if (validBooks.length === 0) {
      toast.error(t("bookNameEnglish"));
      return;
    }

    if (!form.borrowDate || !form.expectedReturnDate) {
      toast.error(t("borrowDate"));
      return;
    }

    editBorrow.mutate(
      {
        id: record.id,
        borrowerFullName: form.borrowerFullName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        email: record.email ?? null,
        borrowDate: form.borrowDate,
        expectedReturnDate: form.expectedReturnDate,
        notes: form.notes.trim(),
        remarks: form.remarks.trim() || null,
        books: validBooks.map(b => ({
          id: b.id || uid(),
          bookType: b.bookType,
          bookNameArabic: b.bookNameArabic.trim(),
          bookNameEnglish: b.bookNameEnglish.trim(),
          author: null,
          sharhName: b.bookType === "multi" ? b.sharhName?.trim() || null : null,
          juzNumber: b.bookType === "multi" ? b.juzNumber?.trim() || null : null,
          status: b.status,
          actualReturnDate: b.status === "Returned" ? (b.actualReturnDate || new Date().toISOString().slice(0, 10)) : null,
        })),
      },
      {
        onSuccess: () => {
          setDirty(false);
          toast.success(t("editSuccess"));
          navigate({ to: "/app/borrow" });
        },
        onError: () => {
          toast.error(t("editError"));
        },
      },
    );
  };

  // ── Render states ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (!record || !form) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">{t("recordNotFound")}</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate({ to: "/app/borrow" })}>
          {t("cancel")}
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <PageHeader title={t("editBorrowTitle")} />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Borrower Section */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-lg">{t("borrowerName")}</h3>
          <div className="space-y-1.5">
            <Label htmlFor="borrowerFullName">{t("borrowerName")}</Label>
            <Input
              id="borrowerFullName"
              value={form.borrowerFullName}
              onChange={(e) => set("borrowerFullName", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber">{t("phoneNumber")} ({t("optional")})</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => set("phoneNumber", e.target.value)}
            />
          </div>
        </div>

        {/* Books Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{lang === "ar" ? "الكتب" : "Books"}</h3>
            <Button type="button" onClick={addBook} variant="outline" size="sm" className="gap-1.5">
              <Plus className="size-4" />
              {lang === "ar" ? "إضافة كتاب" : "Add Book"}
            </Button>
          </div>

          {form.books.map((book, idx) => (
            <div key={book.id || book.tempId} className="relative rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm group">
              {form.books.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBook(idx)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
              
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">
                    {idx + 1}
                  </span>
                  {lang === "ar" ? `الكتاب ${idx + 1}` : `Book ${idx + 1}`}
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={book.status}
                    onValueChange={(v) => updateBook(idx, { status: v as BorrowStatus })}
                  >
                    <SelectTrigger className="h-8 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(s as never)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("bookType")}</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => updateBook(idx, { bookType: "multi" })}
                    className={`flex-1 rounded-xl border p-3 text-left transition ${
                      book.bookType === "multi" ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <span className="block font-semibold">{t("multiJuz")}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t("multiJuzHint")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateBook(idx, { bookType: "single" })}
                    className={`flex-1 rounded-xl border p-3 text-left transition ${
                      book.bookType === "single" ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <span className="block font-semibold">{t("singleBook")}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t("singleBookHint")}</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("bookNameEnglish")} ({t("optional")})</Label>
                  <Input 
                    value={book.bookNameEnglish} 
                    onChange={(e) => updateBook(idx, { bookNameEnglish: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("bookNameArabic")}</Label>
                  <Input 
                    dir="rtl" 
                    value={book.bookNameArabic} 
                    onChange={(e) => updateBook(idx, { bookNameArabic: e.target.value })} 
                  />
                </div>
              </div>

              {book.bookType === "multi" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("sharhName")}</Label>
                    <Input 
                      value={book.sharhName || ""} 
                      onChange={(e) => updateBook(idx, { sharhName: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("juzNumber")}</Label>
                    <Input
                      value={book.juzNumber || ""}
                      onChange={(e) => updateBook(idx, { juzNumber: e.target.value })}
                      placeholder="1, 2, 3"
                    />
                    <p className="text-xs text-muted-foreground">{t("juzHint")}</p>
                  </div>
                </div>
              )}
              
              {book.status === "Returned" && (
                <div className="space-y-1.5">
                  <Label>{t("actualReturn")}</Label>
                  <Input 
                    type="date"
                    value={book.actualReturnDate || ""} 
                    onChange={(e) => updateBook(idx, { actualReturnDate: e.target.value })} 
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dates & Notes Section */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="borrowDate">{t("borrowDate")}</Label>
              <Input
                id="borrowDate"
                type="date"
                value={form.borrowDate}
                onChange={(e) => set("borrowDate", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expectedReturnDate">{t("expectedReturn")}</Label>
              <Input
                id="expectedReturnDate"
                type="date"
                value={form.expectedReturnDate}
                onChange={(e) => set("expectedReturnDate", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="remarks">{t("remarks")}</Label>
            <Textarea
              id="remarks"
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Last updated info */}
        <p className="text-xs text-muted-foreground">
          ID: {record.id} · Created: {record.createdAt.slice(0, 10)}
          {record.updatedAt !== record.createdAt && ` · Last edited: ${record.updatedAt.slice(0, 10)}`}
        </p>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel} className="px-8" disabled={editBorrow.isPending}>
            {t("cancel")}
          </Button>
          <Button type="submit" className="bg-gradient-primary px-10 shadow-lg shadow-primary/20" disabled={editBorrow.isPending || !dirty}>
            {editBorrow.isPending ? t("loading") : t("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
