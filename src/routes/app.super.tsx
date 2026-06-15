import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Library,
  BookMarked,
  Bookmark,
  MessagesSquare,
  Activity,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useBorrows, useReservations } from "@/lib/store";
import { loadAudit } from "@/lib/audit";
import { loadConversations } from "@/lib/conversations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/super")({
  head: () => ({ meta: [{ title: "Super Admin — Amanah Library System" }] }),
  component: SuperAdmin,
});

// ── User management stored in localStorage ──────────────────────────────────
type UserRole = "admin" | "disabled" | "promoted";

interface ManagedUser {
  uid: string;
  libraryName: string;
  email?: string;
  role: UserRole;
}

const MANAGED_KEY = "amanah-managed-users";

function readManagedUsers(): ManagedUser[] {
  if (typeof window === "undefined") return [];
  try {
    const libNames = JSON.parse(
      localStorage.getItem("amanah-libnames") || "{}",
    ) as Record<string, string>;
    const managed = JSON.parse(
      localStorage.getItem(MANAGED_KEY) || "{}",
    ) as Record<string, { role: UserRole; email?: string }>;

    return Object.entries(libNames).map(([uid, libraryName]) => ({
      uid,
      libraryName,
      email: managed[uid]?.email,
      role: managed[uid]?.role ?? "admin",
    }));
  } catch {
    return [];
  }
}

function saveManagedUser(uid: string, role: UserRole) {
  if (typeof window === "undefined") return;
  const managed = JSON.parse(
    localStorage.getItem(MANAGED_KEY) || "{}",
  ) as Record<string, { role: UserRole }>;
  managed[uid] = { ...managed[uid], role };
  localStorage.setItem(MANAGED_KEY, JSON.stringify(managed));
}

function countAllConversations(users: ManagedUser[]): number {
  return users.reduce((sum, u) => sum + loadConversations(u.uid).length, 0);
}

// ── Component ────────────────────────────────────────────────────────────────
function SuperAdmin() {
  const { t } = useI18n();
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: borrows = [] } = useBorrows(user?.libraryId ?? null);
  const { data: reservations = [] } = useReservations(user?.libraryId ?? null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [audit, setAudit] = useState(() => loadAudit());
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) navigate({ to: "/app/dashboard" });
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    setUsers(readManagedUsers());
    setAudit(loadAudit());
  }, []);

  const activeToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return new Set(
      audit
        .filter((a) => a.timestamp.slice(0, 10) === today)
        .map((a) => a.userId),
    ).size;
  }, [audit]);

  if (!isSuperAdmin) return null;

  const handleRole = (uid: string, role: UserRole) => {
    saveManagedUser(uid, role);
    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, role } : u)),
    );
  };

  const userActivity = (uid: string) =>
    audit.filter((a) => a.userId === uid).slice(0, 10);

  const cards = [
    { label: t("totalUsers"), value: users.length, icon: Users },
    { label: t("totalLibraries"), value: users.length, icon: Library },
    { label: t("totalBorrowRecords"), value: borrows.length, icon: BookMarked },
    { label: t("totalReservations"), value: reservations.length, icon: Bookmark },
    {
      label: t("totalConversations"),
      value: countAllConversations(users),
      icon: MessagesSquare,
    },
    { label: t("activeUsersToday"), value: activeToday, icon: Activity },
  ];

  const roleBadge = (role: UserRole) => {
    if (role === "promoted")
      return (
        <Badge className="bg-emerald-600 text-white">
          <ShieldCheck className="mr-1 size-3" /> Promoted
        </Badge>
      );
    if (role === "disabled")
      return (
        <Badge variant="destructive">
          <UserX className="mr-1 size-3" /> Disabled
        </Badge>
      );
    return (
      <Badge variant="secondary">
        <UserCheck className="mr-1 size-3" /> Admin
      </Badge>
    );
  };

  return (
    <div>
      <PageHeader title={t("superAdmin")} subtitle={t("systemOverview")} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <c.icon className="size-4" />
              <span className="text-xs font-medium">{c.label}</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* User Management */}
      <h2 className="mb-3 mt-8 text-lg font-semibold">
        {t("registeredUsers")}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {users.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
        )}
        {users.map((u) => {
          const expanded = expandedUser === u.uid;
          const activity = userActivity(u.uid);
          return (
            <div
              key={u.uid}
              className="border-b border-border/60 last:border-0"
            >
              {/* Row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.libraryName}</span>
                    {roleBadge(u.role)}
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {u.uid}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  {u.role !== "promoted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleRole(u.uid, "promoted")}
                      title="Promote to elevated admin"
                    >
                      <ShieldCheck className="size-3" /> Promote
                    </Button>
                  )}
                  {u.role === "promoted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleRole(u.uid, "admin")}
                      title="Demote to regular admin"
                    >
                      <ShieldOff className="size-3" /> Demote
                    </Button>
                  )}
                  {u.role !== "disabled" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleRole(u.uid, "disabled")}
                      title="Disable this user"
                    >
                      <UserX className="size-3" /> Disable
                    </Button>
                  )}
                  {u.role === "disabled" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleRole(u.uid, "admin")}
                      title="Re-enable this user"
                    >
                      <UserCheck className="size-3" /> Enable
                    </Button>
                  )}
                  {/* Activity toggle */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() =>
                      setExpandedUser(expanded ? null : u.uid)
                    }
                    title="View activity"
                  >
                    {expanded ? (
                      <ChevronUp className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded activity */}
              {expanded && (
                <div className="border-t border-border/40 bg-muted/30 px-4 pb-3 pt-2">
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                    Recent Activity
                  </p>
                  {activity.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No activity recorded.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {activity.map((a) => (
                        <div
                          key={a.id}
                          className="flex justify-between text-xs"
                        >
                          <span className="font-medium">{a.action}</span>
                          <span className="text-muted-foreground">
                            {new Date(a.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Total AI conversations: {loadConversations(u.uid).length}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* System Activity Log */}
      <h2 className="mb-3 mt-8 text-lg font-semibold">
        {t("recentActivity")}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {audit.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
        )}
        {audit.slice(0, 25).map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 text-sm last:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{a.action}</span>
              <span className="truncate text-xs text-muted-foreground">
                {a.userId}
              </span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Date(a.timestamp).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
