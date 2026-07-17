import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Users, Link2, BadgeCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Admin · ForLink" }] }),
});

interface AdminProfile {
  id: string; username: string; display_name: string; is_verified: boolean; views_count: number; created_at: string;
}
type RoleName = "free" | "pro" | "admin";

function Admin() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && role !== "admin") {
      toast.error("Acesso restrito a administradores");
      navigate({ to: "/dashboard" });
    }
  }, [loading, role, navigate]);

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled: role === "admin",
    queryFn: async () => {
      const [profiles, links] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("links").select("id", { count: "exact", head: true }),
      ]);
      return { profiles: profiles.count ?? 0, links: links.count ?? 0 };
    },
  });

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    enabled: role === "admin",
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,username,display_name,is_verified,views_count,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
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

  const setRole = async (userId: string, newRole: RoleName) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const setVerified = async (userId: string, v: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: v }).eq("id", userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  if (role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-4xl tracking-tight">Painel do administrador</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie usuários, planos e verificações.</p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand-soft text-brand"><Users className="h-6 w-6" /></div>
            <div>
              <div className="text-2xl font-semibold">{stats.data?.profiles ?? "—"}</div>
              <div className="text-xs text-muted-foreground">Perfis cadastrados</div>
            </div>
          </Card>
          <Card className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand-soft text-brand"><Link2 className="h-6 w-6" /></div>
            <div>
              <div className="text-2xl font-semibold">{stats.data?.links ?? "—"}</div>
              <div className="text-xs text-muted-foreground">Links publicados</div>
            </div>
          </Card>
        </div>

        <Card className="mt-8 overflow-hidden">
          <div className="border-b bg-muted/30 px-5 py-3 font-semibold">Usuários</div>
          {usersQ.isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <div className="divide-y">
              {(usersQ.data ?? []).map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.display_name}</span>
                      {u.is_verified && <BadgeCheck className="h-4 w-4 text-brand" />}
                      <Badge variant="outline" className="text-[10px] uppercase">{u.role}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">@{u.username} · {u.views_count} views</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span>Verificado</span>
                    <Switch checked={u.is_verified} onCheckedChange={(v) => setVerified(u.id, v)} />
                  </div>
                  <Select value={u.role} onValueChange={(v) => setRole(u.id, v as RoleName)}>
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Link to="/$username" params={{ username: u.username }}>
                    <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
