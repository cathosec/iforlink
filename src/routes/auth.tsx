import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendWelcomeEmail } from "@/lib/notifications.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check, ArrowLeft, Loader2, ShieldCheck, Mail, Inbox, RefreshCw } from "lucide-react";

import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

type Search = { username?: string; mode?: "signin" | "signup" };

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Entrar · ForLink" }, { name: "robots", content: "noindex,nofollow" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    username: typeof s.username === "string" ? s.username : undefined,
    mode: s.mode === "signup" || s.mode === "signin" ? s.mode : undefined,
  }),
});

function normalizeUsername(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function AuthPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? (search.username ? "signup" : "signin"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState(search.username ? normalizeUsername(search.username) : "");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  const fireWelcome = useServerFn(sendWelcomeEmail);
  useEffect(() => {
    if (session && !showConfirm) {
      // Best-effort welcome e-mail — Lovable dedupes via idempotency key.
      fireWelcome().catch(() => {});
      navigate({ to: "/dashboard" });
    }
  }, [session, navigate, showConfirm, fireWelcome]);

  const cleanUname = useMemo(() => normalizeUsername(username), [username]);
  const unameValid = cleanUname.length >= 3;

  // Live username availability check (debounced)
  useEffect(() => {
    if (mode !== "signup" || !unameValid) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    setAvailable(null);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUname)
        .maybeSingle();
      setAvailable(!data);
      setChecking(false);
    }, 400);
    return () => clearTimeout(t);
  }, [cleanUname, unameValid, mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!unameValid) throw new Error("Escolha um usuário com pelo menos 3 caracteres.");
        if (available === false) throw new Error("Este usuário já está em uso. Tente outro.");
        if (!acceptedTerms) throw new Error("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || cleanUname },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;

        // Try to claim the chosen username on the auto-created profile.
        if (data.user) {
          const { error: upErr } = await supabase
            .from("profiles")
            .update({ username: cleanUname, display_name: displayName || cleanUname })
            .eq("id", data.user.id);
          if (upErr && !/duplicate|unique/i.test(upErr.message)) {
            // Non-fatal; user can adjust in settings
            console.warn("Falha ao reservar username:", upErr.message);
          }
        }
        // Force confirmation flow: if Supabase returned a session (auto-confirm
        // or already-existing user), sign out so the user must click the link.
        if (data.session) {
          await supabase.auth.signOut();
        }
        setShowConfirm(true);
        toast.success("Conta criada! Verifique seu e-mail para ativar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao autenticar";
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha inválidos." : msg);
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      toast.success("E-mail de confirmação reenviado!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao reenviar";
      toast.error(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const freeFeatures = [
    "Perfil público em forlink.app/seu-usuario",
    "Até 15 links e 3 categorias",
    "Categorias privadas e públicas",
    "Favicon automático nos links",
    "Sincronização em todo dispositivo",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <Link to="/" aria-label="ForLink">
            <img src="/brand/wordmark-light.svg" alt="ForLink" className="h-6 w-auto" />
          </Link>
        </div>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          {/* Left · form or confirmation */}
          <div className="mx-auto w-full max-w-md lg:mx-0">
            {showConfirm ? (
              <Card className="p-6 sm:p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand">
                    <Mail className="h-8 w-8" />
                  </div>
                  <h1 className="mt-5 text-2xl font-semibold tracking-tight">
                    Confirme seu e-mail
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Enviamos um link de ativação para{" "}
                    <span className="font-medium text-foreground">{email}</span>.
                  </p>

                  <div className="mt-6 w-full rounded-lg border bg-muted/30 p-4 text-left">
                    <div className="flex items-start gap-3">
                      <Inbox className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Não recebeu?</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Verifique a pasta <strong>Spam</strong>, <strong>Lixo Eletrônico</strong>{" "}
                          ou <strong>Promoções</strong>. Alguns provedores de e-mail podem
                          classificar o link de ativação como promoção.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex w-full flex-col gap-3">
                    <Button
                      variant="outline"
                      onClick={resendConfirmation}
                      disabled={resendLoading}
                      className="w-full"
                    >
                      {resendLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Reenviando…
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" /> Reenviar e-mail
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowConfirm(false);
                        setMode("signin");
                      }}
                      className="w-full"
                    >
                      Já confirmou? Fazer login
                    </Button>
                  </div>

                  <p className="mt-6 text-xs text-muted-foreground">
                    O link expira em 24 horas. Se o e-mail estiver incorreto, crie uma nova conta.
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {/* Tabs */}
                <div className="mb-6 inline-flex rounded-md border bg-card p-1 text-sm">
                  {(["signup", "signin"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`rounded-[0.35rem] px-3 py-1.5 font-medium transition ${
                        mode === m
                          ? "bg-brand text-brand-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "signup" ? "Criar conta" : "Entrar"}
                    </button>
                  ))}
                </div>

                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {mode === "signin" ? "Bem-vindo de volta" : "Crie sua conta em segundos"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {mode === "signin"
                    ? "Acesse seu painel e continue de onde parou."
                    : "Grátis, para sempre. Sem cartão de crédito."}
                </p>

                <Card className="mt-6 p-6">
                  <form onSubmit={submit} className="space-y-4">
                    {mode === "signup" && (
                      <>
                        <div>
                          <Label htmlFor="uname">Seu link</Label>
                          <div className="mt-1.5 flex items-stretch overflow-hidden rounded-md border bg-background ring-brand/20 transition focus-within:border-brand focus-within:ring-2">
                            <span className="flex items-center whitespace-nowrap border-r bg-muted/50 px-3 text-sm text-muted-foreground">
                              forlink.app/
                            </span>
                            <Input
                              id="uname"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="seu-usuario"
                              autoComplete="off"
                              spellCheck={false}
                              className="h-10 flex-1 border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
                            />
                            <span className="flex w-9 items-center justify-center border-l bg-muted/30">
                              {checking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                              {!checking && available === true && <Check className="h-4 w-4 text-brand" />}
                              {!checking && available === false && <span className="text-xs font-semibold text-destructive">×</span>}
                            </span>
                          </div>
                          <p className="mt-1.5 min-h-[1.1rem] text-xs">
                            {!unameValid && username && <span className="text-muted-foreground">Mínimo 3 caracteres. Use letras, números e hífen.</span>}
                            {unameValid && available === false && <span className="text-destructive">Este usuário já está em uso.</span>}
                            {unameValid && available === true && <span className="text-brand">Disponível — será reservado após criar a conta.</span>}
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="name">Nome de exibição <span className="text-muted-foreground">(opcional)</span></Label>
                          <Input
                            id="name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Ana Ribeiro"
                            className="mt-1.5"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@email.com"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pw">Senha</Label>
                      <Input
                        id="pw"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="mt-1.5"
                      />
                    </div>

                    {mode === "signup" && (
                      <label className="flex cursor-pointer items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--brand))]"
                        />
                        <span>
                          Li e concordo com os{" "}
                          <Link to="/termos" className="text-brand underline hover:no-underline">Termos de Uso</Link>{" "}
                          e a{" "}
                          <Link to="/privacidade" className="text-brand underline hover:no-underline">Política de Privacidade</Link>{" "}
                          da ForLink (LGPD).
                        </span>
                      </label>
                    )}

                    <Button
                      type="submit"
                      disabled={loading || (mode === "signup" && (!unameValid || available === false || !acceptedTerms))}
                      className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Aguarde…</span>
                      ) : mode === "signin" ? (
                        "Entrar"
                      ) : (
                        "Criar conta grátis"
                      )}
                    </Button>

                    <p className="pt-1 text-center text-xs text-muted-foreground">
                      Protegido pela LGPD · Lei nº 13.709/2018
                    </p>
                  </form>
                </Card>
              </>
            )}
          </div>

          {/* Right · benefits */}
          <div className="hidden lg:block">
            <div className="rounded-xl border bg-card p-8">
              <div className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Plano Free
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                Comece grátis com tudo que importa
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sem cartão, sem período de teste que expira. Você só faz upgrade quando quiser mais.
              </p>

              <ul className="mt-6 space-y-3 text-sm">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-lg border bg-background p-4">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Pré-visualização
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">forlink.app/</span>
                  <span className="truncate font-semibold text-foreground">
                    {cleanUname || "seu-usuario"}
                  </span>
                </div>
              </div>

              <p className="mt-6 text-xs text-muted-foreground">
                Precisa de links ilimitados, selo verificado e estatísticas? Faça upgrade para o
                <span className="mx-1 font-medium text-foreground">Pro</span>
                pagando com PIX quando quiser.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
