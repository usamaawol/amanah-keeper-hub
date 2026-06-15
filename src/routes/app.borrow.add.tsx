import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { todayISO, useAddBorrow } from "@/lib/store";
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

function AddBorrow() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const addBorrow = useAddBorrow(user!.libraryId!);

  const [bookType, setBookType] = useState<BookType>("multi");
  const [form, setForm] = useState({
    borrowerFullName: "",
    bookNameArabic: "",
    bookNameEnglish: "",
    sharhName: "",
    juzNumber: "",
    borrowDate: todayISO(),
    expectedReturnDate: addDays(todayISO(), 14),
    status: "Borrowed" as const,
    notes: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.borrowerFullName.trim() || (!form.bookNameEnglish.trim() && !form.bookNameArabic.trim())) {
      toast.error(t("borrowerName"));
      return;
    }
    const isMulti = bookType === "multi";
    addBorrow.mutate(
      {
        borrowerFullName: form.borrowerFullName.trim(),
        bookType,
        bookNameArabic: form.bookNameArabic.trim(),
        bookNameEnglish: form.bookNameEnglish.trim(),
        sharhName: isMulti ? form.sharhName.trim() : null,
        juzNumber: isMulti && form.juzNumber.trim() ? form.juzNumber.trim() : null,
        borrowDate: form.borrowDate,
        expectedReturnDate: form.expectedReturnDate,
        status: form.status,
        notes: form.notes.trim(),
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

  const typeOption = (value: BookType, title: string, hint: string) => (
    <button
      type="button"
      onClick={() => setBookType(value)}
      className={`flex-1 rounded-xl border p-3 text-left transition ${
        bookType === value ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:bg-muted/40"
      }`}
    >
      <span className="block font-semibold">{title}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
    </button>
  );

  return (
    <div>
      <PageHeader title={t("addBorrow")} />
      <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-1.5">
          <Label>{t("bookType")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            {typeOption("multi", t("multiJuz"), t("multiJuzHint"))}
            {typeOption("single", t("singleBook"), t("singleBookHint"))}
          </div>
        </div>

        {field(t("borrowerName"), "borrowerFullName")}
        <div className="grid gap-4 sm:grid-cols-2">
          {field(`${t("bookNameEnglish")} (${t("optional")})`, "bookNameEnglish")}
          <div className="space-y-1.5">
            <Label>{t("bookNameArabic")}</Label>
            <Input dir="rtl" value={form.bookNameArabic} onChange={(e) => set("bookNameArabic", e.target.value)} />
          </div>
        </div>
        

        {bookType === "multi" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {field(t("sharhName"), "sharhName")}
            <div className="space-y-1.5">
              <Label>{t("juzNumber")}</Label>
              <Input
                value={form.juzNumber}
                onChange={(e) => set("juzNumber", e.target.value)}
                placeholder="1, 2, 3"
              />
              <p className="text-xs text-muted-foreground">{t("juzHint")}</p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {field(t("borrowDate"), "borrowDate", "date")}
          {field(t("expectedReturn"), "expectedReturnDate", "date")}
        </div>
        <div className="space-y-1.5">
          <Label>{t("notes")}</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/borrow" })}>
            {t("cancel")}
          </Button>
          <Button type="submit" className="bg-gradient-primary">
            {t("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
