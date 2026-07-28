import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Heatmap, type HeatmapPoint } from "@/lib/analytics/heatmap";
import { SessionPlayer, formatDuration, formatRelative } from "@/lib/analytics/session-player";
import { OverviewPanel } from "@/lib/analytics/overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Crown, Eye, Film, LineChart, MousePointerClick, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { PrivacyPanel } from "@/lib/analytics/privacy";


export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — ForLink" },
      { name: "description", content: "Mapas de calor, cliques e comportamento dos visitantes na sua página ForLink." },
      { property: "og:title", content: "Analytics — ForLink" },
      { property: "og:description", content: "Mapas de calor e insights de comportamento para páginas ForLink." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = [
  { key: "24h", label: "Últimas 24h", ms: 24 * 60 * 60 * 1000 },
  { key: "7d",  label: "Últimos 7 dias", ms: 7  * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "Últimos 30 dias", ms: 30 * 24 * 60 * 60 * 1000 },
];

type PageRow = {
  path: string;
  title: string | null;
  owner_user_id: string | null;
  views_count: number;
  last_seen: string | null;
};

type SummaryData = {
  views: number;
  visitors: number;
  clicks: number;
  moves: number;
  avg_duration_ms: number;
  scroll: Record<string, number>;
};

function AnalyticsPage() {
  const { role, profile } = useAuth();
  const [rangeKey, setRangeKey] = useState<string>("7d");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [layer, setLayer] = useState<"all" | "clicks" | "moves">("all");
  const [bucket, setBucket] = useState<"hour" | "day">("day");

  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1];
  const since = useMemo(() => new Date(Date.now() - range.ms).toISOString(), [range]);
  const until = useMemo(() => new Date().toISOString(), [rangeKey]);

  // Free não tem acesso — bloqueio hard no componente
  if (role === "free") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card className="border-brand/30 bg-gradient-to-br from-brand/5 via-card to-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-brand" />
              <CardTitle>Analytics é um recurso Pro</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mapas de calor, cliques agregados e comportamento dos visitantes estão disponíveis
              apenas nas contas <strong>Pro</strong>. Assine para ver como as pessoas realmente
              usam a sua página ForLink.
            </p>
            <div className="flex gap-2">
              <Button asChild><Link to="/assinar">Fazer upgrade para Pro</Link></Button>
              <Button asChild variant="outline"><Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enquanto o role ainda não resolveu, evita flash
  if (!role) return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <Header role={role} />

      <PageSelector
        role={role}
        selectedPath={selectedPath}
        onSelect={setSelectedPath}
        defaultPath={profile?.username ? `/${profile.username}` : null}
      />

      <div className="mt-6 space-y-6">
        {selectedPath && <SummaryCards path={selectedPath} since={since} until={until} />}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" className="gap-1.5">
              <LineChart className="h-3.5 w-3.5" /> Visão geral
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="gap-1.5" disabled={!selectedPath}>
              <BarChart3 className="h-3.5 w-3.5" /> Mapa de calor
            </TabsTrigger>
            <TabsTrigger value="replay" className="gap-1.5" disabled={!selectedPath}>
              <Film className="h-3.5 w-3.5" /> Gravações
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Privacidade
            </TabsTrigger>
          </TabsList>


          <TabsContent value="overview" className="mt-4">
            <div className="mb-3 flex items-center justify-end">
              <Select value={rangeKey} onValueChange={setRangeKey}>
                <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{RANGES.map((r) => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <OverviewPanel
              path={selectedPath}
              since={since}
              until={until}
              bucket={bucket}
              onBucketChange={setBucket}
            />
          </TabsContent>

          <TabsContent value="heatmap" className="mt-4">
            {selectedPath ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-base">Mapa de calor — {selectedPath}</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Cliques (com peso maior) e movimentos do mouse agregados. Coordenadas normalizadas por viewport.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={rangeKey} onValueChange={setRangeKey}>
                      <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{RANGES.map((r) => (
                        <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                      ))}</SelectContent>
                    </Select>
                    <Select value={layer} onValueChange={(v) => setLayer(v as typeof layer)}>
                      <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Cliques + Mouse</SelectItem>
                        <SelectItem value="clicks">Só cliques</SelectItem>
                        <SelectItem value="moves">Só movimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <HeatmapView
                    path={selectedPath}
                    since={since}
                    until={until}
                    showClicks={layer !== "moves"}
                    showMoves={layer !== "clicks"}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Selecione uma página acima.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="replay" className="mt-4">
            {selectedPath ? (
              <ReplayPanel path={selectedPath} since={since} rangeLabel={range.label} />
            ) : (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Selecione uma página acima.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="privacy" className="mt-4">
            <PrivacyPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

}



function Header({ role }: { role: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand" />
          <h1 className="text-lg font-semibold sm:text-xl">Analytics</h1>
          {role === "admin" ? (
            <Badge className="bg-amber-500/10 text-[10px] font-semibold uppercase text-amber-600 hover:bg-amber-500/15">Super admin</Badge>
          ) : (
            <Badge className="bg-brand/10 text-[10px] font-semibold uppercase text-brand hover:bg-brand/15">Pro</Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {role === "admin"
            ? "Acesso a todas as páginas do ForLink."
            : "Você vê apenas as páginas que são suas."}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao painel</Link>
      </Button>
    </div>
  );
}

function PageSelector({
  role, selectedPath, onSelect, defaultPath,
}: {
  role: string;
  selectedPath: string | null;
  onSelect: (p: string) => void;
  defaultPath: string | null;
}) {
  const query = useQuery({
    queryKey: ["analytics_my_pages"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_my_pages" as never, { _limit: 200 } as never);
      if (error) throw error;
      return (data ?? []) as unknown as PageRow[];
    },
  });

  const pages = query.data ?? [];

  // Auto-seleciona a página do usuário na primeira carga
  useMemo(() => {
    if (selectedPath || pages.length === 0) return;
    const own = defaultPath ? pages.find((p) => p.path === defaultPath) : null;
    onSelect((own ?? pages[0]).path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length]);

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Página</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {query.isLoading ? (
          <div className="text-xs text-muted-foreground">Carregando páginas...</div>
        ) : query.isError ? (
          <div className="text-xs text-destructive">Não foi possível carregar as páginas.</div>
        ) : pages.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            Nenhuma visita registrada ainda. Compartilhe sua página para começar a coletar dados.
          </div>
        ) : (
          <>
            <Select value={selectedPath ?? undefined} onValueChange={onSelect}>
              <SelectTrigger className="h-9 w-full max-w-sm text-sm">
                <SelectValue placeholder="Selecione uma página" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {pages.map((p) => (
                  <SelectItem key={p.path} value={p.path}>
                    <span className="mr-2 font-mono text-xs">{p.path}</span>
                    <span className="text-muted-foreground">· {p.views_count} views</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {role === "admin" && (
              <span className="text-[11px] text-muted-foreground">{pages.length} páginas no total</span>
            )}
            <Button size="icon" variant="ghost" onClick={() => query.refetch()} title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryCards({ path, since, until }: { path: string; since: string; until: string }) {
  const q = useQuery({
    queryKey: ["analytics_summary", path, since, until],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_page_summary" as never, {
        _path: path, _since: since, _until: until,
      } as never);
      if (error) throw error;
      return data as unknown as SummaryData;
    },
    enabled: !!path,
  });

  const s = q.data;
  const items = [
    { label: "Visualizações", value: s?.views ?? 0, icon: Eye, color: "text-brand" },
    { label: "Visitantes únicos", value: s?.visitors ?? 0, icon: Users, color: "text-emerald-500" },
    { label: "Cliques", value: s?.clicks ?? 0, icon: MousePointerClick, color: "text-amber-500" },
    { label: "Tempo médio (s)", value: Math.round((s?.avg_duration_ms ?? 0) / 1000), icon: BarChart3, color: "text-rose-500" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="border-border/70">
          <CardContent className="flex items-center gap-3 p-4">
            <span className={`grid h-9 w-9 place-items-center rounded-lg bg-muted ${it.color}`}>
              <it.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{it.label}</div>
              <div className="text-lg font-semibold tabular-nums">
                {q.isLoading ? "…" : it.value.toLocaleString("pt-BR")}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HeatmapView({
  path, since, until, showClicks, showMoves,
}: {
  path: string; since: string; until: string;
  showClicks: boolean; showMoves: boolean;
}) {
  const q = useQuery({
    queryKey: ["analytics_heatmap", path, since, until],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_heatmap" as never, {
        _path: path, _since: since, _until: until, _limit: 5000,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as HeatmapPoint[];
    },
    enabled: !!path,
  });

  if (q.isLoading) {
    return <div className="grid aspect-video place-items-center rounded-xl border bg-muted/30 text-xs text-muted-foreground">Carregando pontos…</div>;
  }
  if (q.isError) {
    const msg = q.error instanceof Error ? q.error.message : "Falha ao carregar";
    return <div className="grid aspect-video place-items-center rounded-xl border bg-destructive/10 p-4 text-center text-xs text-destructive">{msg}</div>;
  }

  return <Heatmap points={q.data ?? []} showClicks={showClicks} showMoves={showMoves} />;
}

// ─── Session Replay ───────────────────────────────────────────────
type RecordingRow = {
  session_id: string;
  path: string;
  title: string | null;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  events_count: number;
  chunks: number;
  viewport_w: number | null;
  viewport_h: number | null;
};

function ReplayPanel({ path, since, rangeLabel }: { path: string; since: string; rangeLabel: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["analytics_list_recordings", path, since],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_list_recordings" as never, {
        _path: path, _since: since, _limit: 100,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as RecordingRow[];
    },
    enabled: !!path,
  });

  const rows = q.data ?? [];
  const activeId = selected ?? rows[0]?.session_id ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="max-h-[540px] overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm">Sessões gravadas</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{rangeLabel} · {rows.length} sessões</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => q.refetch()} title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[460px] overflow-y-auto">
            {q.isLoading ? (
              <div className="p-4 text-xs text-muted-foreground">Carregando…</div>
            ) : q.isError ? (
              <div className="p-4 text-xs text-destructive">{q.error instanceof Error ? q.error.message : "Falha"}</div>
            ) : rows.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">
                Nenhuma gravação neste período. As gravações começam a aparecer alguns segundos após novas visitas.
              </div>
            ) : rows.map((r) => {
              const isActive = r.session_id === activeId;
              return (
                <button
                  key={r.session_id}
                  onClick={() => setSelected(r.session_id)}
                  className={`w-full border-b px-3 py-2.5 text-left text-xs transition-colors last:border-b-0 ${
                    isActive ? "bg-brand/10 text-foreground" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium tabular-nums">{formatDuration(r.duration_ms)}</span>
                    <span className="text-[10px] text-muted-foreground">{formatRelative(r.started_at)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {r.events_count} eventos · {r.chunks} chunks
                    {r.viewport_w ? ` · ${r.viewport_w}×${r.viewport_h}` : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {activeId ? `Reproduzindo sessão ${activeId.slice(0, 8)}…` : "Selecione uma sessão"}
          </CardTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Reprodução DOM com máscara automática de inputs, senhas, e-mails e blocos marcados como sensíveis.
          </p>
        </CardHeader>
        <CardContent>
          {activeId ? (
            <SessionPlayer sessionId={activeId} />
          ) : (
            <div className="grid aspect-video w-full place-items-center rounded-xl border bg-muted/30 text-xs text-muted-foreground">
              Selecione uma sessão na lista ao lado para começar a reprodução.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
