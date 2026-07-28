import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, ExternalLink, Trash2, Pencil, Sparkles, Wallet, Link as LinkIcon,
  QrCode, ImageIcon, Copy, TrendingUp, Users2, CheckCircle2, Heart, BarChart3,
} from "lucide-react";
import { startMpOAuth, disconnectMp, getMpStatus } from "@/lib/pix.functions";

export const Route = createFileRoute("/_authenticated/pix")({
  component: PixPage,
  validateSearch: (s: Record<string, unknown>) => ({
    mp: (s.mp as string | undefined) ?? undefined,
    reason: (s.reason as string | undefined) ?? undefined,
    detail: (s.detail as string | undefined) ?? undefined,
  }),
  head: () => ({ meta: [{ title: "Campanhas · ForLink" }, { name: "robots", content: "noindex,nofollow" }] }),
});

interface Campaign {
  id: string; user_id: string; slug: string; title: string;
  description: string | null; cover_url: string | null; accent_color: string;
  goal_cents: number; min_cents: number; suggested_amounts: number[];
  accepts_card: boolean; pass_fee_to_supporter: boolean; show_supporters: boolean;
  show_progress: boolean;
  allow_message: boolean; ends_at: string | null; raised_cents: number;
  supporters_count: number; is_active: boolean; created_at: string;
}

const emptyCampaign: Partial<Campaign> = {
  title: "", description: "", accent_color: "#0ea5e9",
  goal_cents: 100000, min_cents: 500,
  suggested_amounts: [1000, 2500, 5000, 10000],
  accepts_card: false, pass_fee_to_supporter: false,
  show_supporters: true, show_progress: true, allow_message: true, is_active: true,
};

