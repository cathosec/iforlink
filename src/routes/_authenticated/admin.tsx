import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { testMpIntegration } from "@/lib/pix.functions";
import { PixBadge, PIX_BADGE_META, type PixBadgeKey } from "@/components/pix-badges";
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
  FolderTree, AlertTriangle, EyeOff, Plus, X, Megaphone, Scissors, Copy, MousePointerClick, Mail,
  QrCode, PlugZap, Sparkles, CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip as RTooltip, Legend as RLegend, Bar, Line,
  PieChart, Pie, Cell,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Super Admin · ForLink" }, { name: "robots", content: "noindex,nofollow" }] }),
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
          <div className="flex-1">
            <h1 className="font-display text-3xl tracking-tight">Painel do Super-Admin</h1>
            <p className="text-sm text-muted-foreground">Controle total sobre a ForLink — usuários, conteúdo, assinaturas e gateways.</p>
          </div>
          <Link
            to="/eventos"
            className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent"
          >
            <Activity className="h-4 w-4" /> Eventos
          </Link>
        </div>


        <Tabs defaultValue="overview" orientation="vertical" className="mt-8 flex flex-col gap-6 md:flex-row md:items-start">
          <TabsList className="flex h-auto w-full flex-row flex-wrap justify-start gap-1 rounded-lg border bg-card p-2 md:w-56 md:shrink-0 md:flex-col md:flex-nowrap">
            {[
              ["overview", TrendingUp, "Visão geral"],
              ["financials", DollarSign, "Financeiro"],
              ["users", Users, "Usuários"],
              ["content", FolderTree, "Conteúdo"],
              ["shortener", Scissors, "Encurtador"],
              ["security", ShieldCheck, "Segurança"],
              ["subscriptions", CreditCard, "Assinaturas"],
              ["gateways", DollarSign, "Pagamentos"],
              ["pix", QrCode, "Campanhas"],
              ["addons", Sparkles, "Complementos"],
              ["ads", Megaphone, "Anúncios"],
              ["emails", Mail, "E-mails"],
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
            <TabsContent value="financials" className="mt-0"><FinancialsTab /></TabsContent>
            <TabsContent value="users" className="mt-0"><UsersTab logAction={logAction} /></TabsContent>
            <TabsContent value="content" className="mt-0"><ContentTab logAction={logAction} /></TabsContent>
            <TabsContent value="shortener" className="mt-0"><ShortenerTab logAction={logAction} /></TabsContent>
            <TabsContent value="security" className="mt-0"><SecurityTab logAction={logAction} /></TabsContent>
            <TabsContent value="subscriptions" className="mt-0"><SubscriptionsTab logAction={logAction} /></TabsContent>
            <TabsContent value="gateways" className="mt-0"><GatewaysTab logAction={logAction} /></TabsContent>
            <TabsContent value="pix" className="mt-0"><PixTab logAction={logAction} /></TabsContent>
            <TabsContent value="addons" className="mt-0"><AddonsAdminTab logAction={logAction} /></TabsContent>
            <TabsContent value="ads" className="mt-0"><AdsTab logAction={logAction} /></TabsContent>
            <TabsContent value="emails" className="mt-0"><EmailsTab logAction={logAction} /></TabsContent>
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
    queryKey: ["admin-overview-v2"],
    queryFn: async () => {
      const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
      const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [profilesC, links, cats, subs, mrr, newProfiles7, subs30, contribs30, shortsC, campaignsC, mpConnC] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("links").select("id,clicks_count", { count: "exact" }),
        supabase.from("user_categories").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("subscriptions").select("amount_cents,interval").eq("status", "active"),
        supabase.from("profiles").select("id,created_at").gte("created_at", since30).order("created_at", { ascending: true }),
        supabase.from("subscriptions").select("created_at,amount_cents,interval,status").gte("created_at", since30),
        supabase.from("pix_contributions").select("created_at,amount_cents,fee_cents,status").gte("created_at", since30),
        supabase.from("short_links").select("id,clicks_count", { count: "exact" }),
        supabase.from("pix_campaigns").select("id", { count: "exact", head: true }),
        supabase.from("mp_accounts").select("user_id", { count: "exact", head: true }),
      ]);
      const mrrCents = (mrr.data ?? []).reduce((sum, s) => {
        const monthly = s.interval === "year" ? s.amount_cents / 12 : s.amount_cents;
        return sum + monthly;
      }, 0);

      // Série temporal 30 dias (novos usuários + novas assinaturas + PIX aprovado)
      const bucket: Record<string, { day: string; users: number; subs: number; pix_cents: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000);
        const key = d.toISOString().slice(0, 10);
        bucket[key] = { day: key.slice(5), users: 0, subs: 0, pix_cents: 0 };
      }
      (newProfiles7.data ?? []).forEach((r) => {
        const k = r.created_at.slice(0, 10);
        if (bucket[k]) bucket[k].users++;
      });
      (subs30.data ?? []).forEach((r) => {
        const k = String(r.created_at).slice(0, 10);
        if (bucket[k]) bucket[k].subs++;
      });
      (contribs30.data ?? []).filter((r) => r.status === "approved").forEach((r) => {
        const k = String(r.created_at).slice(0, 10);
        if (bucket[k]) bucket[k].pix_cents += r.amount_cents ?? 0;
      });
      const series = Object.values(bucket);

      const pixApproved = (contribs30.data ?? []).filter((r) => r.status === "approved");
      const pixGross = pixApproved.reduce((n, r) => n + (r.amount_cents ?? 0), 0);
      const pixFees = pixApproved.reduce((n, r) => n + (r.fee_cents ?? 0), 0);

      const linkClicks = (links.data ?? []).reduce((n, l) => n + (l.clicks_count ?? 0), 0);
      const shortClicks = (shortsC.data ?? []).reduce((n, l) => n + (l.clicks_count ?? 0), 0);

      const newProfilesLast7 = (newProfiles7.data ?? []).filter((p) => p.created_at >= since7).length;

      // Distribuição por plano
      const { data: roles } = await supabase.from("user_roles").select("user_id,role");
      const roleMap = new Map<string, RoleName>();
      (roles ?? []).forEach((r: { user_id: string; role: RoleName }) => {
        const cur = roleMap.get(r.user_id);
        const rank = (x: RoleName) => (x === "admin" ? 3 : x === "pro" ? 2 : 1);
        if (!cur || rank(r.role) > rank(cur)) roleMap.set(r.user_id, r.role);
      });
      const totalProfiles = profilesC.count ?? 0;
      const proCount = Array.from(roleMap.values()).filter((r) => r === "pro").length;
      const adminCount = Array.from(roleMap.values()).filter((r) => r === "admin").length;
      const freeCount = Math.max(0, totalProfiles - proCount - adminCount);
      const conversion = totalProfiles > 0 ? (proCount / totalProfiles) * 100 : 0;

      return {
        profiles: totalProfiles,
        links: links.count ?? 0,
        cats: cats.count ?? 0,
        activeSubs: subs.count ?? 0,
        mrr: mrrCents,
        arr: mrrCents * 12,
        newLast7: newProfilesLast7,
        newLast30: (newProfiles7.data ?? []).length,
        linkClicks,
        shortLinks: shortsC.count ?? 0,
        shortClicks,
        campaigns: campaignsC.count ?? 0,
        mpConnected: mpConnC.count ?? 0,
        pixGross,
        pixFees,
        pixCount: pixApproved.length,
        series,
        planDist: [
          { name: "Free", value: freeCount, color: "#94a3b8" },
          { name: "Pro", value: proCount, color: "#2b7fff" },
          { name: "Admin", value: adminCount, color: "#a855f7" },
        ],
        conversion,
      };
    },
  });

  const s = stats.data;
  const kpis = [
    { icon: Users, label: "Perfis totais", value: s?.profiles ?? "—", hint: s ? `+${s.newLast7} nos últimos 7 dias` : undefined },
    { icon: TrendingUp, label: "Novos (30 dias)", value: s?.newLast30 ?? "—" },
    { icon: CreditCard, label: "Assinaturas ativas", value: s?.activeSubs ?? "—", hint: s ? `${s.conversion.toFixed(1)}% de conversão` : undefined },
    { icon: DollarSign, label: "MRR estimado", value: s ? brl(s.mrr) : "—", hint: s ? `ARR ${brl(s.arr)}` : undefined },
    { icon: Link2, label: "Links publicados", value: s?.links ?? "—", hint: s ? `${s.linkClicks.toLocaleString("pt-BR")} cliques totais` : undefined },
    { icon: Scissors, label: "URLs encurtadas", value: s?.shortLinks ?? "—", hint: s ? `${s.shortClicks.toLocaleString("pt-BR")} cliques` : undefined },
    { icon: QrCode, label: "Campanhas PIX", value: s?.campaigns ?? "—", hint: s ? `${s.mpConnected} contas MP conectadas` : undefined },
    { icon: BadgeCheck, label: "PIX aprovado (30d)", value: s ? brl(s.pixGross) : "—", hint: s ? `Taxa: ${brl(s.pixFees)}` : undefined },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((it) => (
          <Card key={it.label} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{it.label}</div>
                <div className="mt-1 truncate text-2xl font-semibold tabular-nums">{it.value}</div>
                {it.hint && <div className="mt-1 truncate text-[11px] text-muted-foreground">{it.hint}</div>}
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                <it.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">Atividade dos últimos 30 dias</div>
              <div className="text-xs text-muted-foreground">Novos usuários, novas assinaturas e PIX aprovado por dia.</div>
            </div>
          </div>
          <div className="h-64 w-full">
            <OverviewChart data={s?.series ?? []} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-3">
            <div className="font-semibold">Distribuição por plano</div>
            <div className="text-xs text-muted-foreground">Base atual da plataforma.</div>
          </div>
          <div className="h-64 w-full">
            <PlanDistribution data={s?.planDist ?? []} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function OverviewChart({ data }: { data: Array<{ day: string; users: number; subs: number; pix_cents: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis yAxisId="l" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v: number) => `R$${(v / 100).toFixed(0)}`} />
        <RTooltip
          formatter={(value: number | string, name: string) => {
            if (name === "PIX (R$)") return [brl(Number(value)), name];
            return [value, name];
          }}
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
        />
        <RLegend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="l" dataKey="users" name="Novos usuários" fill="#2b7fff" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="l" dataKey="subs" name="Assinaturas" fill="#a855f7" radius={[4, 4, 0, 0]} />
        <Line yAxisId="r" type="monotone" dataKey="pix_cents" name="PIX (R$)" stroke="#10b981" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function PlanDistribution({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
          {data.map((d) => (<Cell key={d.name} fill={d.color} />))}
        </Pie>
        <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
        <RLegend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
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
  const pricingQ = useQuery({
    queryKey: ["setting", "pricing"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*").eq("key", "pricing").maybeSingle();
      return data as SettingRow | null;
    },
  });

  const pricing = (pricingQ.data?.value ?? {}) as { pro_month_brl: number; pro_year_brl: number };

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
    access_token_test?: string;
    access_token_live?: string;
    webhook_secret?: string;
    prices?: { month_cents?: number; quarter_cents?: number; year_cents?: number };
  };
  const cfg: MPCfg = (q.data?.value ?? {}) as MPCfg;
  const prices = cfg.prices ?? {};
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string; prefixOk?: boolean; mode?: string; account?: { nickname?: string; email?: string; site_id?: string; id?: number } } | null>(null);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { testMercadoPago } = await import("@/lib/mercadopago.functions");
      const res = await testMercadoPago();
      setTestResult(res);
      if (res.ok) toast.success("Conexão OK com Mercado Pago");
      else toast.error(res.message ?? "Falha ao conectar");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setTestResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

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

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Credenciais do Mercado Pago</div>
            <p className="text-xs text-muted-foreground">Salvas com segurança no banco (acesso restrito a admins via RLS). O modo acima define qual chave é usada.</p>
          </div>
          <Button size="sm" variant="outline" onClick={runTest} disabled={testing}>
            {testing ? "Testando…" : "Testar integração"}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Access Token · Teste <span className="text-muted-foreground">(TEST-…)</span></Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder="TEST-0000000000000000-000000-…"
              defaultValue={cfg.access_token_test ?? ""}
              onBlur={(e) => e.target.value !== (cfg.access_token_test ?? "") && save({ access_token_test: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Access Token · Produção <span className="text-muted-foreground">(APP_USR-…)</span></Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder="APP_USR-0000000000000000-000000-…"
              defaultValue={cfg.access_token_live ?? ""}
              onBlur={(e) => e.target.value !== (cfg.access_token_live ?? "") && save({ access_token_live: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Segredo do webhook <span className="text-muted-foreground">(opcional — valida assinatura)</span></Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder="whsec_… ou string gerada pelo painel do Mercado Pago"
              defaultValue={cfg.webhook_secret ?? ""}
              onBlur={(e) => e.target.value !== (cfg.webhook_secret ?? "") && save({ webhook_secret: e.target.value })}
            />
          </div>
        </div>

        {testResult && (
          <div className={`mt-3 rounded-md border p-3 text-xs ${testResult.ok ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
            {testResult.ok ? (
              <>
                ✓ Conectado como <strong>{testResult.account?.nickname ?? testResult.account?.email}</strong> · site {testResult.account?.site_id} · modo <strong>{testResult.mode}</strong>
                {testResult.prefixOk === false && <div className="mt-1">⚠ O token não tem o prefixo esperado para o modo selecionado.</div>}
              </>
            ) : (
              <>✗ {testResult.message}</>
            )}
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Planos ForLink Pro</div>
            <p className="text-xs text-muted-foreground">Valores em reais (R$). Deixe 0 para ocultar o plano na página de assinatura.</p>
          </div>
          <Button size="sm" variant="outline"
            onClick={() => savePrices({ month_cents: 990, quarter_cents: 2490, year_cents: 8990 })}>
            Usar valores sugeridos
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([
            ["month_cents", "Mensal", "por mês"],
            ["quarter_cents", "Trimestral", "a cada 3 meses"],
            ["year_cents", "Anual", "por ano"],
          ] as const).map(([k, label, hint]) => {
            const reais = ((prices[k] ?? 0) / 100).toFixed(2);
            return (
              <div key={k} className="rounded-lg border bg-muted/30 p-3">
                <Label className="text-xs font-medium">{label}</Label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number" step="0.01" min={0} defaultValue={reais}
                    onBlur={(e) => {
                      const cents = Math.max(0, Math.round(parseFloat(e.target.value || "0") * 100));
                      if (cents !== (prices[k] ?? 0)) savePrices({ [k]: cents } as Partial<NonNullable<MPCfg["prices"]>>);
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{hint}</span>
                  <span>{(prices[k] ?? 0) > 0 ? brl(prices[k] ?? 0) : "oculto"}</span>
                </div>
              </div>
            );
          })}
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

  const analyticsQ = useQuery({
    queryKey: ["setting", "analytics"],
    queryFn: async () => (await supabase.from("platform_settings").select("*").eq("key", "analytics").maybeSingle()).data as SettingRow | null,
  });
  const [gaId, setGaId] = useState("");
  useEffect(() => {
    const v = (analyticsQ.data?.value ?? {}) as { ga_measurement_id?: string };
    setGaId(v.ga_measurement_id ?? "");
  }, [analyticsQ.data]);
  const saveAnalytics = async () => {
    const id = gaId.trim();
    if (id && !/^(G-[A-Z0-9]+|UA-\d+-\d+|GT-[A-Z0-9]+)$/i.test(id)) {
      return toast.error("ID inválido. Use o formato G-XXXXXXX, GT-XXXXXXX ou UA-XXXXX-Y");
    }
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "analytics", value: { ga_measurement_id: id }, description: "Google Analytics" });
    if (error) return toast.error(error.message);
    toast.success("Google Analytics salvo");
    await logAction("analytics.update", "setting", "analytics", { ga_measurement_id: id });
    qc.invalidateQueries({ queryKey: ["setting", "analytics"] });
    qc.invalidateQueries({ queryKey: ["platform_setting", "analytics"] });
  };

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
            { key: "campaigns_enabled", label: "Módulo Campanhas (PIX/cartão)" },
            { key: "campaigns_card_enabled", label: "Aceitar cartão nas campanhas" },
            { key: "shortener_enabled", label: "Encurtador de links (Pro)" },
            { key: "ads_enabled", label: "Anúncios (AdSense) em contas Free" },
            { key: "pro_upgrade_enabled", label: "Upgrade para Pro disponível" },
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

      <Card className="p-6">
        <h3 className="font-semibold">Google Analytics</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Cole o ID de medição do GA4 (formato <code>G-XXXXXXX</code>) ou Tag do Google (<code>GT-XXXXXXX</code>).
          O script é carregado em todo o site assim que salvo.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={gaId}
            onChange={(e) => setGaId(e.target.value)}
            placeholder="G-XXXXXXXXXX"
            className="font-mono"
          />
          <Button onClick={saveAnalytics}>Salvar</Button>
        </div>
        {gaId && (
          <p className="mt-2 text-xs text-muted-foreground">
            Ativo: <span className="font-mono">{gaId}</span>. Aguarde alguns minutos para ver o tráfego no painel do Google Analytics.
          </p>
        )}
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

/* ─────────── Anúncios (AdSense / parceiros) ─────────── */
type AdsSlot = { enabled: boolean; code: string; every?: number };
type AdsCfg = {
  enabled: boolean;
  top: AdsSlot;
  feed: AdsSlot;
  profile: AdsSlot;
  mobile_sticky: AdsSlot;
};

const DEFAULT_ADS: AdsCfg = {
  enabled: false,
  top: { enabled: false, code: "" },
  feed: { enabled: false, code: "", every: 6 },
  profile: { enabled: false, code: "" },
  mobile_sticky: { enabled: false, code: "" },
};

function AdsTab({ logAction }: { logAction: (a: string, t?: string, id?: string, m?: Record<string, unknown>) => Promise<void> }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["setting", "ads"],
    queryFn: async () =>
      (await supabase.from("platform_settings").select("*").eq("key", "ads").maybeSingle()).data as SettingRow | null,
  });

  const cfg: AdsCfg = { ...DEFAULT_ADS, ...((q.data?.value as Partial<AdsCfg>) ?? {}) };
  const [draft, setDraft] = useState<AdsCfg>(cfg);
  useEffect(() => { setDraft({ ...DEFAULT_ADS, ...((q.data?.value as Partial<AdsCfg>) ?? {}) }); }, [q.data?.value]);

  const save = async (next: AdsCfg) => {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "ads", value: next as never, description: "Códigos de anúncios (AdSense, etc.)" });
    if (error) return toast.error(error.message);
    toast.success("Anúncios salvos");
    await logAction("ads.update", "setting", "ads", { enabled: next.enabled });
    qc.invalidateQueries({ queryKey: ["setting", "ads"] });
    qc.invalidateQueries({ queryKey: ["platform_setting", "ads"] });
  };

  const patchSlot = (slot: keyof Omit<AdsCfg, "enabled">, patch: Partial<AdsSlot>) => {
    setDraft((d) => ({ ...d, [slot]: { ...d[slot], ...patch } }));
  };

  const slots: Array<{
    key: keyof Omit<AdsCfg, "enabled">;
    title: string;
    hint: string;
    recommended: string;
  }> = [
    {
      key: "top",
      title: "Topo do diretório (desktop + mobile)",
      hint: "Exibido acima da listagem pública de perfis, na página inicial.",
      recommended: "Formato responsivo · 728×90 (desktop) / 320×100 (mobile)",
    },
    {
      key: "feed",
      title: "Dentro do diretório",
      hint: "Exibido após a grade de perfis, integrado ao conteúdo.",
      recommended: "Nativo responsivo · in-feed",
    },
    {
      key: "profile",
      title: "Página pública de perfil",
      hint: "Exibido no final da página /usuario, antes do rodapé.",
      recommended: "Retângulo médio · 300×250 responsivo",
    },
    {
      key: "mobile_sticky",
      title: "Rodapé fixo (somente mobile)",
      hint: "Barra fixa na parte inferior em telas < 768px. Não aparece no desktop.",
      recommended: "Banner âncora · 320×50 / 320×100",
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-brand" />
              <h3 className="font-semibold">Rede de anúncios</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cole aqui o código completo de cada slot (AdSense, ADX, parceiros).
              Os anúncios só serão exibidos ao público que autorizar cookies de
              publicidade no banner LGPD.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Ativar global</Label>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(v) => { const next = { ...draft, enabled: v }; setDraft(next); save(next); }}
            />
          </div>
        </div>
      </Card>

      {slots.map((s) => (
        <Card key={s.key} className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{s.title}</h4>
                {draft[s.key].enabled ? (
                  <Badge className="bg-brand-soft text-brand hover:bg-brand-soft">Ativo</Badge>
                ) : (
                  <Badge variant="outline">Desativado</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Recomendado: <span className="font-mono">{s.recommended}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Ativar</Label>
              <Switch
                checked={draft[s.key].enabled}
                onCheckedChange={(v) => patchSlot(s.key, { enabled: v })}
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor={`code-${s.key}`} className="text-xs uppercase tracking-widest text-muted-foreground">
              Código do anúncio (HTML/JS)
            </Label>
            <Textarea
              id={`code-${s.key}`}
              rows={6}
              spellCheck={false}
              className="mt-1.5 font-mono text-xs"
              placeholder={`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX" crossorigin="anonymous"></script>\n<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXX" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins>\n<script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>`}
              value={draft[s.key].code}
              onChange={(e) => patchSlot(s.key, { code: e.target.value })}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { const next = { ...draft, [s.key]: { ...draft[s.key], code: "" } }; setDraft(next); save(next); }}
            >
              Limpar
            </Button>
            <Button
              size="sm"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => save(draft)}
            >
              Salvar este slot
            </Button>
          </div>
        </Card>
      ))}

      <Card className="border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
            <strong>Segurança:</strong> apenas administradores podem editar
            estes códigos. Cole somente snippets oficiais de redes de anúncios
            confiáveis — o HTML/JS informado é executado nas páginas públicas
            do site.
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─────────── Encurtador ─────────── */
interface AdminShortLink {
  id: string; code: string; url: string; clicks_count: number;
  created_at: string; user_id: string;
  profiles?: { username: string; display_name: string } | null;
}

function ShortenerTab({ logAction }: { logAction: (a: string, tt?: string, tid?: string, m?: Record<string, unknown>) => Promise<void> }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const linksQ = useQuery({
    queryKey: ["admin-short-links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("short_links")
        .select("id, code, url, clicks_count, created_at, user_id, profiles:user_id(username, display_name)")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as unknown as AdminShortLink[];
    },
  });

  const links = linksQ.data ?? [];
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return links;
    return links.filter(
      (l) =>
        l.code.toLowerCase().includes(t) ||
        l.url.toLowerCase().includes(t) ||
        l.profiles?.username?.toLowerCase().includes(t),
    );
  }, [links, q]);

  const totalClicks = links.reduce((n, l) => n + l.clicks_count, 0);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://forlink.app";

  const remove = async (l: AdminShortLink) => {
    if (!confirm(`Excluir /s/${l.code}? O link curto deixará de funcionar.`)) return;
    const { error } = await supabase.from("short_links").delete().eq("id", l.id);
    if (error) return toast.error("Erro ao excluir");
    await logAction("shortener.delete", "short_link", l.id, { code: l.code, url: l.url });
    toast.success("Removido");
    qc.invalidateQueries({ queryKey: ["admin-short-links"] });
  };

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(`${origin}/s/${code}`);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Scissors className="h-3 w-3" /> Encurtadores
          </div>
          <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{links.length}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <MousePointerClick className="h-3 w-3" /> Cliques totais
          </div>
          <div className="mt-1 font-display text-2xl font-semibold tabular-nums">
            {totalClicks.toLocaleString("pt-BR")}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Users className="h-3 w-3" /> Usuários únicos
          </div>
          <div className="mt-1 font-display text-2xl font-semibold tabular-nums">
            {new Set(links.map((l) => l.user_id)).size}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Todos os encurtadores</h2>
            <p className="text-xs text-muted-foreground">
              Moderação global de todos os links curtos criados na plataforma.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código, URL ou usuário..."
              className="pl-9"
            />
          </div>
        </div>

        {linksQ.isLoading ? (
          <div className="mt-6 py-10 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            Nenhum encurtador encontrado.
          </div>
        ) : (
          <ul className="mt-5 divide-y overflow-hidden rounded-lg border">
            {filtered.map((l) => (
              <li key={l.id} className="flex items-center gap-3 p-3 sm:p-4">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] font-medium text-brand">
                      /s/{l.code}
                    </code>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                      <MousePointerClick className="h-2.5 w-2.5" />
                      {l.clicks_count.toLocaleString("pt-BR")}
                    </span>
                    {l.profiles?.username && (
                      <Link
                        to="/$username"
                        params={{ username: l.profiles.username }}
                        className="text-[11px] text-muted-foreground hover:text-brand"
                      >
                        por @{l.profiles.username}
                      </Link>
                    )}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-muted-foreground" title={l.url}>
                    → {l.url}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground/70">
                    {new Date(l.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => void copy(l.code)} title="Copiar">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <a href={`${origin}/s/${l.code}`} target="_blank" rel="noopener noreferrer" title="Abrir">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void remove(l)}
                    title="Excluir"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ─────────── E-mails (Resend) ─────────── */
type EmailCfg = {
  enabled?: boolean;
  from_name?: string;
  from_address?: string;
  reply_to?: string;
  api_key?: string;
  admin_notify_to?: string;
};


function EmailsTab({ logAction }: { logAction: (a: string, t?: string, id?: string, m?: Record<string, unknown>) => Promise<void> }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["setting", "email"],
    queryFn: async () =>
      (await supabase.from("platform_settings").select("*").eq("key", "email").maybeSingle()).data as SettingRow | null,
  });
  const cfg: EmailCfg = (q.data?.value ?? {}) as EmailCfg;

  const status = useQuery({
    queryKey: ["resend-status"],
    queryFn: async () => {
      const { getResendStatus } = await import("@/lib/email-admin.functions");
      return await getResendStatus();
    },
  });

  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const save = async (patch: Partial<EmailCfg>) => {
    const next = { ...cfg, ...patch };
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "email", value: next as never, description: "Configuração de envio (Resend)" });
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
    await logAction("email.update", "setting", "email", patch as Record<string, unknown>);
    qc.invalidateQueries({ queryKey: ["setting", "email"] });
  };

  const runTest = async () => {
    if (!testTo.trim()) return toast.error("Informe um destinatário");
    setTesting(true);
    setTestResult(null);
    try {
      const { sendResendTest } = await import("@/lib/email-admin.functions");
      const r = await sendResendTest({ data: { to: testTo.trim() } });
      if (r.sent) {
        setTestResult({ ok: true, message: `Enviado com sucesso${r.id ? " · id " + r.id : ""}` });
        toast.success("E-mail de teste enviado");
      } else {
        setTestResult({ ok: false, message: `Não enviado — ${r.reason}` });
        toast.error(r.reason);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setTestResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const s = status.data;
  const domains = s && "domains" in s ? s.domains ?? [] : [];

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand" />
              <h3 className="font-semibold">Provedor de envio · Resend</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Todos os e-mails transacionais (boas-vindas, confirmação, pagamento, assinatura) são enviados via Resend.
              Configure sua chave da API abaixo — ela fica salva com segurança e restrita a administradores.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Label className="text-xs">Envio ativo</Label>
            <Switch checked={cfg.enabled !== false} onCheckedChange={(v) => save({ enabled: v })} />
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-xs">Resend API Key</Label>
          <Input
            type="password"
            placeholder={cfg.api_key ? "•••••••••••••••• (salva)" : "re_xxxxxxxxxxxxxxxxxxxxxxxx"}
            defaultValue=""
            autoComplete="off"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== cfg.api_key) {
                save({ api_key: v });
                e.target.value = "";
                status.refetch();
              }
            }}
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Obtenha em <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="underline">resend.com/api-keys</a>. Comece com <code>re_</code>.
            </p>
            {cfg.api_key && (
              <button
                type="button"
                className="text-xs text-destructive underline"
                onClick={() => { save({ api_key: "" }); status.refetch(); }}
              >
                Remover chave
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-md border p-3 text-xs">
          {status.isLoading ? (
            <span className="text-muted-foreground">Verificando conexão com Resend…</span>
          ) : status.isError ? (
            <div className="text-destructive space-y-1">
              <div>✗ Falha ao consultar Resend</div>
              <div className="font-mono break-all text-[11px] opacity-80">
                {(status.error as Error)?.message ?? String(status.error)}
              </div>
              <button type="button" className="underline" onClick={() => status.refetch()}>Tentar novamente</button>
            </div>
          ) : s?.ok ? (
            <div className="space-y-2">
              <div className="text-emerald-700 dark:text-emerald-400">
                ✓ Conectado — {domains.length} domínio(s) na conta
              </div>
              {domains.length > 0 && (
                <ul className="space-y-1">
                  {domains.map((d) => (
                    <li key={d.name} className="flex items-center gap-2">
                      <Badge variant={d.status === "verified" ? "default" : "secondary"}>{d.status}</Badge>
                      <span className="font-mono">{d.name}</span>
                      {d.region && <span className="text-muted-foreground">· {d.region}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="text-destructive">
              ✗ {s?.message ?? "Falha ao consultar Resend"}
              {s && !s.hasKey && (
                <div className="mt-1 text-muted-foreground">
                  Preencha a Resend API Key acima para ativar o envio.
                </div>
              )}
            </div>
          )}
        </div>

      </Card>

      <Card className="p-6">
        <h3 className="mb-4 font-semibold">Remetente</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Nome do remetente</Label>
            <Input
              placeholder="ForLink"
              defaultValue={cfg.from_name ?? "ForLink"}
              onBlur={(e) => e.target.value !== (cfg.from_name ?? "") && save({ from_name: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">E-mail (from) · domínio verificado na Resend</Label>
            <Input
              placeholder="noreply@forlink.app"
              defaultValue={cfg.from_address ?? ""}
              onBlur={(e) => e.target.value !== (cfg.from_address ?? "") && save({ from_address: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Reply-To (opcional)</Label>
            <Input
              placeholder="contato@forlink.app"
              defaultValue={cfg.reply_to ?? ""}
              onBlur={(e) => e.target.value !== (cfg.reply_to ?? "") && save({ reply_to: e.target.value })}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          O domínio do e-mail precisa aparecer como <strong>verified</strong> na lista acima. Caso contrário, a Resend rejeita o envio.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="mb-2 font-semibold">Notificações do administrador</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Endereço que receberá avisos automáticos de <strong>novo cadastro</strong> e <strong>nova assinatura Pro</strong>. Deixe em branco para desativar.
        </p>
        <div>
          <Label className="text-xs">E-mail do admin</Label>
          <Input
            type="email"
            placeholder="admin@forlink.app"
            defaultValue={cfg.admin_notify_to ?? ""}
            onBlur={(e) => e.target.value !== (cfg.admin_notify_to ?? "") && save({ admin_notify_to: e.target.value.trim() })}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-2 font-semibold">Teste de envio</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Dispara o template <code>welcome</code> para o endereço abaixo usando as configurações atuais.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            placeholder="seu-email@dominio.com"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            className="sm:flex-1"
          />
          <Button onClick={runTest} disabled={testing || !s?.ok}>
            {testing ? "Enviando…" : "Enviar teste"}
          </Button>
        </div>
        {testResult && (
          <div className={`mt-3 rounded-md border p-3 text-xs ${testResult.ok ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
            {testResult.ok ? "✓" : "✗"} {testResult.message}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="mb-2 font-semibold">Templates disparados automaticamente</h3>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["welcome", "Boas-vindas ao novo usuário (após cadastro)"],
            ["email-confirmation", "Confirmação de e-mail"],
            ["payment-confirmed", "Pagamento aprovado (para o assinante)"],
            ["pro-activated", "Plano Pro ativado (para o assinante)"],
            ["admin-new-signup", "Admin · Novo cadastro"],
            ["admin-new-subscriber", "Admin · Nova assinatura Pro"],
            ["subscription-expiring", "Assinatura vence em 3 dias"],
            ["subscription-expired", "Assinatura expirada"],
          ].map(([code, desc]) => (
            <li key={code} className="rounded-md border p-3">
              <code className="text-xs font-medium">{code}</code>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ─────────── PIX Marketplace ─────────── */
interface PixCfg {
  enabled?: boolean;
  fee_percent?: number;
  min_fee_cents?: number;
  oauth_client_id?: string;
  oauth_client_secret?: string;
}
interface PixBadgeItem { key: string; label: string; min_cents: number; color: string; icon: string }

function PixTab({ logAction }: { logAction: (a: string, t?: string, id?: string, m?: Record<string, unknown>) => Promise<void> }) {
  const qc = useQueryClient();

  const cfgQ = useQuery({
    queryKey: ["admin-pix-cfg"],
    queryFn: async () => {
      const [{ data: cfg }, { data: badges }] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", "pix_config").maybeSingle(),
        supabase.from("platform_settings").select("value").eq("key", "pix_badges").maybeSingle(),
      ]);
      return {
        cfg: ((cfg?.value ?? {}) as PixCfg),
        badges: (((badges?.value as { items?: PixBadgeItem[] } | undefined)?.items) ?? []),
      };
    },
  });

  const statsQ = useQuery({
    queryKey: ["admin-pix-stats"],
    queryFn: async () => {
      const [camps, contribs, connected] = await Promise.all([
        supabase.from("pix_campaigns").select("id", { count: "exact", head: true }),
        supabase.from("pix_contributions").select("amount_cents,fee_cents,status").eq("status", "approved"),
        supabase.from("mp_accounts").select("user_id", { count: "exact", head: true }),
      ]);
      const rows = contribs.data ?? [];
      const gross = rows.reduce((n, r) => n + (r.amount_cents ?? 0), 0);
      const platformFees = rows.reduce((n, r) => n + (r.fee_cents ?? 0), 0);
      return {
        campaigns: camps.count ?? 0,
        connected: connected.count ?? 0,
        approved: rows.length,
        gross, platformFees,
      };
    },
  });

  const [form, setForm] = useState<PixCfg>({});
  const [badges, setBadges] = useState<PixBadgeItem[]>([]);
  useEffect(() => {
    if (cfgQ.data) {
      setForm(cfgQ.data.cfg);
      setBadges(cfgQ.data.badges);
    }
  }, [cfgQ.data]);

  const saveCfg = async () => {
    const { error } = await supabase.from("platform_settings").upsert({
      key: "pix_config", value: form as never, description: "Configurações do módulo PIX marketplace",
    } as never, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Configuração PIX salva");
    void logAction("pix_config_update", "settings", "pix_config", form as never);
    qc.invalidateQueries({ queryKey: ["admin-pix-cfg"] });
  };

  const saveBadges = async () => {
    const { error } = await supabase.from("platform_settings").upsert({
      key: "pix_badges", value: { items: badges } as never, description: "Selos por valor de contribuição",
    } as never, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Selos salvos");
    void logAction("pix_badges_update");
    qc.invalidateQueries({ queryKey: ["admin-pix-cfg"] });
  };

  const s = statsQ.data;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Campanhas totais", value: s?.campaigns ?? "—" },
          { label: "Contas MP conectadas", value: s?.connected ?? "—" },
          { label: "Contribuições aprovadas", value: s?.approved ?? "—" },
          { label: "Taxa arrecadada (plataforma)", value: s ? brl(s.platformFees) : "—" },
        ].map((it) => (
          <Card key={it.label} className="p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{it.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{it.value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="font-display text-lg font-semibold">Configurações do gateway</h3>
        <p className="text-sm text-muted-foreground">
          Habilite o módulo, defina a taxa de comissão da plataforma e configure as credenciais OAuth do Mercado Pago Marketplace.
        </p>

        <div className="mt-5 flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Módulo Campanhas ativo</div>
            <div className="text-xs text-muted-foreground">Se desativado, novas contribuições são bloqueadas.</div>
          </div>
          <Switch checked={!!form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Taxa da plataforma (%)</Label>
            <Input type="number" min={0} max={20} step="0.01"
              value={form.fee_percent ?? 0}
              onChange={(e) => setForm({ ...form, fee_percent: Number(e.target.value) })} />
            <p className="mt-1 text-[11px] text-muted-foreground">Enviada como <code>application_fee</code> ao MP.</p>
          </div>
          <div>
            <Label>Taxa mínima (centavos)</Label>
            <Input type="number" min={0} step={1}
              value={form.min_fee_cents ?? 0}
              onChange={(e) => setForm({ ...form, min_fee_cents: Number(e.target.value) })} />
            <p className="mt-1 text-[11px] text-muted-foreground">Ex: 50 = R$ 0,50 mínimo.</p>
          </div>
          <div>
            <Label>OAuth Client ID (App ID)</Label>
            <Input value={form.oauth_client_id ?? ""}
              onChange={(e) => setForm({ ...form, oauth_client_id: e.target.value })}
              placeholder="1234567890123456" />
          </div>
          <div>
            <Label>OAuth Client Secret</Label>
            <Input type="password" value={form.oauth_client_secret ?? ""}
              onChange={(e) => setForm({ ...form, oauth_client_secret: e.target.value })}
              placeholder="••••••••" />
          </div>
        </div>

        <div className="mt-5 rounded-md border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">URL de callback OAuth (configure no MP):</strong><br />
          <code>https://forlink.app/api/public/oauth/mercadopago/callback</code>
          <br /><strong className="text-foreground">Webhook Mercado Pago (assinaturas e campanhas):</strong> <code>https://forlink.app/api/public/webhooks/mercadopago</code>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <MpTestButton />
          <Button onClick={() => void saveCfg()}>Salvar configuração</Button>
        </div>
      </Card>

      <CampaignFeeMatrix />

      <Card className="p-6">

        <h3 className="font-display text-lg font-semibold">Selos SVG oficiais</h3>
        <p className="text-sm text-muted-foreground">
          Selos exibidos automaticamente para cada apoiador com base no valor da contribuição.
          Use as chaves abaixo (<code>bronze</code>, <code>silver</code>, <code>gold</code>, <code>diamond</code>, <code>legend</code>) no editor.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["bronze", "silver", "gold", "diamond", "legend"] as PixBadgeKey[]).map((k) => (
            <div key={k} className="flex flex-col items-center gap-2 rounded-lg border bg-muted/20 p-3">
              <PixBadge badgeKey={k} size={64} />
              <div className="text-center">
                <div className="text-xs font-semibold">{PIX_BADGE_META[k].label}</div>
                <code className="text-[10px] text-muted-foreground">{k}</code>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-display text-lg font-semibold">Selos de apoiadores</h3>
        <p className="text-sm text-muted-foreground">
          Selos são atribuídos automaticamente quando o pagamento é aprovado, conforme o valor.
        </p>

        <div className="mt-4 space-y-2">
          {badges.map((b, i) => (
            <div key={b.key} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[80px_1fr_120px_80px_1fr_auto]">
              <Input value={b.key} onChange={(e) => {
                const arr = [...badges]; arr[i] = { ...b, key: e.target.value }; setBadges(arr);
              }} placeholder="key" />
              <Input value={b.label} onChange={(e) => {
                const arr = [...badges]; arr[i] = { ...b, label: e.target.value }; setBadges(arr);
              }} placeholder="Rótulo" />
              <Input type="number" value={b.min_cents} onChange={(e) => {
                const arr = [...badges]; arr[i] = { ...b, min_cents: Number(e.target.value) }; setBadges(arr);
              }} placeholder="Valor min (centavos)" />
              <Input type="color" value={b.color} onChange={(e) => {
                const arr = [...badges]; arr[i] = { ...b, color: e.target.value }; setBadges(arr);
              }} />
              <Input value={b.icon} onChange={(e) => {
                const arr = [...badges]; arr[i] = { ...b, icon: e.target.value }; setBadges(arr);
              }} placeholder="Ícone (Lucide)" />
              <Button variant="ghost" size="sm" onClick={() => setBadges(badges.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setBadges([...badges, { key: `tier-${badges.length + 1}`, label: "Novo", min_cents: 10000, color: "#0ea5e9", icon: "Award" }])}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar selo
          </Button>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={() => void saveBadges()}>Salvar selos</Button>
        </div>
      </Card>
    </div>
  );
}

function MpTestButton() {
  const runTest = useServerFn(testMpIntegration);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; latency_ms?: number } | null>(null);
  const onClick = async () => {
    setBusy(true); setResult(null);
    try {
      const r = (await runTest({})) as { ok: boolean; message?: string; latency_ms?: number };
      setResult({ ok: r.ok, message: r.message ?? (r.ok ? "OK" : "Falha"), latency_ms: r.latency_ms });
      if (r.ok) toast.success(`Mercado Pago OK · ${r.latency_ms ?? 0}ms`);
      else toast.error(r.message ?? "Falha ao validar Mercado Pago");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      setResult({ ok: false, message: msg });
      toast.error(msg);
    } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={() => void onClick()} disabled={busy}>
        <PlugZap className="mr-2 h-4 w-4" />
        {busy ? "Testando…" : "Testar integração Mercado Pago"}
      </Button>
      {result && (
        <div className={`text-[11px] ${result.ok ? "text-emerald-600" : "text-destructive"}`}>
          {result.ok ? "✔" : "✖"} {result.message}{result.latency_ms ? ` (${result.latency_ms}ms)` : ""}
        </div>
      )}
    </div>
  );
}


function CampaignFeeMatrix() {
  const [free, setFree] = useState<{ fee_pct: number; min_fee_cents: number }>({ fee_pct: 4, min_fee_cents: 50 });
  const [pro, setPro] = useState<{ fee_pct: number; min_fee_cents: number }>({ fee_pct: 1, min_fee_cents: 0 });
  const [admin, setAdmin] = useState<{ fee_pct: number; min_fee_cents: number }>({ fee_pct: 0, min_fee_cents: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("platform_settings").select("value").eq("key", "campaign_fees").maybeSingle();
      const v = (data?.value ?? {}) as Record<string, { fee_pct?: number; min_fee_cents?: number }>;
      if (v.free) setFree({ fee_pct: Number(v.free.fee_pct ?? 4), min_fee_cents: Number(v.free.min_fee_cents ?? 50) });
      if (v.pro) setPro({ fee_pct: Number(v.pro.fee_pct ?? 1), min_fee_cents: Number(v.pro.min_fee_cents ?? 0) });
      if (v.admin) setAdmin({ fee_pct: Number(v.admin.fee_pct ?? 0), min_fee_cents: Number(v.admin.min_fee_cents ?? 0) });
      setLoading(false);
    })();
  }, []);
  const save = async () => {
    setSaving(true);
    const value = { free, pro, admin };
    const { error } = await supabase.from("platform_settings").upsert({
      key: "campaign_fees", value: value as never, description: "Comissão por plano do criador (Free/Pro/Admin)",
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Matriz de taxas salva");
  };
  const row = (label: string, badge: string, state: typeof free, set: (v: typeof free) => void) => (
    <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[140px_1fr_1fr]">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{badge}</div>
      </div>
      <div>
        <Label className="text-[11px]">Taxa (%)</Label>
        <Input type="number" min={0} max={20} step="0.01" value={state.fee_pct}
          onChange={(e) => set({ ...state, fee_pct: Number(e.target.value) })} />
      </div>
      <div>
        <Label className="text-[11px]">Mínimo (centavos)</Label>
        <Input type="number" min={0} step={1} value={state.min_fee_cents}
          onChange={(e) => set({ ...state, min_fee_cents: Number(e.target.value) })} />
      </div>
    </div>
  );
  return (
    <Card className="p-6">
      <h3 className="font-display text-lg font-semibold">Comissão por plano (Fase 3)</h3>
      <p className="text-sm text-muted-foreground">
        Taxa cobrada nas campanhas conforme o plano do criador. Substitui a taxa global do módulo Campanhas.
      </p>
      {loading ? (
        <div className="mt-4 text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="mt-4 space-y-2">
          {row("Free", "Padrão do sistema", free, setFree)}
          {row("Pro", "Taxa reduzida", pro, setPro)}
          {row("Admin", "Isento (opcional)", admin, setAdmin)}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button onClick={() => void save()} disabled={saving || loading}>{saving ? "Salvando…" : "Salvar matriz"}</Button>
      </div>
    </Card>
  );
}
