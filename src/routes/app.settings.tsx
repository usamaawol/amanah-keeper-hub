import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";
import { seedDemoData } from "@/lib/seed";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Amanah Library System" }] }),
  component: Settings,
});

function Settings() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, isSuperAdmin, updateAccount } = useAuth();
  const qc = useQueryClient();
  const [s, setS] = useState(getSettings());

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [libName, setLibName] = useState(user?.libraryName ?? "");
  const [showSavedPassword, setShowSavedPassword] = useState(false);

  const saveProfile = async () => {
    await updateAccount({ displayName, libraryName: libName });
    toast.success(t("saved"));
  };

  const save = () => {
    saveSettings(s);
    toast.success(t("saved"));
  };

  const seed = async () => {
    await seedDemoData(user!.libraryId!);
    qc.invalidateQueries();
    toast.success(t("saved"));
  };

  const setupItems: { key: Parameters<typeof t>[0]; required: boolean }[] = [
    { key: "setupFirebaseProject", required: true },
    { key: "setupFirebaseAuth", required: true },
    { key: "setupFirestore", required: true },
    { key: "setupEnvVars", required: true },
    { key: "setupOpenRouter", required: false },
    { key: "setupFutureAi", required: false },
  ];

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title={t("settings")} />

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">{t("myAccount")}</h2>
        <div className="space-y-1.5">
          <Label>{t("userName")}</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("libraryName")}</Label>
          <Input value={libName} onChange={(e) => setLibName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("emailReadOnly")}</Label>
          <Input value={user?.email ?? ""} readOnly disabled />
        </div>
        <Button onClick={saveProfile} className="bg-gradient-primary">
          {t("save")}
        </Button>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Saved Login</h2>
        <p className="text-sm text-muted-foreground">Save your credentials here for quicker sign-in next time.</p>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input
            type="email"
            value={s.savedEmail ?? ""}
            onChange={(e) => setS({ ...s, savedEmail: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <div className="relative">
            <Input
              type={showSavedPassword ? "text" : "password"}
              value={s.savedPassword ?? ""}
              onChange={(e) => setS({ ...s, savedPassword: e.target.value })}
              placeholder="••••••••"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowSavedPassword(!showSavedPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSavedPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        <Button onClick={save} className="bg-gradient-primary">
          {t("save")}
        </Button>
      </section>



      {isSuperAdmin && (
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">{t("setupTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("setupIntro")}</p>
        <ul className="space-y-2">
          {setupItems.map((it) => (
            <li key={it.key} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-primary" />
              <span className="flex-1 text-sm">{t(it.key)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  it.required ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {it.required ? t("setupRequired") : t("setupOptional")}
              </span>
            </li>
          ))}
        </ul>
      </section>
      )}


      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">{t("appearance")}</h2>
        <div className="flex items-center justify-between">
          <Label>{t("theme")}</Label>
          <div className="flex gap-2">
            <Button size="sm" variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
              {t("light")}
            </Button>
            <Button size="sm" variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
              {t("dark")}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label>{t("language")}</Label>
          <div className="flex gap-2">
            <Button size="sm" variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>
              English
            </Button>
            <Button size="sm" variant={lang === "ar" ? "default" : "outline"} onClick={() => setLang("ar")}>
              العربية
            </Button>
            <Button size="sm" variant={lang === "om" ? "default" : "outline"} onClick={() => setLang("om")}>
              Oromoo
            </Button>
          </div>
        </div>
      </section>

      {isSuperAdmin && (
      <>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">{t("aiAssistant")}</h2>
        <div className="space-y-1.5">
          <Label>{t("apiKeyLabel")}</Label>
          <Input type="password" value={s.openRouterKey} onChange={(e) => setS({ ...s, openRouterKey: e.target.value })} placeholder="sk-or-..." />
        </div>
        <div className="space-y-1.5">
          <Label>{t("apiModelLabel")}</Label>
          <Input value={s.aiModel} onChange={(e) => setS({ ...s, aiModel: e.target.value })} placeholder="openai/gpt-4o-mini" />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">{t("libraryName")} & Firebase</h2>
        <div className="space-y-1.5">
          <Label>{t("libraryName")}</Label>
          <Input value={s.libraryName} onChange={(e) => setS({ ...s, libraryName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("firebaseLabel")}</Label>
          <Textarea rows={4} value={s.firebaseConfig} onChange={(e) => setS({ ...s, firebaseConfig: e.target.value })} placeholder='{"apiKey":"...","authDomain":"...","projectId":"..."}' />
          <p className="text-xs text-muted-foreground">{t("envNote")}</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} className="bg-gradient-primary">
          {t("save")}
        </Button>
        <Button onClick={seed} variant="outline">
          {t("seedDemo")}
        </Button>
      </div>
      </>
      )}
    </div>
  );
}
