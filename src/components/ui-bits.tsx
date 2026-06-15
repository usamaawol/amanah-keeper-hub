import { type ReactNode } from "react";
import type { BorrowStatus } from "@/lib/types";
import { useI18n, type translations } from "@/lib/i18n";

const styles: Record<BorrowStatus, string> = {
  Borrowed: "bg-primary/12 text-primary",
  Reading: "bg-gold/20 text-gold-foreground dark:text-gold",
  Returned: "bg-success/15 text-success",
  Overdue: "bg-destructive/12 text-destructive",
};

export function StatusBadge({ status }: { status: BorrowStatus }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {t(status as keyof typeof translations)}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      {icon && <div className="mb-3 text-muted-foreground/60">{icon}</div>}
      <p className="font-medium text-muted-foreground">{title}</p>
      {hint && <div className="mt-3">{hint}</div>}
    </div>
  );
}
