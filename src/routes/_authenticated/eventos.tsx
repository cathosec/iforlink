import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/eventos")({
  component: EventosPage,
  head: () => ({
    meta: [
      { title: "Eventos • Admin • ForLink" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type EventRow = {
  id: string;
  type: string;
  level: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

const LEVEL_COLOR: Record<string, string> = {
  debug: "bg-slate-100 text-slate-700",
  info: "bg-blue-100 text-blue-700",
  warn: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-700",
};

function EventosPage() {
  const [filterType, setFilterType] = useState("");
  const [filterTarget, setFilterTarget] = useState("");

  const q = useQuery({
    queryKey: ["event_log", filterType, filterTarget],
    queryFn: async () => {
      let query = supabase
        .from("event_log" as never)
        .select("id,type,level,actor_id,target_type,target_id,payload,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filterType.trim()) query = query.ilike("type", `%${filterType.trim()}%`);
      if (filterTarget.trim()) query = query.eq("target_id", filterTarget.trim());
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
    refetchInterval: 15000,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Voltar ao admin
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Eventos do sistema</h1>
          <p className="text-sm text-muted-foreground">
            Últimos 200 eventos. Atualização automática a cada 15s.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Filtrar por tipo</label>
            <Input placeholder="ex: payment, webhook, oauth" value={filterType} onChange={(e) => setFilterType(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Filtrar por target_id</label>
            <Input placeholder="uuid ou ID externo" value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2">Nível</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {q.isLoading && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {q.error && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-red-600">
                  {(q.error as Error).message || "Falha ao carregar eventos"}
                </td></tr>
              )}
              {q.data && q.data.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nenhum evento encontrado.</td></tr>
              )}
              {q.data?.map((ev) => (
                <tr key={ev.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={LEVEL_COLOR[ev.level] ?? LEVEL_COLOR.info} variant="secondary">
                      {ev.level}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{ev.type}</td>
                  <td className="px-3 py-2 text-xs">
                    {ev.target_type ? (
                      <div>
                        <div className="text-muted-foreground">{ev.target_type}</div>
                        <div className="font-mono">{ev.target_id}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted/50 p-2 text-[11px] leading-tight">
                      {JSON.stringify(ev.payload, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
