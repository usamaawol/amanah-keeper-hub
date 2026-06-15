import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useAuth, AccountExistsError } from "@/lib/auth";
import { useOnline } from "@/lib/store";
import { getSettings } from "@/lib/settings";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — Amanah Library System" }] }),
  component: Login,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
  const { t } = useI18n();
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const online = useOnline();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const settings = getSettings();
  const [email, setEmail] = useState(settings.savedEmail ?? "");
  const [password, setPassword] = useState(settings.savedPassword ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [libraryName, setLibraryName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") navigate({ to: "/app/dashboard" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || (mode === "signup" && !libraryName.trim())) {
      toast.error(t("fillAllFields"));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      toast.error(t("invalidEmail"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email.trim(), password, libraryName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof AccountExistsError) {
        toast.error(t("accountExists"));
        setMode("signin");
        setLibraryName("");
      } else {
        toast.error(t("aiError"));
      }
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      toast.error(t("aiError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicLayout>
      <section className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 md:py-24">
        <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-elegant">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <ShieldCheck className="size-7" />
          </div>

          {/* Offline banner */}
          {!online && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              <WifiOff className="size-4 shrink-0" />
              <span>You are offline. Connect to the internet to sign in.</span>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? t("signInTab") : t("signUpTab")}
              </button>
            ))}
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signup" ? t("signUpDesc") : t("signInEmailDesc")}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3 text-start">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label>{t("libraryName")}</Label>
                <Input
                  value={libraryName}
                  onChange={(e) => setLibraryName(e.target.value)}
                  placeholder={t("libraryNamePlaceholder")}
                  autoComplete="organization"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("password")}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={busy || !online} className="w-full bg-gradient-primary">
              {mode === "signup" ? t("createAccount") : t("signIn")}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("orContinueWith")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button onClick={google} disabled={busy || !online} size="lg" variant="outline" className="w-full">
            <GoogleIcon /> {t("signInGoogle")}
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
