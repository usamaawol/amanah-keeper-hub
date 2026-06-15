import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Sparkles, Users, WifiOff } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Amanah Library System — Islamic Library Management" },
      {
        name: "description",
        content:
          "Track borrowed Islamic books, reservations and readers offline, with an AI assistant grounded in your own library data.",
      },
      { property: "og:title", content: "Amanah Library System" },
      {
        property: "og:description",
        content: "Offline-first Islamic library management with AI assistant.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { t } = useI18n();
  const features = [
    { icon: WifiOff, title: t("featOffline"), desc: t("featOfflineDesc") },
    { icon: Sparkles, title: t("featAi"), desc: t("featAiDesc") },
    { icon: BookOpen, title: t("featQueue"), desc: t("featQueueDesc") },
    { icon: Users, title: t("featHistory"), desc: t("featHistoryDesc") },
  ];

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pattern-islamic absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <Sparkles className="size-3.5 text-gold" /> {t("appTagline")}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground md:text-lg">{t("heroSubtitle")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-primary shadow-elegant">
                <Link to="/login">{t("getStarted")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/about">{t("learnMore")}</Link>
              </Button>
            </div>
          </div>
          <div className="animate-scale-in">
            <div className="overflow-hidden rounded-3xl border border-border shadow-elegant">
              <img src={heroImg} alt={t("appName")} className="h-full w-full object-cover" loading="eager" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 md:py-20">
        <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">{t("featuresTitle")}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-elegant"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="grid size-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero px-6 py-12 text-center text-primary-foreground md:py-16">
          <div className="pattern-islamic absolute inset-0 opacity-30" />
          <div className="relative">
            <h2 className="text-2xl font-bold md:text-3xl">{t("heroTitle")}</h2>
            <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80">{t("heroSubtitle")}</p>
            <Button asChild size="lg" variant="secondary" className="mt-6">
              <Link to="/login">{t("getStarted")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
