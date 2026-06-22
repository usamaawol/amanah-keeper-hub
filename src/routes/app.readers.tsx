import { createFileRoute } from "@tanstack/react-router";
import { Users, ShieldAlert } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui-bits";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { computeReaders, useBorrows } from "@/lib/store";

export const Route = createFileRoute("/app/readers")({
  head: () => ({ meta: [{ title: "Reader Profiles — Amanah Library System" }] }),
  component: Readers,
});

function Readers() {
  const { t } = useI18n();
  const { user, isSuperAdmin, loading } = useAuth();
  const { data: borrows = [] } = useBorrows(user?.libraryId ?? null);
  const readers = computeReaders(borrows.filter(b => !b.deleted));

  if (loading) return null;

  if (!isSuperAdmin) {
    return (
      <div>
        <PageHeader title={t("readers")} />
        <EmptyState
          icon={<ShieldAlert className="size-10" />}
          title={t("adminOnlyTitle")}
          hint={t("adminOnlyBody")}
        />
      </div>
    );
  }


  return (
    <div>
      <PageHeader title={t("readers")} />
      {readers.length === 0 ? (
        <EmptyState icon={<Users className="size-10" />} title={t("empty")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {readers.map((r) => (
            <div key={r.name} className="rounded-2xl border border-border bg-card p-5">
              <p className="text-lg font-semibold">{r.name}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-secondary p-2">
                  <p className="text-xl font-bold">{r.totalBorrowed}</p>
                  <p className="text-[10px] text-muted-foreground">{t("totalBorrowed")}</p>
                </div>
                <div className="rounded-lg bg-secondary p-2">
                  <p className="text-xl font-bold text-success">{r.returned}</p>
                  <p className="text-[10px] text-muted-foreground">{t("returned")}</p>
                </div>
                <div className="rounded-lg bg-secondary p-2">
                  <p className="text-xl font-bold text-primary">{r.currentlyBorrowed}</p>
                  <p className="text-[10px] text-muted-foreground">{t("currentlyBorrowed")}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {r.books.map((b) => (
                  <li key={b}>• {b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
