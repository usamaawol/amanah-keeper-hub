import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { sendSupportMessage, type SupportCategory } from "@/lib/support";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Support — Amanah Library System" },
      {
        name: "description",
        content: "Send a message, report, or idea to the Amanah Library System administrator.",
      },
      { property: "og:title", content: "Contact & Support — Amanah Library System" },
      { property: "og:description", content: "Reach the system administrator with questions, reports or ideas." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { t } = useI18n();
  const { user } = useAuth();

  const [category, setCategory] = useState<SupportCategory>("question");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const categories: { value: SupportCategory; label: string }[] = [
    { value: "report", label: t("catReport") },
    { value: "idea", label: t("catIdea") },
    { value: "question", label: t("catQuestion") },
    { value: "other", label: t("catOther") },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error(t("fillAllFields"));
      return;
    }
    setBusy(true);
    try {
      await sendSupportMessage({
        name: user?.displayName ?? "Anonymous",
        email: user?.email ?? "",
        category,
        message: message.trim(),
        fromUid: user?.uid ?? null,
        libraryName: user?.libraryName ?? null,
      });
      toast.success(t("messageSent"));
      setMessage("");
    } catch (err) {
      console.error(err);
      toast.error(t("messageFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicLayout>
      <section className="mx-auto w-full max-w-2xl px-4 py-14 md:py-20">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t("contactTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("contactIntro")}</p>

        <form
          onSubmit={submit}
          className="mt-8 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-elegant"
        >
          <div className="space-y-1.5">
            <Label>{t("messageCategory")}</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    category === c.value
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("yourMessage")}</Label>
            <Textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={5000}
            />
          </div>

          <Button type="submit" size="lg" disabled={busy} className="w-full bg-gradient-primary">
            <Send className="size-4" /> {t("sendMessage")}
          </Button>
        </form>
      </section>
    </PublicLayout>
  );
}
