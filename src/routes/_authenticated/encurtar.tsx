import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Trash2, ExternalLink, Link2, MousePointerClick, Scissors, ArrowLeft, Sparkles } from "lucide-react";
import { normalizeUrl } from "@/lib/favicon";

export const Route = createFileRoute("/_authenticated/encurtar")({
  component: ShortenerPage,
  head: () => ({
    meta: [
      { title: "Encurtador de links · ForLink" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

interface ShortLink {
  id: string;
  code: string;
  url: string;
  clicks_count: number;
  created_at: string;
}

// Alfabeto sem caracteres ambíguos (0/O, 1/l/I)
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const genCode = (len = 6) =>
  Array.from({ length: len }, () =>
    ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("");

function ShortenerPage() {
  const { user, role, loading } = useAuth();
  const qc = useQueryClient();
  const [longUrl, setLongUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [creating, setCreating] = useState(false);
  const isPro = role === "pro" || role === "admin";

  if (!loading && !isPro) return <UpgradeGate />;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://forlink.app";

  const linksQ = useQuery({
    queryKey: ["short-links", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("short_links")
        .select("id,code,url,clicks_count,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as ShortLink[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["short-links", user?.id] });

  const create = async () => {
    if (!user) return;
    const trimmed = longUrl.trim();
    if (!trimmed) {
      toast.error("Informe o link a encurtar");
      return;
    }
    const url = normalizeUrl(trimmed);
    try { new URL(url); } catch {
      toast.error("URL inválida");
      return;
    }

    let code = customCode.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (customCode && (code.length < 3 || code.length > 32)) {
      toast.error("O código personalizado deve ter entre 3 e 32 caracteres");
      return;
    }

    setCreating(true);
    try {
      // Tenta até 5 vezes se o código gerado colidir
      for (let attempt = 0; attempt < 5; attempt++) {
        const useCode = code || genCode(6 + Math.floor(attempt / 2));
        const { error } = await supabase
          .from("short_links")
          .insert({ code: useCode, url, user_id: user.id });
        if (!error) {
          toast.success("Link encurtado!");
          await navigator.clipboard.writeText(`${origin}/s/${useCode}`).catch(() => {});
          setLongUrl("");
          setCustomCode("");
          refresh();
          return;
        }
        // Colisão no unique — só re-tenta se foi código gerado
        if (customCode) {
          toast.error("Esse código já está em uso. Escolha outro.");
          return;
        }
      }
      toast.error("Não foi possível gerar um código único. Tente novamente.");
    } finally {
      setCreating(false);
    }
  };

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(`${origin}/s/${code}`);
    toast.success("Link curto copiado!");
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este encurtador? O link curto deixará de funcionar.")) return;
    const { error } = await supabase.from("short_links").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluído");
    refresh();
  };

  const links = linksQ.data ?? [];
  const totalClicks = links.reduce((n, l) => n + l.clicks_count, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao painel
        </Link>

        <header className="mb-6">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand">
              <Scissors className="h-4 w-4" />
            </span>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Encurtador de links</h1>
          </div>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Gere URLs curtas no domínio <span className="font-medium text-foreground">forlink.app/s/</span>.
            O redirecionamento é <span className="font-medium text-foreground">permanente (301)</span>,
            então toda a autoridade e SEO são transferidos para o link original.
          </p>
        </header>

        {/* Formulário */}
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div>
              <Label htmlFor="long-url">Link para encurtar</Label>
              <Input
                id="long-url"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                placeholder="https://exemplo.com/um-link-muito-longo/..."
                className="mt-1.5"
                onKeyDown={(e) => e.key === "Enter" && void create()}
              />
            </div>
            <div>
              <Label htmlFor="custom-code">Código (opcional)</Label>
              <div className="mt-1.5 flex items-stretch overflow-hidden rounded-md border">
                <span className="flex items-center bg-muted px-2 text-[11px] text-muted-foreground">
                  /s/
                </span>
                <Input
                  id="custom-code"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="auto"
                  className="border-0 shadow-none focus-visible:ring-0"
                  maxLength={32}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {customCode ? "Código personalizado — 3 a 32 caracteres (a-z, 0-9, -)" : "Deixe em branco para gerar automaticamente"}
            </p>
            <Button
              onClick={() => void create()}
              disabled={creating || !longUrl.trim()}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Scissors className="mr-2 h-4 w-4" />
              {creating ? "Encurtando..." : "Encurtar"}
            </Button>
          </div>
        </Card>

        {/* Estatísticas */}
        {links.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Link2 className="h-3 w-3" /> Encurtadores
              </div>
              <div className="mt-1 font-display text-xl font-semibold tabular-nums">{links.length}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <MousePointerClick className="h-3 w-3" /> Cliques totais
              </div>
              <div className="mt-1 font-display text-xl font-semibold tabular-nums">
                {totalClicks.toLocaleString("pt-BR")}
              </div>
            </Card>
          </div>
        )}

        {/* Lista */}
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Meus encurtadores
          </h2>

          {linksQ.isLoading ? (
            <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : links.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <Scissors className="mx-auto h-6 w-6 text-muted-foreground/60" />
              <p className="mt-2 text-sm text-muted-foreground">Nenhum link encurtado ainda.</p>
            </div>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {links.map((l) => {
                const shortUrl = `${origin}/s/${l.code}`;
                return (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 p-3 sm:p-4"
                  >
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <code className="truncate rounded bg-muted px-1.5 py-0.5 text-[12px] font-medium text-brand">
                          /s/{l.code}
                        </code>
                        <span className="hidden shrink-0 items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground sm:inline-flex">
                          <MousePointerClick className="h-2.5 w-2.5" />
                          {l.clicks_count.toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div
                        className="mt-1 truncate text-[11px] text-muted-foreground"
                        title={l.url}
                      >
                        → {l.url}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void copy(l.code)}
                        title="Copiar link curto"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <a href={shortUrl} target="_blank" rel="noopener noreferrer" title="Abrir">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void remove(l.id)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function UpgradeGate() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao painel
        </Link>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-brand/10 via-brand/5 to-transparent p-8 sm:p-10">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand">
              <Sparkles className="h-3 w-3" /> Recurso Pro
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand text-white">
                <Scissors className="h-5 w-5" />
              </span>
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Encurtador de links
              </h1>
            </div>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">
              O encurtador <span className="font-medium text-foreground">forlink.app/s/</span> está disponível
              apenas para assinantes do plano <span className="font-medium text-foreground">Pro</span>.
              Redirecionamentos <span className="font-medium text-foreground">301 permanentes</span> preservam todo
              o SEO do link de destino.
            </p>

            <ul className="mt-6 space-y-2 text-sm">
              {[
                "URLs curtas com código automático ou personalizado",
                "Redirecionamento 301 com header canonical",
                "Contador de cliques em tempo real",
                "Sem anúncios em nenhum link",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-2">
              <Link to="/assinar">
                <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
                  <Sparkles className="mr-2 h-4 w-4" /> Fazer upgrade para Pro
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline">Voltar ao painel</Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
