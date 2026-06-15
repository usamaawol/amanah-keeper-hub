import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Database, Languages, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Amanah Library System" },
      {
        name: "description",
        content:
          "Amanah is a closed, offline-first Islamic library system that tracks borrowed and reserved books and keeps a permanent history.",
      },
      { property: "og:title", content: "About — Amanah Library System" },
      { property: "og:description", content: "Closed, offline-first Islamic library management." },
    ],
  }),
  component: About,
});

function About() {
  const { t } = useI18n();
  const points = [
    { icon: Database, title: t("featOffline"), desc: t("featOfflineDesc") },
    { icon: BookOpen, title: t("featHistory"), desc: t("featHistoryDesc") },
    { icon: Languages, title: t("language"), desc: "English & العربية with full RTL support." },
    { icon: ShieldCheck, title: t("featAi"), desc: t("featAiDesc") },
  ];
  return (
    <PublicLayout>
      <section className="mx-auto w-full max-w-3xl px-4 py-14 md:py-20">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t("aboutTitle")}</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{t("aboutBody")}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {points.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="grid size-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
                <p.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
