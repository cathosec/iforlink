/**
 * Painel Overview do ForLink Analytics (Fase 4).
 * Gráficos e rankings baseados em RPCs SECURITY DEFINER (Pro/Admin only).
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type TSPoint = { ts: string; views: number; visitors: number };
type BreakdownRow = { bucket: string; views: number; visitors: number };
type TopPageRow = { path: string; title: string | null; views: number; visitors: number };
type TopEventRow = { name: string; total: number; sessions: number };

type Props = {
  path: string | null;
  since: string;
  until: string;
  bucket: "hour" | "day";
  onBucketChange: (b: "hour" | "day") => void;
};

export function OverviewPanel({ path, since, until, bucket, onBucketChange }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Visitas ao longo do tempo</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {path ? `Página ${path}` : "Todas as páginas com acesso"}
            </p>
          </div>
          <Select value={bucket} onValueChange={(v) => onBucketChange(v as "hour" | "day")}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Por hora</SelectItem>
              <SelectItem value="day">Por dia</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <TimeseriesChart path={path} since={since} until={until} bucket={bucket} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {!path && (
          <TopPagesCard since={since} until={until} />
        )}
        <BreakdownCard title="Referrers" dimension="referrer" path={path} since={since} until={until} />
        <BreakdownCard title="Dispositivos" dimension="device_type" path={path} since={since} until={until} />
        <BreakdownCard title="Navegadores" dimension="browser_family" path={path} since={since} until={until} />
        <BreakdownCard title="Sistemas" dimension="os_family" path={path} since={since} until={until} />
        <BreakdownCard title="Países" dimension="country" path={path} since={since} until={until} />
        <BreakdownCard title="UTM Source" dimension="utm_source" path={path} since={since} until={until} />
        <BreakdownCard title="UTM Campaign" dimension="utm_campaign" path={path} since={since} until={until} />
        <TopEventsCard path={path} since={since} until={until} />
      </div>
    </div>
  );
}

function TimeseriesChart({ path, since, until, bucket }: { path: string | null; since: string; until: string; bucket: "hour" | "day" }) {
  const q = useQuery({
    queryKey: ["analytics_timeseries", path, since, until, bucket],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_timeseries" as never, {
        _path: path, _since: since, _until: until, _bucket: bucket,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as TSPoint[];
    },
  });

  const points = useMemo(() => (q.data ?? []).map((p) => ({
    ts: new Date(p.ts).getTime(),
    label: formatTs(p.ts, bucket),
    views: Number(p.views ?? 0),
    visitors: Number(p.visitors ?? 0),
  })), [q.data, bucket]);

  if (q.isLoading) {
    return <div className="grid h-64 place-items-center text-xs text-muted-foreground">Carregando…</div>;
  }
  if (q.isError) {
    return <div className="grid h-64 place-items-center text-xs text-destructive">Falha ao carregar série.</div>;
  }
  if (points.length === 0) {
    return <div className="grid h-64 place-items-center text-xs text-muted-foreground">Sem dados no período.</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="grad-views" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-visitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(160 70% 45%)" stopOpacity={0.30} />
              <stop offset="100%" stopColor="hsl(160 70% 45%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          />
          <Area type="monotone" dataKey="views" name="Visitas" stroke="hsl(var(--primary))" fill="url(#grad-views)" strokeWidth={2} />
          <Area type="monotone" dataKey="visitors" name="Visitantes" stroke="hsl(160 70% 45%)" fill="url(#grad-visitors)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function BreakdownCard({
  title, dimension, path, since, until,
}: { title: string; dimension: string; path: string | null; since: string; until: string }) {
  const q = useQuery({
    queryKey: ["analytics_breakdown", dimension, path, since, until],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_breakdown" as never, {
        _dimension: dimension, _path: path, _since: since, _until: until, _limit: 10,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as BreakdownRow[];
    },
  });

  const rows = q.data ?? [];
  const max = rows.reduce((m, r) => Math.max(m, Number(r.views)), 0) || 1;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {q.isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Sem dados.</div>
        ) : rows.map((r) => {
          const label = prettifyBucket(dimension, r.bucket);
          const pct = (Number(r.views) / max) * 100;
          return (
            <div key={r.bucket} className="group">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate" title={label}>{label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Number(r.views).toLocaleString("pt-BR")}
                  <span className="ml-1 text-[10px]">· {Number(r.visitors).toLocaleString("pt-BR")} vis.</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TopPagesCard({ since, until }: { since: string; until: string }) {
  const q = useQuery({
    queryKey: ["analytics_top_pages", since, until],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_top_pages" as never, {
        _since: since, _until: until, _limit: 12,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as TopPageRow[];
    },
  });

  const rows = q.data ?? [];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Páginas mais vistas</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {q.isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Sem dados.</div>
        ) : rows.map((r) => (
          <div key={r.path} className="flex items-center justify-between gap-2 border-b border-border/50 py-1 text-xs last:border-b-0">
            <div className="min-w-0 truncate">
              <span className="font-mono">{r.path}</span>
              {r.title ? <span className="ml-2 text-muted-foreground">· {r.title}</span> : null}
            </div>
            <span className="whitespace-nowrap tabular-nums text-muted-foreground">
              {Number(r.views).toLocaleString("pt-BR")} · {Number(r.visitors).toLocaleString("pt-BR")} vis.
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TopEventsCard({ path, since, until }: { path: string | null; since: string; until: string }) {
  const q = useQuery({
    queryKey: ["analytics_top_events", path, since, until],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_top_events" as never, {
        _path: path, _since: since, _until: until, _limit: 12,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as TopEventRow[];
    },
  });

  const rows = q.data ?? [];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Eventos personalizados</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {q.isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Nenhum evento registrado.</div>
        ) : rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-2 border-b border-border/50 py-1 text-xs last:border-b-0">
            <Badge variant="secondary" className="font-mono text-[10px]">{r.name}</Badge>
            <span className="whitespace-nowrap tabular-nums text-muted-foreground">
              {Number(r.total).toLocaleString("pt-BR")} · {Number(r.sessions).toLocaleString("pt-BR")} sess.
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function prettifyBucket(dim: string, v: string): string {
  if (!v || v === "(unknown)") return "(desconhecido)";
  if (dim === "referrer") {
    try { return new URL(v).hostname.replace(/^www\./, ""); } catch { return v; }
  }
  return v;
}

function formatTs(iso: string, bucket: "hour" | "day"): string {
  const d = new Date(iso);
  if (bucket === "hour") {
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
