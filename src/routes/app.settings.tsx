import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, MessageSquare } from "lucide-react";
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

import { pushUserProfileToCloud } from "@/lib/sync-client";
import { sendSupportMessage } from "@/lib/support";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Amanah Library System" }] }),
  component: Settings,
});

function Settings() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, isSuperAdmin, updateAccount } = useAuth();
  const [s, setS] = useState(getSettings());

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [libName, setLibName] = useState(user?.libraryName ?? "");
  const [showSavedPassword, setShowSavedPassword] = useState(false);

  // Contact Admin state
  const [adminMsg, setAdminMsg] = useState("");
  const [isSending, setIsSending] = useState(false);

  const saveProfile = async () => {
    await updateAccount({ displayName, libraryName: libName });
    toast.success(t("saved"));
  };

  const save = async () => {
    saveSettings(s);
    if (user?.uid) {
      await pushUserProfileToCloud(user.uid, user.libraryName || s.libraryName, {});
    }
    toast.success(t("saved"));
  };

  const handleContactAdmin = async () => {
    if (!adminMsg.trim()) return;
    setIsSending(true);
    try {
      // Use the centralized sendSupportMessage function
      await sendSupportMessage({
        name: user?.displayName ?? "Librarian",
        email: user?.email ?? "",
        category: "question",
        message: adminMsg.trim(),
        fromUid: user?.uid ?? null,
        libraryName: user?.libraryName ?? null,
      });
      toast.success(t("messageSent"));
      setAdminMsg("");
    } catch (err) {
      console.error(err);
      toast.error(t("messageError"));
    } finally {
      setIsSending(false);
    }
  };

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


      {!isSuperAdmin && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">{t("contactAdmin")}</h2>
          <div className="space-y-1.5">
            <Textarea
              value={adminMsg}
              onChange={(e) => setAdminMsg(e.target.value)}
              placeholder={t("messagePlaceholder")}
              rows={3}
            />
          </div>
          <Button 
            onClick={handleContactAdmin} 
            disabled={isSending || !adminMsg.trim()} 
            className="bg-gradient-primary gap-2"
          >
            <MessageSquare className="size-4" />
            {isSending ? t("loading") : t("sendMessage")}
          </Button>
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
    </div>
  );
}
