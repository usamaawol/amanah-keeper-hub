import { BookOpenText } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="grid size-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
        <BookOpenText className="size-5" />
      </div>
      <span className="text-lg font-bold tracking-tight">Amanah</span>
    </div>
  );
}
