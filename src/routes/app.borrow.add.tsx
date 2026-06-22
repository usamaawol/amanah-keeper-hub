import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { todayISO, useAddBorrow, uid } from "@/lib/store";
import type { BookType } from "@/lib/types";

export const Route = createFileRoute("/app/borrow/add")({
  head: () => ({ meta: [{ title: "Add Borrow Record — Amanah Library System" }] }),
  component: AddBorrow,
});

function addDays(d: string, n: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

interface BookForm {
  tempId: string;
  bookType: BookType;
  bookNameArabic: string;
  bookNameEnglish: string;
  sharhName: string;
  juzNumber: string;
}

function AddBorrow() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const addBorrow = useAddBorrow(user!.libraryId!);

  const [form, setForm] = useState({
    borrowerFullName: "",
    phoneNumber: "",
    borrowDate: todayISO(),
    expectedReturnDate: addDays(todayISO(), 14),
    notes: "",
  });

  const [books, setBooks] = useState<BookForm[]>([
    {
      tempId: uid(),
      bookType: "multi",
      bookNameArabic: "",
      bookNameEnglish: "",
      sharhName: "",
      juzNumber: "",
    },
  ]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const updateBook = (tempId: string, changes: Partial<BookForm>) => {
    setBooks((prev) => prev.map((b) => (b.tempId === tempId ? { ...b, ...changes } : b)));
  };

  const addBook = () => {
    setBooks((prev) => [
      ...prev,
      {
        tempId: uid(),
        bookType: "multi",
        bookNameArabic: "",
        bookNameEnglish: "",
        sharhName: "",
        juzNumber: "",
      },
    ]);
  };

  const removeBook = (tempId: string) => {
    if (books.length <= 1) return;
    setBooks((prev) => prev.filter((b) => b.tempId !== tempId));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.borrowerFullName.trim()) {
      toast.error(t("borrowerName"));
      return;
    }

    const validBooks = books.filter(b => b.bookNameEnglish.trim() || b.bookNameArabic.trim());
    if (validBooks.length === 0) {
      toast.error(t("bookNameEnglish"));
      return;
    }

    addBorrow.mutate(
      {
        borrowerFullName: form.borrowerFullName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        email: null,
        borrowDate: form.borrowDate,
        expectedReturnDate: form.expectedReturnDate,
        notes: form.notes.trim(),
        remarks: null,
        status: "Borrowed",
        books: validBooks.map(b => ({
          bookType: b.bookType,
          bookNameArabic: b.bookNameArabic.trim(),
          bookNameEnglish: b.bookNameEnglish.trim(),
          author: null,
          sharhName: b.bookType === "multi" ? b.sharhName.trim() || null : null,
          juzNumber: b.bookType === "multi" ? b.juzNumber.trim() || null : null,
        })),
      },
      {
        onSuccess: () => {
          toast.success(t("saved"));
          navigate({ to: "/app/borrow" });
        },
      },
    );
  };

  const field = (label: string, k: keyof typeof form, type = "text") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={form[k]} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <div className="pb-20">
      <PageHeader title={t("addBorrow")} />
      
      <form onSubmit={submit} className="max-w-3xl space-y-6">
        {/* Borrower Section */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-lg">{t("borrowerName")}</h3>
          {field(t("borrowerName"), "borrowerFullName")}
          <div className="space-y-1.5">
            {field(`${t("phoneNumber")} (${t("optional")})`, "phoneNumber", "tel")}
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

          {books.map((book, idx) => (
            <div key={book.tempId} className="relative rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm group">
              {books.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBook(book.tempId)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
              
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">
                  {idx + 1}
                </span>
                {lang === "ar" ? `الكتاب ${idx + 1}` : `Book ${idx + 1}`}
              </div>

              <div className="space-y-1.5">
                <Label>{t("bookType")}</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => updateBook(book.tempId, { bookType: "multi" })}
                    className={`flex-1 rounded-xl border p-3 text-left transition ${
                      book.bookType === "multi" ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <span className="block font-semibold">{t("multiJuz")}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t("multiJuzHint")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateBook(book.tempId, { bookType: "single" })}
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
                    onChange={(e) => updateBook(book.tempId, { bookNameEnglish: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("bookNameArabic")}</Label>
                  <Input 
                    dir="rtl" 
                    value={book.bookNameArabic} 
                    onChange={(e) => updateBook(book.tempId, { bookNameArabic: e.target.value })} 
                  />
                </div>
              </div>

              {book.bookType === "multi" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("sharhName")}</Label>
                    <Input 
                      value={book.sharhName} 
                      onChange={(e) => updateBook(book.tempId, { sharhName: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("juzNumber")}</Label>
                    <Input
                      value={book.juzNumber}
                      onChange={(e) => updateBook(book.tempId, { juzNumber: e.target.value })}
                      placeholder="1, 2, 3"
                    />
                    <p className="text-xs text-muted-foreground">{t("juzHint")}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dates & Notes Section */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            {field(t("borrowDate"), "borrowDate", "date")}
            {field(t("expectedReturn"), "expectedReturnDate", "date")}
          </div>
          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/borrow" })} className="px-8">
            {t("cancel")}
          </Button>
          <Button type="submit" className="bg-gradient-primary px-10 shadow-lg shadow-primary/20" disabled={addBorrow.isPending}>
            {addBorrow.isPending ? t("loading") : t("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
