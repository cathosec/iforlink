/**
 * Painel de privacidade LGPD para o módulo Analytics.
 * Permite ao usuário: pausar coleta, exportar seus dados e apagá-los.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAnalyticsOptedOut, setAnalyticsOptOut, onOptOutChange } from "./optout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Download, EyeOff, ShieldCheck, Trash2 } from "lucide-react";

export function PrivacyPanel() {
  const [optOut, setOptOut] = useState<boolean>(false);
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);

  useEffect(() => {
    setOptOut(isAnalyticsOptedOut());
    return onOptOutChange(() => setOptOut(isAnalyticsOptedOut()));
  }, []);

  async function handleExport() {
    setBusy("export");
    try {
      const { data, error } = await supabase.rpc("analytics_export_my_data");
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `forlink-analytics-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Exportação pronta — o download começou.");
    } catch (err) {
      toast.error("Não foi possível exportar", { description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm("Apagar todos os seus dados de analytics? Esta ação é irreversível.")) return;
    setBusy("delete");
    try {
      const { data, error } = await supabase.rpc("analytics_delete_my_data");
      if (error) throw error;
      const d = data as { deleted_sessions?: number } | null;
      toast.success("Dados apagados", {
        description: `${d?.deleted_sessions ?? 0} sessões removidas.`,
      });
    } catch (err) {
      toast.error("Falha ao apagar", { description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Privacidade & LGPD
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Você tem controle total sobre os dados coletados enquanto usa o ForLink. Podemos coletar
            somente o necessário para gerar mapas de calor e gravações anonimizadas — nunca senhas,
            campos de formulário ou dados pessoais visíveis em tela.
          </p>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-medium">
                <EyeOff className="h-4 w-4" />
                Pausar coleta neste navegador
              </div>
              <p className="text-xs text-muted-foreground">
                Desliga o tracker e as gravações imediatamente. Configuração salva localmente.
              </p>
            </div>
            <Switch
              checked={optOut}
              onCheckedChange={(v) => setAnalyticsOptOut(v)}
              aria-label="Pausar coleta de analytics"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={handleExport}
              disabled={busy !== null}
            >
              <Download className="h-4 w-4" />
              {busy === "export" ? "Preparando…" : "Exportar meus dados (JSON)"}
            </Button>
            <Button
              variant="destructive"
              className="justify-start gap-2"
              onClick={handleDelete}
              disabled={busy !== null}
            >
              <Trash2 className="h-4 w-4" />
              {busy === "delete" ? "Apagando…" : "Apagar meus dados"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Direitos garantidos pela Lei Geral de Proteção de Dados (Lei 13.709/2018). Para outras
            solicitações (correção, portabilidade, revogação de consentimento em outro dispositivo),
            escreva para <a className="underline" href="mailto:privacidade@forlink.app">privacidade@forlink.app</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
