import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Copy, RefreshCw, Trash2, Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listMyCustomDomains,
  createMyCustomDomain,
  refreshCustomDomain,
  deleteMyCustomDomain,
} from "@/lib/custom-domains.functions";

type Status = "pending_dns" | "pending_ssl" | "active" | "failed" | "removed";

const STATUS_META: Record<Status, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  pending_dns: { label: "Aguardando DNS", variant: "secondary", icon: Loader2 },
  pending_ssl: { label: "Emitindo SSL", variant: "secondary", icon: Loader2 },
  active: { label: "Ativo", variant: "default", icon: CheckCircle2 },
  failed: { label: "Falha", variant: "destructive", icon: AlertCircle },
  removed: { label: "Removido", variant: "outline", icon: AlertCircle },
};

interface DomainRow {
  id: string;
  hostname: string;
  mode: string;
  path_prefix: string | null;
  status: Status;
  ssl_status: string | null;
  ownership_verification: Record<string, { name?: string; value?: string; http_url?: string; http_body?: string }> | null;
  last_error: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export function CustomDomainPanel({ isPro }: { isPro: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyCustomDomains);
  const createFn = useServerFn(createMyCustomDomain);
  const refreshFn = useServerFn(refreshCustomDomain);
  const deleteFn = useServerFn(deleteMyCustomDomain);

  const [hostname, setHostname] = useState("");

  const q = useQuery({
    queryKey: ["my-custom-domains"],
    queryFn: () => listFn(),
    enabled: isPro,
  });

  const createMut = useMutation({
    mutationFn: (h: string) => createFn({ data: { hostname: h } }),
    onSuccess: () => {
      toast.success("Domínio adicionado. Configure o DNS conforme instruções abaixo.");
      setHostname("");
      qc.invalidateQueries({ queryKey: ["my-custom-domains"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refreshMut = useMutation({
    mutationFn: (id: string) => refreshFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["my-custom-domains"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Domínio removido.");
      qc.invalidateQueries({ queryKey: ["my-custom-domains"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const domains = ((q.data?.domains ?? []) as unknown as DomainRow[]);
  const canAdd = isPro && domains.length === 0;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-brand-soft p-2">
          <Globe className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold">Domínio próprio</h3>
          <p className="text-sm text-muted-foreground">
            Sirva seu perfil ForLink no seu próprio domínio (ex.: <b>fulano.com</b>). SSL automático via Cloudflare.
          </p>
        </div>
        {!isPro && (
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" /> Pro
          </Badge>
        )}
      </div>

      {!isPro ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Recurso exclusivo do plano <b>Pro</b>. Faça upgrade para conectar seu domínio.
        </div>
      ) : (
        <>
          {canAdd && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const h = hostname.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
                if (!h) return;
                createMut.mutate(h);
              }}
              className="mb-4 flex gap-2"
            >
              <Input
                placeholder="fulano.com ou links.fulano.com"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                disabled={createMut.isPending}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <Button type="submit" disabled={createMut.isPending || !hostname.trim()}>
                {createMut.isPending ? "Adicionando…" : "Adicionar"}
              </Button>
            </form>
          )}

          {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

          <div className="space-y-4">
            {domains.map((d) => {
              const meta = STATUS_META[d.status];
              const Icon = meta.icon;
              const txt = d.ownership_verification?.txt as { name?: string; value?: string } | undefined;
              return (
                <div key={d.id} className="rounded-xl border bg-muted/20 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{d.hostname}</span>
                    <Badge variant={meta.variant} className="gap-1">
                      <Icon className={`h-3 w-3 ${d.status.startsWith("pending") ? "animate-spin" : ""}`} />
                      {meta.label}
                    </Badge>
                    <div className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refreshMut.mutate(d.id)}
                        disabled={refreshMut.isPending}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshMut.isPending ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remover ${d.hostname}?`)) deleteMut.mutate(d.id);
                        }}
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {d.status === "active" ? (
                    <p className="text-sm text-muted-foreground">
                      Seu perfil está disponível em <b className="text-foreground">https://{d.hostname}</b>.
                    </p>
                  ) : d.status === "failed" ? (
                    <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                      {d.last_error ?? "Falha desconhecida."}
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="mb-1 font-medium text-foreground">1. Aponte o DNS no seu registrador:</p>
                        <DnsRecordRow
                          type="CNAME"
                          name={d.hostname.split(".").length > 2 ? d.hostname.split(".")[0] : "@"}
                          value="forlink.app"
                        />
                        <p className="mt-1 text-muted-foreground">
                          Para domínios raiz (ex.: fulano.com), use "CNAME flattening" ou "ALIAS" se seu DNS suportar.
                          Caso contrário, use um registro A apontando para os IPs do Cloudflare.
                        </p>
                      </div>
                      {txt?.name && txt.value && (
                        <div>
                          <p className="mb-1 font-medium text-foreground">2. Verificação de propriedade (temporária):</p>
                          <DnsRecordRow type="TXT" name={txt.name} value={txt.value} />
                        </div>
                      )}
                      <p className="text-muted-foreground">
                        Depois de propagar, clique em <b>atualizar</b>. Pode levar até 24h.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {domains.length === 0 && !q.isLoading && (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum domínio conectado. Adicione o primeiro acima.
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function DnsRecordRow({ type, name, value }: { type: string; name: string; value: string }) {
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => toast.success("Copiado."));
  };
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 font-mono">
      <span className="min-w-[46px] text-muted-foreground">{type}</span>
      <span className="min-w-[80px] truncate">{name}</span>
      <span className="flex-1 truncate">{value}</span>
      <Button variant="ghost" size="sm" onClick={copy} className="h-6 w-6 p-0">
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
