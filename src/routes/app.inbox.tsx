import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Inbox as InboxIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getSupportMessages, setSupportStatus, type SupportMessage } from "@/lib/support";

export const Route = createFileRoute("/app/inbox")({
  head: () => ({ meta: [{ title: "Support Inbox — Amanah Library System" }] }),
  component: InboxPage,
});

const CATEGORY_KEY = {
  report: "catReport",
  idea: "catIdea",
  question: "catQuestion",
  other: "catOther",
} as const;

function InboxPage() {
  const { t } = useI18n();
  const { isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SupportMessage[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isSuperAdmin) {
      navigate({ to: "/app/dashboard" });
      return;
    }
    getSupportMessages().then(setMessages).catch(() => setMessages([]));
  }, [isSuperAdmin, loading, navigate]);

  const toggle = async (m: SupportMessage) => {
    const next = m.status === "open" ? "resolved" : "open";
    try {
      await setSupportStatus(m.id, next);
      setMessages((prev) => (prev ? prev.map((x) => (x.id === m.id ? { ...x, status: next } : x)) : prev));
    } catch {
      toast.error(t("messageFailed"));
    }
  };

  if (loading || !isSuperAdmin) return null;

  return (
    <div>
      <PageHeader title={t("supportInbox")} />
      {messages === null ? (
        <div className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("loading")}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <InboxIcon className="size-8" />
          <p>{t("inboxEmpty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {t(CATEGORY_KEY[m.category])}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    m.status === "open" ? "bg-gold/20 text-gold" : "bg-success/15 text-success"
                  }`}
                >
                  {m.status === "open" ? t("open") : t("resolved")}
                </span>
                <span className="ms-auto text-xs text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{m.name}</span>
                {m.email && <span>· {m.email}</span>}
                {m.libraryName && <span>· {m.libraryName}</span>}
                <Button size="sm" variant="outline" className="ms-auto" onClick={() => toggle(m)}>
                  {m.status === "open" ? t("markResolved") : t("reopen")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
