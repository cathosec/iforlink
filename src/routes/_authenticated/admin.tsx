import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Users, Link2, BadgeCheck, ExternalLink, DollarSign, CreditCard,
  Settings2, ShieldAlert, ShieldCheck, TrendingUp, Trash2, Search, Activity,
  FolderTree, AlertTriangle, EyeOff, Plus, X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Super Admin · ForLink" }] }),
});

type RoleName = "free" | "pro" | "admin";
interface AdminProfile {
  id: string; username: string; display_name: string; is_verified: boolean;
  views_count: number; created_at: string;
}
interface Subscription {
  id: string; user_id: string; plan: RoleName; status: string; gateway: string;
  external_id: string | null; amount_cents: number; currency: string; interval: string;
  current_period_start: string | null; current_period_end: string | null;
  canceled_at: string | null; created_at: string;
}
interface AuditEntry {
  id: string; admin_id: string; action: string; target_type: string | null;
  target_id: string | null; metadata: Record<string, unknown>; created_at: string;
}
interface SettingRow { key: string; value: Record<string, unknown>; description: string | null }

const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

function Admin() {
  const { role, loading, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && role !== "admin") {
      toast.error("Acesso restrito a administradores");
      navigate({ to: "/dashboard" });
    }
  }, [loading, role, navigate]);

  const logAction = async (action: string, target_type?: string, target_id?: string, metadata: Record<string, unknown> = {}) => {
    if (!user) return;
    await supabase.from("admin_audit_log").insert({ admin_id: user.id, action, target_type: target_type ?? null, target_id: target_id ?? null, metadata: metadata as never });
    qc.invalidateQueries({ queryKey: ["admin-audit"] });
  };

  if (role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-tight">Painel do Super-Admin</h1>
            <p className="text-sm text-muted-foreground">Controle total sobre a ForLink — usuários, conteúdo, assinaturas e gateways.</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="mt-8">
          <TabsList className="flex w-full flex-wrap">
            <TabsTrigger value="overview"><TrendingUp className="mr-1.5 h-4 w-4" />Visão geral</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-1.5 h-4 w-4" />Usuários</TabsTrigger>
            <TabsTrigger value="content"><FolderTree className="mr-1.5 h-4 w-4" />Conteúdo</TabsTrigger>
            <TabsTrigger value="security"><ShieldCheck className="mr-1.5 h-4 w-4" />Segurança</TabsTrigger>
            <TabsTrigger value="subscriptions"><CreditCard className="mr-1.5 h-4 w-4" />Assinaturas</TabsTrigger>
            <TabsTrigger value="gateways"><DollarSign className="mr-1.5 h-4 w-4" />Gateways</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 className="mr-1.5 h-4 w-4" />Plataforma</TabsTrigger>
            <TabsTrigger value="audit"><Activity className="mr-1.5 h-4 w-4" />Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
          <TabsContent value="users" className="mt-6"><UsersTab logAction={logAction} /></TabsContent>
          <TabsContent value="content" className="mt-6"><ContentTab logAction={logAction} /></TabsContent>
          <TabsContent value="security" className="mt-6"><SecurityTab logAction={logAction} /></TabsContent>
          <TabsContent value="subscriptions" className="mt-6"><SubscriptionsTab logAction={logAction} /></TabsContent>
          <TabsContent value="gateways" className="mt-6"><GatewaysTab logAction={logAction} /></TabsContent>
          <TabsContent value="settings" className="mt-6"><SettingsTab logAction={logAction} /></TabsContent>
          <TabsContent value="audit" className="mt-6"><AuditTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ─────────── Overview ─────────── */
function OverviewTab() {
  const stats = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [profiles, links, cats, subs, mrr] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("links").select("id", { count: "exact", head: true }),
        supabase.from("user_categories").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("subscriptions").select("amount_cents,interval").eq("status", "active"),
      ]);
      const mrrCents = (mrr.data ?? []).reduce((sum, s) => {
        const monthly = s.interval === "year" ? s.amount_cents / 12 : s.amount_cents;
        return sum + monthly;
      }, 0);
      return {
        profiles: profiles.count ?? 0,
        links: links.count ?? 0,
        cats: cats.count ?? 0,
        activeSubs: subs.count ?? 0,
        mrr: mrrCents,
      };
    },
  });
  const s = stats.data;
  const items = [
    { icon: Users, label: "Perfis", value: s?.profiles ?? "—" },
    { icon: Link2, label: "Links publicados", value: s?.links ?? "—" },
    { icon: FolderTree, label: "Categorias", value: s?.cats ?? "—" },
    { icon: CreditCard, label: "Assinaturas ativas", value: s?.activeSubs ?? "—" },
    { icon: DollarSign, label: "MRR estimado", value: s ? brl(s.mrr) : "—" },
    { icon: TrendingUp, label: "ARR projetado", value: s ? brl(s.mrr * 12) : "—" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <Card key={it.label} className="flex items-center gap-4 p-5">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand-soft text-brand">
            <it.icon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-semibold">{it.value}</div>
            <div className="text-xs text-muted-foreground">{it.label}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─────────── Users ─────────── */
function UsersTab({ logAction }: { logAction: (a: string, t?: string, id?: string, m?: Record<string, unknown>) => Promise<void> }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,username,display_name,is_verified,views_count,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      const { data: roles } = await supabase.from("user_roles").select("user_id,role");
      const map = new Map<string, RoleName>();
      (roles ?? []).forEach((r: { user_id: string; role: RoleName }) => {
        const cur = map.get(r.user_id);
        const rank = (x: RoleName) => (x === "admin" ? 3 : x === "pro" ? 2 : 1);
        if (!cur || rank(r.role) > rank(cur)) map.set(r.user_id, r.role);
      });
      return ((profiles as AdminProfile[]) ?? []).map((p) => ({ ...p, role: (map.get(p.id) ?? "free") as RoleName }));
    },
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return usersQ.data ?? [];
    return (usersQ.data ?? []).filter(u => u.username.toLowerCase().includes(t) || u.display_name.toLowerCase().includes(t));
  }, [usersQ.data, q]);

  const setRole = async (userId: string, newRole: RoleName) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado");
    await logAction("role.change", "user", userId, { role: newRole });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };
  const setVerified = async (userId: string, v: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: v }).eq("id", userId);
    if (error) return toast.error(error.message);
    await logAction(v ? "user.verify" : "user.unverify", "user", userId);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };
  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Excluir permanentemente @${username} e todos os seus dados?`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Perfil removido");
    await logAction("user.delete", "user", userId, { username });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-3">
        <div className="font-semibold">Usuários ({filtered.length})</div>
        <div className="relative ml-auto w-64">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="h-8 pl-8" />
        </div>
      </div>
      {usersQ.isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="divide-y">
          {filtered.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.display_name}</span>
                  {u.is_verified && <BadgeCheck className="h-4 w-4 text-brand" />}
                  <Badge variant="outline" className="text-[10px] uppercase">{u.role}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">@{u.username} · {u.views_count} views · {new Date(u.created_at).toLocaleDateString("pt-BR")}</div>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span>Verif.</span>
                <Switch checked={u.is_verified} onCheckedChange={(v) => setVerified(u.id, v)} />
              </div>
              <Select value={u.role} onValueChange={(v) => setRole(u.id, v as RoleName)}>
                <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Link to="/$username" params={{ username: u.username }}>
                <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => deleteUser(u.id, u.username)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</div>}
        </div>
      )}
    </Card>
  );
}

/* ─────────── Content (links & categories) ─────────── */
function ContentTab({ logAction }: { logAction: (a: string, t?: string, id?: string, m?: Record<string, unknown>) => Promise<void> }) {
  const qc = useQueryClient();
  const linksQ = useQuery({
    queryKey: ["admin-links"],
    queryFn: async () => {
      const { data: links } = await supabase
        .from("links")
        .select("id,title,url,clicks_count,is_visible,created_at,user_id")
        .order("clicks_count", { ascending: false })
        .limit(100);
      const ids = Array.from(new Set((links ?? []).map(l => l.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,username,display_name").in("id", ids)
        : { data: [] as { id: string; username: string; display_name: string }[] };
      const map = new Map((profs ?? []).map(p => [p.id, p]));
      return (links ?? []).map(l => ({
        ...l,
        profile: map.get(l.user_id) ?? { username: "—", display_name: "—" },
      }));
    },
  });

  const removeLink = async (id: string, title: string) => {
    if (!confirm(`Remover o link "${title}"?`)) return;
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Link removido");
    await logAction("link.delete", "link", id, { title });
    qc.invalidateQueries({ queryKey: ["admin-links"] });
  };
  const toggleVisible = async (id: string, v: boolean) => {
    await supabase.from("links").update({ is_visible: v }).eq("id", id);
    await logAction(v ? "link.show" : "link.hide", "link", id);
    qc.invalidateQueries({ queryKey: ["admin-links"] });
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/30 px-5 py-3 font-semibold">Top links da plataforma</div>
      {linksQ.isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="divide-y">
          {linksQ.data?.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{l.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  @{l.profile.username} · {l.url}
                </div>
              </div>
              <Badge variant="secondary">{l.clicks_count} cliques</Badge>
              <Switch checked={l.is_visible} onCheckedChange={(v) => toggleVisible(l.id, v)} />
              <Button variant="ghost" size="icon" onClick={() => removeLink(l.id, l.title)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ─────────── Subscriptions ─────────── */
function SubscriptionsTab({ logAction }: { logAction: (a: string, t?: string, id?: string, m?: Record<string, unknown>) => Promise<void> }) {
  const qc = useQueryClient();
  const subsQ = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () => {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      const ids = Array.from(new Set((subs ?? []).map(s => s.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,username,display_name").in("id", ids)
        : { data: [] as { id: string; username: string; display_name: string }[] };
      const map = new Map((profs ?? []).map(p => [p.id, p]));
      return (subs ?? []).map(s => ({ ...s, profile: map.get(s.user_id) ?? null })) as Array<Subscription & { profile: { username: string; display_name: string } | null }>;
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: "", plan: "pro" as RoleName, gateway: "manual", amount_cents: 1990, interval: "month" });

  const createSub = async () => {
    const { data: prof } = await supabase.from("profiles").select("id").eq("username", form.username.trim()).maybeSingle();
    if (!prof) return toast.error("Usuário não encontrado");
    const now = new Date();
    const end = new Date(now);
    if (form.interval === "year") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    const { error } = await supabase.from("subscriptions").insert({
      user_id: prof.id, plan: form.plan, gateway: form.gateway,
      amount_cents: form.amount_cents, interval: form.interval, status: "active",
      current_period_start: now.toISOString(), current_period_end: end.toISOString(),
    });
    if (error) return toast.error(error.message);
    // Also promote role
    await supabase.from("user_roles").delete().eq("user_id", prof.id);
    await supabase.from("user_roles").insert({ user_id: prof.id, role: form.plan });
    await logAction("subscription.create", "user", prof.id, { plan: form.plan, gateway: form.gateway });
    toast.success("Assinatura criada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-subs"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancelar esta assinatura?")) return;
    const { error } = await supabase.from("subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAction("subscription.cancel", "subscription", id);
    toast.success("Cancelada");
    qc.invalidateQueries({ queryKey: ["admin-subs"] });
  };

  const totalMRR = (subsQ.data ?? []).filter(s => s.status === "active").reduce((sum, s) => {
    return sum + (s.interval === "year" ? s.amount_cents / 12 : s.amount_cents);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">MRR</div>
          <div className="mt-1 text-2xl font-semibold">{brl(totalMRR)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Ativas</div>
          <div className="mt-1 text-2xl font-semibold">{(subsQ.data ?? []).filter(s => s.status === "active").length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Canceladas</div>
          <div className="mt-1 text-2xl font-semibold">{(subsQ.data ?? []).filter(s => s.status === "canceled").length}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center border-b bg-muted/30 px-5 py-3">
          <div className="font-semibold">Assinaturas</div>
          <Button size="sm" className="ml-auto" onClick={() => setOpen(!open)}>
            {open ? "Fechar" : "+ Nova assinatura"}
          </Button>
        </div>
        {open && (
          <div className="grid grid-cols-1 gap-3 border-b bg-muted/10 p-5 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <Label className="text-xs">Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ex: tech-curator" />
            </div>
            <div>
              <Label className="text-xs">Plano</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v as RoleName })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Gateway</Label>
              <Select value={form.gateway} onValueChange={(v) => setForm({ ...form, gateway: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paddle">Paddle</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Valor (centavos)</Label>
              <Input type="number" value={form.amount_cents} onChange={(e) => setForm({ ...form, amount_cents: +e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Ciclo</Label>
              <Select value={form.interval} onValueChange={(v) => setForm({ ...form, interval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-6">
              <Button onClick={createSub}>Criar assinatura</Button>
            </div>
          </div>
        )}
        {subsQ.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="divide-y">
            {subsQ.data?.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">@{s.profile?.username ?? "—"}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{s.plan}</Badge>
                    <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px] uppercase">{s.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.gateway} · {brl(s.amount_cents)}/{s.interval === "year" ? "ano" : "mês"}
                    {s.current_period_end && ` · vence ${new Date(s.current_period_end).toLocaleDateString("pt-BR")}`}
                  </div>
                </div>
                {s.status === "active" && (
                  <Button variant="outline" size="sm" onClick={() => cancel(s.id)}>Cancelar</Button>
                )}
              </div>
            ))}
            {(subsQ.data ?? []).length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma assinatura registrada ainda.</div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─────────── Gateways ─────────── */
function GatewaysTab({ logAction }: { logAction: (a: string, t?: string, id?: string, m?: Record<string, unknown>) => Promise<void> }) {
  const qc = useQueryClient();
  const setQ = useQuery({
    queryKey: ["setting", "gateways"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*").eq("key", "gateways").maybeSingle();
      return data as SettingRow | null;
    },
  });
  const pricingQ = useQuery({
    queryKey: ["setting", "pricing"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*").eq("key", "pricing").maybeSingle();
      return data as SettingRow | null;
    },
  });

  const gateways = (setQ.data?.value ?? {}) as Record<string, { enabled: boolean; mode: string }>;
  const pricing = (pricingQ.data?.value ?? {}) as { pro_month_brl: number; pro_year_brl: number };

  const saveGateway = async (name: string, patch: Partial<{ enabled: boolean; mode: string }>) => {
    const next = { ...gateways, [name]: { ...(gateways[name] ?? { enabled: false, mode: "test" }), ...patch } };
    const { error } = await supabase.from("platform_settings").update({ value: next }).eq("key", "gateways");
    if (error) return toast.error(error.message);
    await logAction("gateway.update", "setting", name, patch);
    qc.invalidateQueries({ queryKey: ["setting", "gateways"] });
  };

  const savePricing = async (patch: Partial<{ pro_month_brl: number; pro_year_brl: number }>) => {
    const next = { ...pricing, ...patch };
    const { error } = await supabase.from("platform_settings").update({ value: next }).eq("key", "pricing");
    if (error) return toast.error(error.message);
    toast.success("Preços atualizados");
    await logAction("pricing.update", "setting", "pricing", patch);
    qc.invalidateQueries({ queryKey: ["setting", "pricing"] });
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-semibold">Preços dos planos</h3>
        <p className="mt-1 text-xs text-muted-foreground">Valores em centavos de BRL.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Pro mensal</Label>
            <div className="flex items-center gap-2">
              <Input type="number" defaultValue={pricing.pro_month_brl}
                onBlur={(e) => savePricing({ pro_month_brl: +e.target.value })} />
              <span className="text-sm text-muted-foreground">= {brl(pricing.pro_month_brl ?? 0)}</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">Pro anual</Label>
            <div className="flex items-center gap-2">
              <Input type="number" defaultValue={pricing.pro_year_brl}
                onBlur={(e) => savePricing({ pro_year_brl: +e.target.value })} />
              <span className="text-sm text-muted-foreground">= {brl(pricing.pro_year_brl ?? 0)}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold">Gateways de pagamento</h3>
        <p className="mt-1 text-xs text-muted-foreground">Ative gateways para começar a processar pagamentos automaticamente.</p>
        <div className="mt-4 space-y-3">
          {(["stripe", "paddle", "pix"] as const).map((g) => {
            const gw = gateways[g] ?? { enabled: false, mode: "test" };
            return (
              <div key={g} className="flex items-center gap-3 rounded-md border p-3">
                <div className="flex-1">
                  <div className="font-medium capitalize">{g}</div>
                  <div className="text-xs text-muted-foreground">Modo: {gw.mode}</div>
                </div>
                <Select value={gw.mode} onValueChange={(v) => saveGateway(g, { mode: v })}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Teste</SelectItem>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Produção</SelectItem>
                  </SelectContent>
                </Select>
                <Switch checked={gw.enabled} onCheckedChange={(v) => saveGateway(g, { enabled: v })} />
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          💡 Para ativar cobrança real, integre Stripe ou Paddle pelo Lovable Payments — as assinaturas serão registradas automaticamente aqui via webhook.
        </p>
      </Card>
    </div>
  );
}

/* ─────────── Platform settings (limits + features) ─────────── */
function SettingsTab({ logAction }: { logAction: (a: string, t?: string, id?: string, m?: Record<string, unknown>) => Promise<void> }) {
  const qc = useQueryClient();
  const limitsQ = useQuery({
    queryKey: ["setting", "limits"],
    queryFn: async () => (await supabase.from("platform_settings").select("*").eq("key", "limits").maybeSingle()).data as SettingRow | null,
  });
  const featuresQ = useQuery({
    queryKey: ["setting", "features"],
    queryFn: async () => (await supabase.from("platform_settings").select("*").eq("key", "features").maybeSingle()).data as SettingRow | null,
  });

  const limits = (limitsQ.data?.value ?? {}) as Record<string, number>;
  const features = (featuresQ.data?.value ?? {}) as Record<string, boolean>;

  const saveLimits = async (patch: Record<string, number>) => {
    const next = { ...limits, ...patch };
    const { error } = await supabase.from("platform_settings").update({ value: next }).eq("key", "limits");
    if (error) return toast.error(error.message);
    toast.success("Limites atualizados");
    await logAction("limits.update", "setting", "limits", patch);
    qc.invalidateQueries({ queryKey: ["setting", "limits"] });
  };
  const saveFeature = async (name: string, v: boolean) => {
    const next = { ...features, [name]: v };
    const { error } = await supabase.from("platform_settings").update({ value: next }).eq("key", "features");
    if (error) return toast.error(error.message);
    await logAction("feature.toggle", "setting", name, { enabled: v });
    qc.invalidateQueries({ queryKey: ["setting", "features"] });
  };

  const [ann, setAnn] = useState("");

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-semibold">Limites por plano</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(["free_categories", "free_links", "pro_categories", "pro_links"] as const).map(k => (
            <div key={k}>
              <Label className="text-xs">{k.replace("_", " ")}</Label>
              <Input type="number" defaultValue={limits[k]} onBlur={(e) => saveLimits({ [k]: +e.target.value })} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold">Funcionalidades</h3>
        <div className="mt-4 space-y-3">
          {[
            { key: "signup_enabled", label: "Novos cadastros habilitados" },
            { key: "discovery_enabled", label: "Diretório de descoberta público" },
            { key: "maintenance_mode", label: "Modo de manutenção", danger: true },
          ].map(f => (
            <div key={f.key} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className={`font-medium ${f.danger ? "text-destructive" : ""}`}>{f.label}</div>
                <div className="text-xs text-muted-foreground">chave: {f.key}</div>
              </div>
              <Switch checked={!!features[f.key]} onCheckedChange={(v) => saveFeature(f.key, v)} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold">Anúncio global</h3>
        <p className="mt-1 text-xs text-muted-foreground">Mensagem exibida no topo da plataforma.</p>
        <Textarea className="mt-3" value={ann} onChange={(e) => setAnn(e.target.value)} placeholder="Ex: Manutenção programada dia 20/07…" />
        <Button className="mt-3" onClick={async () => {
          await supabase.from("platform_settings").upsert({ key: "announcement", value: { message: ann }, description: "Anúncio global" });
          toast.success("Anúncio salvo");
          await logAction("announcement.update", "setting", "announcement", { message: ann });
        }}>Salvar anúncio</Button>
      </Card>
    </div>
  );
}

/* ─────────── Audit log ─────────── */
function AuditTab() {
  const q = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      const ids = Array.from(new Set((rows ?? []).map(r => r.admin_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,username,display_name").in("id", ids)
        : { data: [] as { id: string; username: string; display_name: string }[] };
      const map = new Map((profs ?? []).map(p => [p.id, p]));
      return (rows ?? []).map(r => ({ ...r, profile: map.get(r.admin_id) ?? null })) as Array<AuditEntry & { profile: { username: string; display_name: string } | null }>;
    },
  });
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/30 px-5 py-3 font-semibold">Log de auditoria ({q.data?.length ?? 0})</div>
      {q.isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="divide-y">
          {q.data?.map(e => (
            <div key={e.id} className="px-5 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">{e.action}</Badge>
                {e.target_type && <span className="text-xs text-muted-foreground">{e.target_type}:{e.target_id?.slice(0, 8)}</span>}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("pt-BR")} · por @{e.profile?.username ?? "—"}
                </span>
              </div>
              {Object.keys(e.metadata ?? {}).length > 0 && (
                <pre className="mt-1 overflow-x-auto rounded bg-muted/40 p-2 text-[11px]">{JSON.stringify(e.metadata, null, 2)}</pre>
              )}
            </div>
          ))}
          {(q.data ?? []).length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma ação registrada ainda.</div>}
        </div>
      )}
    </Card>
  );
}
