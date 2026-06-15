import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Send, Loader2, Plus, MessageSquare, Trash2, History } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useBorrows, useReservations, useOnline } from "@/lib/store";
import { getSettings } from "@/lib/settings";
import { askLibraryAI } from "@/lib/ai";
import { logAudit } from "@/lib/audit";
import {
  appendMessage,
  createConversation,
  deleteConversation,
  groupByRecency,
  loadConversations,
  type Conversation,
} from "@/lib/conversations";

export const Route = createFileRoute("/app/ai")({
  head: () => ({ meta: [{ title: "AI Assistant — Amanah Library System" }] }),
  component: AI,
});

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function AI() {
  const { t } = useI18n();
  const { user } = useAuth();
  const online = useOnline();
  const { data: borrows = [] } = useBorrows(user!.libraryId!);
  const { data: reservations = [] } = useReservations(user!.libraryId!);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const settings = getSettings();
  const hasKey = !!settings.openRouterKey.trim();

  // Load cached conversations for this user (works offline).
  useEffect(() => {
    if (user?.uid) setConversations(loadConversations(user.uid));
  }, [user?.uid]);

  const refresh = () => {
    if (user?.uid) setConversations(loadConversations(user.uid));
  };

  const openConversation = (conv: Conversation) => {
    setActiveId(conv.id);
    setMessages(conv.messages.map((m) => ({ role: m.role, content: m.content })));
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setInput("");
  };

  const removeConversation = (id: string) => {
    if (!user?.uid) return;
    deleteConversation(user.uid, id);
    if (activeId === id) newChat();
    refresh();
  };

  const send = async () => {
    const question = input.trim();
    if (!question || loading || !user?.uid) return;

    // Block AI when offline — show a clear message in the chat
    if (!online) {
      setMessages((m) => [
        ...m,
        { role: "user", content: question },
        { role: "assistant", content: `📡 ${t("aiNeedsInternet")}` },
      ]);
      setInput("");
      return;
    }
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput(""); // clear input immediately after sending
    setLoading(true);

    // Ensure there is an active conversation, then persist the user message.
    let convId = activeId;
    if (!convId) {
      const conv = createConversation(user.uid, question.slice(0, 40));
      convId = conv.id;
      setActiveId(convId);
    }
    appendMessage(user.uid, convId, "user", question);
    refresh();

    try {
      const answer = await askLibraryAI({
        question,
        apiKey: settings.openRouterKey,
        model: settings.aiModel,
        borrows: borrows.filter(b => !b.deleted),
        reservations,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
      appendMessage(user.uid, convId, "assistant", answer);
      logAudit(user.uid, "ai_usage");
      refresh();
    } catch (e) {
      console.error(e);
      setMessages((m) => [...m, { role: "assistant", content: t("aiError") }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  };

  const groups = groupByRecency(conversations);
  const bucketLabel = (k: string) =>
    k === "today" ? t("today") : k === "yesterday" ? t("yesterday") : k === "lastWeek" ? t("lastWeek") : t("older");

  // Shared conversation list UI used in both desktop sidebar and mobile sheet
  const ConvList = ({ onSelect }: { onSelect?: () => void }) => (
    <>
      <Button onClick={() => { newChat(); onSelect?.(); }} className="mb-3 w-full justify-start gap-2" variant="secondary">
        <Plus className="size-4" /> {t("newConversation")}
      </Button>
      <p className="px-1 pb-2 text-xs font-semibold text-muted-foreground">{t("recentConversations")}</p>
      <div className="flex-1 space-y-3 overflow-y-auto">
        {groups.length === 0 && (
          <p className="px-1 text-xs text-muted-foreground">{t("empty")}</p>
        )}
        {groups.map((g) => (
          <div key={g.key}>
            <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">
              {bucketLabel(g.key)}
            </p>
            {g.items.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  activeId === c.id ? "bg-secondary" : "hover:bg-secondary/60"
                }`}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-start"
                  onClick={() => { openConversation(c); onSelect?.(); }}
                >
                  <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.title}</span>
                </button>
                <button
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={() => removeConversation(c.id)}
                  aria-label={t("delete")}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden w-60 shrink-0 flex-col rounded-2xl border border-border bg-card p-3 md:flex">
        <ConvList />
      </aside>

      {/* Chat panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar: New + Conversations sheet */}
        <div className="mb-2 flex items-center gap-2 md:hidden">
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={newChat}>
            <Plus className="size-4" /> {t("newConversation")}
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <History className="size-4" /> {t("recentConversations")}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col p-4">
              <SheetHeader className="mb-3">
                <SheetTitle>{t("recentConversations")}</SheetTitle>
              </SheetHeader>
              <ConvList />
            </SheetContent>
          </Sheet>
        </div>

        <PageHeader title={t("aiAssistant")} />

        <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-4">
          {messages.length === 0 && (
            <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground">
                <Sparkles className="size-7" />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("aiIntro")}</p>
              {!hasKey && (
                <p className="mt-3 text-xs font-medium text-destructive">{t("aiNeedsKey")}</p>
              )}
              {!online && (
                <p className="mt-2 text-xs text-muted-foreground">{t("aiNeedsInternet")}</p>
              )}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {t("aiThinking")}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={online ? t("aiPlaceholder") : t("aiNeedsInternet")}
            disabled={loading || !online}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim() || !online}
            aria-label={t("aiSend")}
            title={!online ? t("aiNeedsInternet") : !hasKey ? t("aiNeedsKey") : t("aiSend")}
          >
            <Send className="size-4" />
          </Button>
        </form>
        {!online && (
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            📡 {t("aiNeedsInternet")}
          </p>
        )}
      </div>
    </div>
  );
}
