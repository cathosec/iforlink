import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
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

        <Tabs defaultValue="overview" orientation="vertical" className="mt-8 flex flex-col gap-6 md:flex-row md:items-start">
          <TabsList className="flex h-auto w-full flex-row flex-wrap justify-start gap-1 rounded-lg border bg-card p-2 md:w-56 md:shrink-0 md:flex-col md:flex-nowrap">
            {[
              ["overview", TrendingUp, "Visão geral"],
              ["users", Users, "Usuários"],
              ["content", FolderTree, "Conteúdo"],
              ["security", ShieldCheck, "Segurança"],
              ["subscriptions", CreditCard, "Assinaturas"],
              ["gateways", DollarSign, "Pagamentos"],
              ["settings", Settings2, "Plataforma"],
              ["audit", Activity, "Auditoria"],
            ].map(([v, Icon, label]) => {
              const I = Icon as React.ComponentType<{ className?: string }>;
              return (
                <TabsTrigger
                  key={v as string}
                  value={v as string}
                  className="w-full justify-start gap-2 px-3 py-2 text-sm data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
                >
                  <I className="h-4 w-4" />
                  <span>{label as string}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="min-w-0 flex-1">
            <TabsContent value="overview" className="mt-0"><OverviewTab /></TabsContent>
            <TabsContent value="users" className="mt-0"><UsersTab logAction={logAction} /></TabsContent>
            <TabsContent value="content" className="mt-0"><ContentTab logAction={logAction} /></TabsContent>
            <TabsContent value="security" className="mt-0"><SecurityTab logAction={logAction} /></TabsContent>
            <TabsContent value="subscriptions" className="mt-0"><SubscriptionsTab logAction={logAction} /></TabsContent>
            <TabsContent value="gateways" className="mt-0"><GatewaysTab logAction={logAction} /></TabsContent>
            <TabsContent value="settings" className="mt-0"><SettingsTab logAction={logAction} /></TabsContent>
            <TabsContent value="audit" className="mt-0"><AuditTab /></TabsContent>
          </div>
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

      <MercadoPagoCard logAction={logAction} />
    </div>
  );
}

/* ─────────── Mercado Pago (PIX) ─────────── */
function MercadoPagoCard({ logAction }: { logAction: (a: string, t?: string, id?: string, m?: Record<string, unknown>) => Promise<void> }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["setting", "mercadopago"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*").eq("key", "mercadopago").maybeSingle();
      return data as SettingRow | null;
    },
  });
  type MPCfg = {
    enabled?: boolean;
    mode?: string;
    pix_expiration_minutes?: number;
    prices?: { month_cents?: number; quarter_cents?: number; year_cents?: number };
  };
  const cfg: MPCfg = (q.data?.value ?? {}) as MPCfg;
  const prices = cfg.prices ?? {};

  const save = async (patch: Partial<MPCfg>) => {
    const next = { ...cfg, ...patch };
    const { error } = await supabase.from("platform_settings").update({ value: next as never }).eq("key", "mercadopago");
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
    await logAction("mercadopago.update", "setting", "mercadopago", patch as Record<string, unknown>);
    qc.invalidateQueries({ queryKey: ["setting", "mercadopago"] });
  };
  const savePrices = async (patch: Partial<NonNullable<MPCfg["prices"]>>) => {
    await save({ prices: { ...prices, ...patch } });
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/public/webhooks/mercadopago`
    : "/api/public/webhooks/mercadopago";

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-sky-600">
          <DollarSign className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Mercado Pago · PIX</h3>
          <p className="text-xs text-muted-foreground">Cobrança PIX avulsa ou por ciclo (mensal, trimestral, anual). Aprovação automática por webhook.</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span>Ativado</span>
          <Switch checked={!!cfg.enabled} onCheckedChange={(v) => save({ enabled: v })} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Ambiente</Label>
          <Select value={cfg.mode ?? "test"} onValueChange={(v) => save({ mode: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="test">Teste (TEST-…)</SelectItem>
              <SelectItem value="live">Produção (APP_USR-…)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Expiração do PIX (minutos)</Label>
          <Input type="number" min={5} max={1440} defaultValue={cfg.pix_expiration_minutes ?? 30}
                 onBlur={(e) => save({ pix_expiration_minutes: +e.target.value })} />
        </div>
      </div>

      <div className="mt-5">
        <Label className="text-xs">URL do webhook (cadastre no painel do Mercado Pago)</Label>
        <div className="mt-1 flex gap-2">
          <Input readOnly value={webhookUrl} className="font-mono text-xs" />
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada"); }}>
            Copiar
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Configure em: Suas integrações → sua aplicação → Webhooks. Evento: <code>payment</code>.
        </p>
      </div>

      <div className="mt-5">
        <div className="text-xs font-medium text-muted-foreground">Credenciais</div>
        <div className="mt-2 rounded-md border bg-muted/40 p-3 text-xs">
          As chaves ficam armazenadas como <strong>segredos do servidor</strong> (nunca expostas ao navegador):
          <ul className="mt-2 list-inside list-disc space-y-0.5">
            <li><code>MERCADOPAGO_ACCESS_TOKEN</code> — Access Token (obrigatório)</li>
            <li><code>MERCADOPAGO_WEBHOOK_SECRET</code> — Segredo do webhook (opcional, valida assinatura)</li>
          </ul>
          <p className="mt-2">Para alterar, atualize os segredos do projeto na área de configurações.</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-xs font-medium text-muted-foreground">Planos PIX (valor em centavos)</div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([
            ["month_cents", "Mensal"],
            ["quarter_cents", "Trimestral"],
            ["year_cents", "Anual"],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <Label className="text-xs">{label}</Label>
              <Input type="number" defaultValue={prices[k] ?? 0}
                     onBlur={(e) => savePrices({ [k]: +e.target.value } as Partial<NonNullable<MPCfg["prices"]>>)} />
              <div className="mt-1 text-[10px] text-muted-foreground">= {brl(prices[k] ?? 0)}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
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

/* ─────────── Security (link moderation + domain blocklist) ─────────── */
function SecurityTab({ logAction }: { logAction: (a: string, t?: string, id?: string, m?: Record<string, unknown>) => Promise<void> }) {
  const qc = useQueryClient();

  const secQ = useQuery({
    queryKey: ["setting", "security"],
    queryFn: async () => (await supabase.from("platform_settings").select("*").eq("key", "security").maybeSingle()).data as SettingRow | null,
  });
  const blocked = ((secQ.data?.value?.blocked_domains as string[] | undefined) ?? []);

  const saveBlocked = async (next: string[]) => {
    const value = { ...(secQ.data?.value ?? {}), blocked_domains: next };
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "security", value, description: "Configurações de segurança" }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    await logAction("security.blocklist_update", "setting", "security", { count: next.length });
    qc.invalidateQueries({ queryKey: ["setting", "security"] });
  };

  const [newDomain, setNewDomain] = useState("");
  const addDomain = async () => {
    const d = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d) return;
    if (blocked.includes(d)) return toast.error("Domínio já bloqueado");
    await saveBlocked([...blocked, d]);
    setNewDomain("");
    toast.success(`${d} bloqueado`);
  };
  const removeDomain = async (d: string) => {
    await saveBlocked(blocked.filter(x => x !== d));
    toast.success("Domínio liberado");
  };

  const linksQ = useQuery({
    queryKey: ["security-links"],
    queryFn: async () => {
      const { data: links } = await supabase
        .from("links")
        .select("id,title,url,is_visible,created_at,user_id,clicks_count")
        .order("created_at", { ascending: false })
        .limit(300);
      const ids = Array.from(new Set((links ?? []).map(l => l.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,username,display_name").in("id", ids)
        : { data: [] as { id: string; username: string; display_name: string }[] };
      const map = new Map((profs ?? []).map(p => [p.id, p]));
      return (links ?? []).map(l => ({ ...l, profile: map.get(l.user_id) ?? { username: "—", display_name: "—" } }));
    },
  });

  const analyzed = useMemo(() => {
    const IP_RX = /^\d{1,3}(\.\d{1,3}){3}$/;
    const SHORTENERS = new Set(["bit.ly", "t.co", "tinyurl.com", "goo.gl", "is.gd", "cutt.ly", "rebrand.ly", "ow.ly"]);
    const BAD_TLDS = [".zip", ".mov", ".xyz", ".top", ".click", ".loan"];
    return (linksQ.data ?? []).map(l => {
      const flags: string[] = [];
      let host = "";
      try { host = new URL(l.url).hostname.toLowerCase(); } catch { flags.push("URL inválida"); }
      const isHttps = l.url.toLowerCase().startsWith("https://");
      if (!isHttps && !flags.includes("URL inválida")) flags.push("Sem HTTPS");
      if (host && IP_RX.test(host)) flags.push("IP direto");
      if (host && SHORTENERS.has(host)) flags.push("Encurtador");
      if (host && BAD_TLDS.some(t => host.endsWith(t))) flags.push("TLD suspeito");
      if (host && blocked.some(b => host === b || host.endsWith("." + b))) flags.push("Domínio bloqueado");
      if (l.url.length > 250) flags.push("URL muito longa");
      return { ...l, host, flags };
    });
  }, [linksQ.data, blocked]);

  const suspicious = analyzed.filter(l => l.flags.length > 0);

  const hideLink = async (id: string) => {
    await supabase.from("links").update({ is_visible: false }).eq("id", id);
    await logAction("security.link_hide", "link", id);
    qc.invalidateQueries({ queryKey: ["security-links"] });
    qc.invalidateQueries({ queryKey: ["admin-links"] });
    toast.success("Link ocultado");
  };
  const deleteLink = async (id: string, title: string) => {
    if (!confirm(`Excluir permanentemente "${title}"?`)) return;
    await supabase.from("links").delete().eq("id", id);
    await logAction("security.link_delete", "link", id, { title });
    qc.invalidateQueries({ queryKey: ["security-links"] });
    qc.invalidateQueries({ queryKey: ["admin-links"] });
    toast.success("Link excluído");
  };
  const hideAllSuspicious = async () => {
    const ids = suspicious.filter(l => l.is_visible).map(l => l.id);
    if (ids.length === 0) return toast.info("Nada a ocultar");
    if (!confirm(`Ocultar ${ids.length} links suspeitos?`)) return;
    await supabase.from("links").update({ is_visible: false }).in("id", ids);
    await logAction("security.bulk_hide", "link", undefined, { count: ids.length });
    qc.invalidateQueries({ queryKey: ["security-links"] });
    qc.invalidateQueries({ queryKey: ["admin-links"] });
    toast.success(`${ids.length} links ocultados`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-semibold">{suspicious.length}</div>
            <div className="text-xs text-muted-foreground">Links suspeitos</div>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-semibold">{blocked.length}</div>
            <div className="text-xs text-muted-foreground">Domínios bloqueados</div>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-foreground">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-semibold">{analyzed.length}</div>
            <div className="text-xs text-muted-foreground">Links analisados (300 recentes)</div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold">Lista de domínios bloqueados</h3>
        <p className="mt-1 text-xs text-muted-foreground">Links com esses domínios (ou subdomínios) são sinalizados automaticamente.</p>
        <div className="mt-4 flex gap-2">
          <Input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addDomain(); }}
            placeholder="exemplo.com"
          />
          <Button onClick={addDomain}><Plus className="mr-1 h-4 w-4" />Bloquear</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {blocked.length === 0 && <div className="text-xs text-muted-foreground">Nenhum domínio bloqueado.</div>}
          {blocked.map(d => (
            <Badge key={d} variant="secondary" className="gap-1 pr-1">
              {d}
              <button onClick={() => removeDomain(d)} className="ml-1 rounded p-0.5 hover:bg-destructive/20" aria-label={`Remover ${d}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-3">
          <div className="font-semibold">Links suspeitos ({suspicious.length})</div>
          <Button size="sm" variant="outline" className="ml-auto" onClick={hideAllSuspicious} disabled={suspicious.length === 0}>
            <EyeOff className="mr-1.5 h-4 w-4" />Ocultar todos
          </Button>
        </div>
        {linksQ.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Analisando…</div>
        ) : suspicious.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-brand" />
            Nenhum link suspeito detectado nos 300 mais recentes.
          </div>
        ) : (
          <div className="divide-y">
            {suspicious.map(l => (
              <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{l.title}</span>
                    {!l.is_visible && <Badge variant="outline" className="text-[10px]">oculto</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    @{l.profile.username} · <a href={l.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{l.url}</a>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {l.flags.map(f => (
                      <Badge key={f} variant="destructive" className="text-[10px]">{f}</Badge>
                    ))}
                  </div>
                </div>
                {l.is_visible && (
                  <Button variant="outline" size="sm" onClick={() => hideLink(l.id)}>
                    <EyeOff className="mr-1.5 h-4 w-4" />Ocultar
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => deleteLink(l.id, l.title)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
