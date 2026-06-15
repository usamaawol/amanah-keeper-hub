import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/store";
import { putNotification } from "@/lib/db";
import { useQueryClient } from "@tanstack/react-query";
import type { AppNotification } from "@/lib/types";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Amanah Library System" }] }),
  component: Notifications,
});

function Notifications() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { data: notifications = [] } = useNotifications(user!.libraryId!);
  const qc = useQueryClient();
  const libId = user!.libraryId!;

  const sorted = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = sorted.filter((n) => !n.read).length;

  const markRead = async (n: AppNotification) => {
    if (n.read) return;
    await putNotification({ ...n, read: true });
    qc.invalidateQueries({ queryKey: ["notifications", libId] });
  };

  const markAllRead = async () => {
    await Promise.all(
      sorted.filter((n) => !n.read).map((n) => putNotification({ ...n, read: true })),
    );
    qc.invalidateQueries({ queryKey: ["notifications", libId] });
  };

  const dot: Record<string, string> = {
    borrow: "bg-primary",
    return: "bg-success",
    due: "bg-gold",
    overdue: "bg-destructive",
    reservation: "bg-gold",
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <PageHeader title={t("notifications")} />
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="mt-1 shrink-0 gap-1.5"
            onClick={markAllRead}
          >
            <CheckCheck className="size-4" />
            Mark all read ({unreadCount})
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={<Bell className="size-10" />} title={t("empty")} />
      ) : (
        <div className="space-y-2">
          {sorted.map((n) => (
            <div
              key={n.id}
              onClick={() => markRead(n)}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                n.read
                  ? "border-border bg-card opacity-60"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot[n.type] ?? "bg-primary"} ${n.read ? "opacity-30" : ""}`} />
              <div className="flex-1">
                <p className="text-sm">{lang === "ar" ? n.messageAr : n.messageEn}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" title="Unread" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