const brl = (c: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

function PixPage() {
  const { user, role, loading } = useAuth();
  const search = useSearch({ from: "/_authenticated/pix" });
  const qc = useQueryClient();
  const isPro = role === "pro" || role === "admin";

  const startOAuth = useServerFn(startMpOAuth);
  const disconnect = useServerFn(disconnectMp);
  const mpStatus = useServerFn(getMpStatus);

  const statusQ = useQuery({
    queryKey: ["mp-status", user?.id],
    enabled: !!user,
    queryFn: () => mpStatus(),
  });

  const campaignsQ = useQuery({
    queryKey: ["pix-campaigns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("pix_campaigns")
        .select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return (data as Campaign[]) ?? [];
    },
  });

  useEffect(() => {
    if (search.mp === "connected") {
      toast.success("Mercado Pago conectado com sucesso!");
      qc.invalidateQueries({ queryKey: ["mp-status", user?.id] });
    } else if (search.mp === "error") {
      const reason = search.reason ?? "desconhecido";
      const detail = (search as { detail?: string }).detail;
      toast.error(`Falha ao conectar (${reason})${detail ? ` — ${detail}` : ""}`, { duration: 8000 });
    }
  }, [search.mp, search.reason, (search as { detail?: string }).detail, qc, user?.id]);


  if (!loading && !isPro) return <UpgradeGate />;

  const campaigns = campaignsQ.data ?? [];
  const connected = !!statusQ.data?.connected;
  const canCreateMore = role === "admin" || role === "pro" || (role === "free" && campaigns.length < 1);

  const totalRaised = campaigns.reduce((n, c) => n + c.raised_cents, 0);
  const totalSupporters = campaigns.reduce((n, c) => n + c.supporters_count, 0);

  const connectMp = async () => {
    try {
      const { url } = await startOAuth();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  const doDisconnect = async () => {
    if (!confirm("Desconectar sua conta Mercado Pago?")) return;
    try {
      await disconnect();
      toast.success("Conta desconectada");
      qc.invalidateQueries({ queryKey: ["mp-status", user?.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao painel
        </Link>

        <header className="mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-brand/5 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand/70 text-white shadow-md shadow-brand/25">
                  <Heart className="h-5 w-5" fill="currentColor" />
                </span>
                <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Campanhas</h1>
                <Badge variant="secondary" className="ml-1">Marketplace</Badge>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Crie páginas de arrecadação com PIX ou cartão. Os valores caem <strong>direto</strong> na
                sua conta Mercado Pago — o ForLink apenas cobra uma taxa de plataforma configurada pelo admin.
              </p>
            </div>
          </div>
        </header>

        {/* Conexão MP */}
        <Card className="mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
            <div className="flex items-center gap-3">
              <div className={`grid h-11 w-11 place-items-center rounded-lg ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {connected ? "Mercado Pago conectado" : "Conecte sua conta Mercado Pago"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {connected
                    ? `Modo ${statusQ.data?.live_mode ? "produção" : "teste"} · MP ID ${statusQ.data?.mp_user_id ?? "—"}`
                    : "Necessário para receber PIX diretamente. Nenhum valor passa pelo ForLink."}
                </div>
              </div>
            </div>
            {connected ? (
              <Button variant="outline" size="sm" onClick={() => void doDisconnect()}>
                Desconectar
              </Button>
            ) : (
              <Button size="sm" onClick={() => void connectMp()}>
                <LinkIcon className="mr-2 h-4 w-4" /> Conectar Mercado Pago
              </Button>
            )}
          </div>
          {connected && (
            <div className="grid grid-cols-2 divide-x">
              <div className="p-5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="mr-1 inline h-3 w-3" /> Total arrecadado
                </div>
                <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{brl(totalRaised)}</div>
              </div>
              <div className="p-5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Users2 className="mr-1 inline h-3 w-3" /> Apoiadores
                </div>
                <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{totalSupporters}</div>
              </div>
            </div>
          )}
        </Card>

        {/* Campanhas */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Suas campanhas
            </h2>
            <CampaignDialog
              disabled={!connected || !canCreateMore}
              disabledReason={
                !connected ? "Conecte o Mercado Pago primeiro" :
                !canCreateMore ? "Plano Free permite 1 campanha ativa" : ""
              }
            />
          </div>

          {role === "free" && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs">
              <Sparkles className="h-4 w-4 text-brand" />
              <span>Plano <strong>Free</strong>: 1 campanha ativa. Faça upgrade para <Link to="/assinar" className="underline">Pro</Link> e crie ilimitadas.</span>
            </div>
          )}

          {campaignsQ.isLoading ? (
            <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <QrCode className="mx-auto h-6 w-6 text-muted-foreground/60" />
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma campanha ainda.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function CampaignCard({ c }: { c: Campaign }) {
  const qc = useQueryClient();
  const pct = c.goal_cents > 0 ? Math.min(100, (c.raised_cents / c.goal_cents) * 100) : 0;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://forlink.app";
  const publicUrl = `${origin}/pix/${c.slug}`;

  const del = async () => {
    if (!confirm(`Excluir campanha "${c.title}"? Contribuições ficarão órfãs.`)) return;
    const { error } = await supabase.from("pix_campaigns").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Campanha excluída");
    qc.invalidateQueries({ queryKey: ["pix-campaigns"] });
  };
  const toggle = async () => {
    const { error } = await supabase.from("pix_campaigns")
      .update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["pix-campaigns"] });
  };
  const copy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado");
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="h-24 w-full"
        style={{
          backgroundImage: c.cover_url ? `url(${c.cover_url})` : undefined,
          backgroundColor: c.accent_color,
          backgroundSize: "cover", backgroundPosition: "center",
        }}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-semibold">{c.title}</div>
            <div className="truncate text-[11px] text-muted-foreground">/pix/{c.slug}</div>
          </div>
          <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Ativa" : "Pausada"}</Badge>
        </div>

        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: c.accent_color }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">{brl(c.raised_cents)}</span>
            <span>meta {brl(c.goal_cents)}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1">
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm"><ExternalLink className="mr-1 h-3.5 w-3.5" /> Abrir</Button>
          </a>
          <Button variant="ghost" size="sm" onClick={() => void copy()}>
            <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
          </Button>
          <CampaignDialog editing={c} />
          <Button variant="ghost" size="sm" onClick={() => void toggle()}>
            {c.is_active ? "Pausar" : "Ativar"}
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive" onClick={() => void del()}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CampaignDialog({ editing, disabled, disabledReason }: { editing?: Campaign; disabled?: boolean; disabledReason?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Partial<Campaign>>(editing ?? emptyCampaign);
  const [slugManual, setSlugManual] = useState(!!editing);

  useEffect(() => {
    if (open) setForm(editing ?? emptyCampaign);
  }, [open, editing]);

  useEffect(() => {
    if (!slugManual && form.title) setForm((f) => ({ ...f, slug: slugify(f.title!) }));
  }, [form.title, slugManual]);

  const suggestedStr = useMemo(
    () => (form.suggested_amounts ?? []).map((c) => (c / 100).toFixed(2)).join(", "),
    [form.suggested_amounts],
  );

  const uploadCover = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("pix-covers").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const publicUrl = `/api/public/pix-cover/${path.split("/").pop()}`;
      // Store path so proxy can find it — actually simpler: use direct storage path via proxy expecting only filename
      // For simplicity, store the storage path in a signed way: since bucket is private, expose via proxy with full path is complex.
      // Simpler approach: rewrite to include user_id folder in filename by using single-level file name.
      const flatPath = `${user.id}-${crypto.randomUUID()}.${ext}`;
      const { error: e2 } = await supabase.storage.from("pix-covers").upload(flatPath, file, { upsert: true, contentType: file.type });
      if (!e2) {
        setForm((f) => ({ ...f, cover_url: `/api/public/pix-cover/${flatPath}` }));
      } else {
        setForm((f) => ({ ...f, cover_url: publicUrl }));
      }
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    if (!form.title || !form.slug) {
      toast.error("Título e slug são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        slug: slugify(form.slug ?? ""),
        title: form.title,
        description: form.description ?? null,
        cover_url: form.cover_url ?? null,
        accent_color: form.accent_color ?? "#0ea5e9",
        goal_cents: Number(form.goal_cents ?? 0),
        min_cents: Number(form.min_cents ?? 500),
        suggested_amounts: (form.suggested_amounts ?? []).slice(0, 8),
        accepts_card: !!form.accepts_card,
        pass_fee_to_supporter: !!form.pass_fee_to_supporter,
        show_supporters: !!form.show_supporters,
        show_progress: form.show_progress ?? true,
        allow_message: !!form.allow_message,
        ends_at: form.ends_at || null,
        is_active: form.is_active ?? true,
      };
      if (editing) {
        const { error } = await supabase.from("pix_campaigns").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pix_campaigns").insert(payload);
        if (error) throw error;
      }
      toast.success("Campanha salva");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["pix-campaigns"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="sm"><Pencil className="mr-1 h-3.5 w-3.5" /> Editar</Button>
        ) : (
          <Button size="sm" disabled={disabled} title={disabledReason}>
            <Plus className="mr-1 h-4 w-4" /> Nova campanha
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar campanha" : "Nova campanha PIX"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Título</Label>
            <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Ajude no lançamento do meu álbum" />
          </div>
          <div>
            <Label>Slug (URL)</Label>
            <Input value={form.slug ?? ""} onChange={(e) => { setSlugManual(true); setForm({ ...form, slug: slugify(e.target.value) }); }}
              placeholder="meu-projeto" />
            <p className="mt-1 text-[11px] text-muted-foreground">forlink.app/pix/{form.slug || "seu-slug"}</p>
          </div>
          <div>
            <Label>Cor principal</Label>
            <Input type="color" value={form.accent_color ?? "#0ea5e9"} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} />
          </div>

          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4} placeholder="Conte a história da sua campanha, o que você fará com os valores arrecadados..." />
          </div>

          <div className="sm:col-span-2">
            <Label>Imagem de capa</Label>
            <div className="mt-1 flex items-center gap-3">
              {form.cover_url && (
                <img src={form.cover_url} alt="" className="h-16 w-24 rounded object-cover" />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                <ImageIcon className="h-4 w-4" />
                {uploading ? "Enviando..." : (form.cover_url ? "Trocar imagem" : "Enviar imagem")}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (f) void uploadCover(f);
                }} />
              </label>
            </div>
          </div>

          <div>
            <Label>Meta (R$)</Label>
            <Input type="number" min={0} step="0.01" value={(form.goal_cents ?? 0) / 100}
              onChange={(e) => setForm({ ...form, goal_cents: Math.round(Number(e.target.value) * 100) })} />
          </div>
          <div>
            <Label>Valor mínimo (R$)</Label>
            <Input type="number" min={1} step="0.01" value={(form.min_cents ?? 500) / 100}
              onChange={(e) => setForm({ ...form, min_cents: Math.round(Number(e.target.value) * 100) })} />
          </div>

          <div className="sm:col-span-2">
            <Label>Valores sugeridos (R$, separados por vírgula)</Label>
            <Input value={suggestedStr}
              onChange={(e) => setForm({
                ...form,
                suggested_amounts: e.target.value.split(",").map((s) => Math.round(Number(s.trim()) * 100)).filter((n) => n > 0),
              })} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div><div className="text-sm font-medium">Aceitar cartão</div><div className="text-[11px] text-muted-foreground">Além do PIX</div></div>
            <Switch checked={!!form.accepts_card} onCheckedChange={(v) => setForm({ ...form, accepts_card: v })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div><div className="text-sm font-medium">Repassar taxa</div><div className="text-[11px] text-muted-foreground">O apoiador cobre a taxa</div></div>
            <Switch checked={!!form.pass_fee_to_supporter} onCheckedChange={(v) => setForm({ ...form, pass_fee_to_supporter: v })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div><div className="text-sm font-medium">Mostrar apoiadores</div><div className="text-[11px] text-muted-foreground">Mural com nome e selo</div></div>
            <Switch checked={!!form.show_supporters} onCheckedChange={(v) => setForm({ ...form, show_supporters: v })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div><div className="text-sm font-medium">Mostrar progresso</div><div className="text-[11px] text-muted-foreground">Exibe valor arrecadado, meta e botão "Ver progresso"</div></div>
            <Switch checked={form.show_progress ?? true} onCheckedChange={(v) => setForm({ ...form, show_progress: v })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div><div className="text-sm font-medium">Permitir mensagens</div><div className="text-[11px] text-muted-foreground">Apoiadores deixam recado</div></div>
            <Switch checked={!!form.allow_message} onCheckedChange={(v) => setForm({ ...form, allow_message: v })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Salvando..." : "Salvar campanha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpgradeGate() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <Card className="p-8">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand">
            <Sparkles className="h-3 w-3" /> Recurso Pro
          </div>
          <h1 className="font-display text-2xl font-semibold">Campanhas (Marketplace)</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O plano Free permite 1 campanha PIX. Para desbloquear campanhas ilimitadas, cartão de crédito
            e recursos avançados, faça upgrade para <strong>Pro</strong>.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              "Recebe PIX direto na sua conta Mercado Pago",
              "Página personalizada com cores e imagem de capa",
              "Mural de apoiadores com selos por valor",
              "Cartão de crédito (Pro)",
              "Campanhas ilimitadas (Pro)",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex gap-2">
            <Link to="/assinar"><Button>Fazer upgrade</Button></Link>
            <Link to="/pix" search={{ mp: undefined, reason: undefined }}><Button variant="outline">Ver minha campanha</Button></Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
