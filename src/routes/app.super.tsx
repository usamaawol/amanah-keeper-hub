import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  BookMarked,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessagesSquare,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  Users,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useBorrows, useReservations } from "@/lib/store";
import { loadAudit } from "@/lib/audit";
import {
  listAllUsers,
  updateUserRole,
  setUserDisabled,
  type FirestoreUserProfile,
} from "@/lib/user-profile";
import { ROLES, ASSIGNABLE_ROLES } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

export const Route = createFileRoute("/app/super")({
  head: () => ({ meta: [{ title: "Super Admin — Amanah Library System" }] }),
  component: SuperAdmin,
});

// ── Component ─────────────────────────────────────────────────────────────────
function SuperAdmin() {
  const { t } = useI18n();
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: borrows = [] } = useBorrows(user?.libraryId ?? null);
  const { data: reservations = [] } = useReservations(user?.libraryId ?? null);

  const [users, setUsers] = useState<FirestoreUserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [audit] = useState(() => loadAudit());

  // Guard — redirect non-superadmins immediately
  useEffect(() => {
    if (!isSuperAdmin) {
      navigate({ to: "/app/dashboard" });
    }
  }, [isSuperAdmin, navigate]);

  // Load all users from Firestore
  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const all = await listAllUsers();
      // Sort: superadmins first, then alphabetical by libraryName
      all.sort((a, b) => {
        if (a.role === ROLES.SUPERADMIN && b.role !== ROLES.SUPERADMIN) return -1;
        if (b.role === ROLES.SUPERADMIN && a.role !== ROLES.SUPERADMIN) return 1;
        return (a.libraryName ?? "").localeCompare(b.libraryName ?? "");
      });
      setUsers(all);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load users";
      setUsersError(msg);
      console.error("[SuperAdmin] listAllUsers failed:", e);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) void loadUsers();
  }, [isSuperAdmin]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (uid === user?.uid && newRole !== ROLES.SUPERADMIN) {
      toast.error("You cannot demote your own superadmin role.");
      return;
    }
    setActionPending(uid);
    try {
      await updateUserRole(uid, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)),
      );
      toast.success("Role updated.");
    } catch (e) {
      toast.error("Failed to update role.");
      console.error(e);
    } finally {
      setActionPending(null);
    }
  };

  const handleToggleDisabled = async (uid: string, currentDisabled: boolean) => {
    if (uid === user?.uid) {
      toast.error("You cannot disable your own account.");
      return;
    }
    setActionPending(uid);
    try {
      await setUserDisabled(uid, !currentDisabled);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, disabled: !currentDisabled } : u)),
      );
      toast.success(!currentDisabled ? "Account disabled." : "Account enabled.");
    } catch (e) {
      toast.error("Failed to update account status.");
      console.error(e);
    } finally {
      setActionPending(null);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10);
  const activeToday = new Set(
    audit
      .filter((a) => a.timestamp.slice(0, 10) === today)
      .map((a) => a.userId),
  ).size;

  const stats = [
    {
      label: "Total Users",
      value: users.length,
      icon: <Users className="size-5" />,
    },
    {
      label: "Borrow Records",
      value: borrows.filter((b) => !b.deleted).length,
      icon: <BookMarked className="size-5" />,
    },
    {
      label: "Reservations",
      value: reservations.length,
      icon: <MessagesSquare className="size-5" />,
    },
    {
      label: "Active Today",
      value: activeToday,
      icon: <Activity className="size-5" />,
    },
  ];

  const recentActivity = audit.slice(0, 25);

  const roleColor: Record<UserRole, string> = {
    superadmin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    admin: "bg-primary/10 text-primary",
    librarian: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    assistant: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    user: "bg-muted text-muted-foreground",
  };

  if (!isSuperAdmin) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("superAdmin")} subtitle="Role-based control panel — permissions from Firestore only" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm"
          >
            <div className="mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              {s.icon}
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* User Management */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">{t("registeredUsers")}</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={loadUsers}
            disabled={usersLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${usersLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {usersLoading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Loading users…
          </div>
        )}

        {usersError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-semibold">Failed to load users</p>
            <p className="mt-1 font-mono text-xs">{usersError}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Check that your account has <code>role: &quot;superadmin&quot;</code> in Firestore and the rules are deployed.
            </p>
          </div>
        )}

        {!usersLoading && !usersError && users.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No users found.</p>
        )}

        <div className="divide-y divide-border">
          {users.map((u) => {
            const isMe = u.uid === user?.uid;
            const isPending = actionPending === u.uid;
            const isExpanded = expandedUser === u.uid;
            const userAudit = audit.filter((a) => a.userId === u.uid).slice(0, 10);

            return (
              <div key={u.uid} className={`py-3 ${u.disabled ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Avatar initial */}
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {(u.displayName || u.email || u.libraryName || "?")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {u.libraryName || u.displayName || "—"}
                      {isMe && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>

                  {/* Role badge */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleColor[u.role] ?? "bg-muted text-muted-foreground"}`}
                  >
                    {u.role}
                  </span>

                  {u.disabled && (
                    <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                      disabled
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {!isMe && (
                      <>
                        {/* Toggle disabled */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          disabled={isPending}
                          title={u.disabled ? "Enable account" : "Disable account"}
                          onClick={() => handleToggleDisabled(u.uid, !!u.disabled)}
                        >
                          {isPending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : u.disabled ? (
                            <UserCheck className="size-3.5 text-success" />
                          ) : (
                            <UserX className="size-3.5 text-destructive" />
                          )}
                        </Button>

                        {/* Promote to superadmin */}
                        {u.role !== ROLES.SUPERADMIN && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            disabled={isPending}
                            title="Promote to Super Admin"
                            onClick={() => handleRoleChange(u.uid, ROLES.SUPERADMIN)}
                          >
                            <ShieldCheck className="size-3.5 text-purple-500" />
                          </Button>
                        )}

                        {/* Demote to admin */}
                        {u.role === ROLES.SUPERADMIN && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            disabled={isPending}
                            title="Demote to Admin"
                            onClick={() => handleRoleChange(u.uid, ROLES.ADMIN)}
                          >
                            <ShieldOff className="size-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </>
                    )}

                    {/* Role selector for non-superadmin users */}
                    {!isMe && u.role !== ROLES.SUPERADMIN && (
                      <select
                        className="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
                        value={u.role}
                        disabled={isPending}
                        onChange={(e) =>
                          handleRoleChange(u.uid, e.target.value as UserRole)
                        }
                      >
                        {ASSIGNABLE_ROLES.filter((r) => r !== ROLES.SUPERADMIN).map(
                          (r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ),
                        )}
                      </select>
                    )}

                    {/* Expand activity log */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() =>
                        setExpandedUser(isExpanded ? null : u.uid)
                      }
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Activity log drawer */}
                {isExpanded && (
                  <div className="mt-3 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                    <p className="mb-2 font-semibold text-muted-foreground">
                      Recent activity ({userAudit.length})
                    </p>
                    {userAudit.length === 0 ? (
                      <p className="text-muted-foreground">No local activity recorded.</p>
                    ) : (
                      <ul className="space-y-1">
                        {userAudit.map((a) => (
                          <li key={a.id} className="flex items-center justify-between">
                            <span className="font-mono">{a.action}</span>
                            <span className="text-muted-foreground">
                              {a.timestamp.slice(0, 16).replace("T", " ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-muted-foreground">
                      UID: <span className="font-mono">{u.uid}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* System Activity Log */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">System Activity Log (last 25)</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity logged yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {recentActivity.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                  <span className="font-mono text-xs">{a.action}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="hidden sm:block font-mono">{a.userId.slice(0, 12)}…</span>
                  <span>{a.timestamp.slice(0, 16).replace("T", " ")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Debug info (dev only) */}
      {import.meta.env.DEV && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-sm text-muted-foreground">
            Debug (dev only)
          </h2>
          <pre className="text-xs text-muted-foreground overflow-auto">
            {JSON.stringify(
              { uid: user?.uid, role: user?.role, disabled: user?.disabled, isSuperAdmin },
              null,
              2,
            )}
          </pre>
        </section>
      )}
    </div>
  );
}
