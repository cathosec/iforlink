import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getFaviconUrl, normalizeUrl } from "@/lib/favicon";
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, ExternalLink, FolderPlus, Sparkles, Eye, EyeOff, Link2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Painel · ForLink" }] }),
});

interface Category { id: string; name: string; display_order: number; is_visible: boolean; }
interface LinkRow {
  id: string; category_id: string; title: string; description: string | null;
  url: string; favicon_url: string | null; clicks_count: number; is_visible: boolean; display_order: number;
}

const FREE_MAX_CATS = 3;
const FREE_MAX_LINKS = 15;

function Dashboard() {
  const { user, profile, role } = useAuth();
  const qc = useQueryClient();

  const catsQ = useQuery({
    queryKey: ["dash-cats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_categories").select("*").eq("user_id", user!.id).order("display_order");
      return (data as Category[]) ?? [];
    },
  });
  const linksQ = useQuery({
    queryKey: ["dash-links", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("links").select("*").eq("user_id", user!.id).order("display_order");
      return (data as LinkRow[]) ?? [];
    },
  });

  const cats = catsQ.data ?? [];
  const links = linksQ.data ?? [];
  const isFree = role === "free";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dash-cats", user?.id] });
    qc.invalidateQueries({ queryKey: ["dash-links", user?.id] });
  };

  const addCategory = async (name: string) => {
    if (isFree && cats.length >= FREE_MAX_CATS) {
      toast.error(`Plano Free permite ${FREE_MAX_CATS} categorias.`);
      return false;
    }
    const { error } = await supabase.from("user_categories").insert({
      user_id: user!.id, name, display_order: cats.length,
    });
    if (error) { toast.error(error.message); return false; }
    toast.success("Categoria criada");
    refresh();
    return true;
  };

  const renameCategory = async (id: string, name: string) => {
    const { error } = await supabase.from("user_categories").update({ name }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const toggleCategoryVisible = async (id: string, v: boolean) => {
    const { error } = await supabase.from("user_categories").update({ is_visible: v }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const deleteCategory = async (id: string) => {
    if (!confirm("Excluir esta categoria e todos os seus links?")) return;
    const { error } = await supabase.from("user_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída");
    refresh();
  };
  const moveCategory = async (id: string, dir: -1 | 1) => {
    const idx = cats.findIndex((c) => c.id === id);
    const swap = cats[idx + dir];
    if (!swap) return;
    await supabase.from("user_categories").update({ display_order: swap.display_order }).eq("id", id);
    await supabase.from("user_categories").update({ display_order: cats[idx].display_order }).eq("id", swap.id);
    refresh();
  };

  const saveLink = async (data: Partial<LinkRow> & { category_id: string; title: string; url: string }) => {
    if (isFree && !data.id && links.length >= FREE_MAX_LINKS) {
      toast.error(`Plano Free permite ${FREE_MAX_LINKS} links.`);
      return false;
    }
    const url = normalizeUrl(data.url);
    const favicon_url = getFaviconUrl(url);
    if (data.id) {
      const { error } = await supabase.from("links").update({
        title: data.title, description: data.description ?? null, url, favicon_url, category_id: data.category_id,
      }).eq("id", data.id);
      if (error) { toast.error(error.message); return false; }
      toast.success("Link atualizado");
    } else {
      const catLinks = links.filter((l) => l.category_id === data.category_id);
      const { error } = await supabase.from("links").insert({
        user_id: user!.id, category_id: data.category_id, title: data.title,
        description: data.description ?? null, url, favicon_url, display_order: catLinks.length,
      });
      if (error) { toast.error(error.message); return false; }
      toast.success("Link adicionado");
    }
    refresh();
    return true;
  };
  const deleteLink = async (id: string) => {
    if (!confirm("Excluir este link?")) return;
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const toggleLinkVisible = async (id: string, v: boolean) => {
    const { error } = await supabase.from("links").update({ is_visible: v }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const moveLink = async (id: string, dir: -1 | 1) => {
    const link = links.find((l) => l.id === id)!;
    const siblings = links.filter((l) => l.category_id === link.category_id).sort((a, b) => a.display_order - b.display_order);
    const idx = siblings.findIndex((l) => l.id === id);
    const swap = siblings[idx + dir];
    if (!swap) return;
    await supabase.from("links").update({ display_order: swap.display_order }).eq("id", id);
    await supabase.from("links").update({ display_order: link.display_order }).eq("id", swap.id);
    refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Painel</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize suas categorias e links. Alterações são publicadas na hora.
            </p>
          </div>
          {profile && (
            <Link to="/$username" params={{ username: profile.username }}>
              <Button variant="outline" size="sm"><ExternalLink className="mr-2 h-3.5 w-3.5" /> Ver perfil público</Button>
            </Link>
          )}
        </div>

        {/* Plano */}
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Plano {role === "pro" ? "Pro" : role === "admin" ? "Admin" : "Free"}</div>
              <div className="text-xs text-muted-foreground">
                {isFree
                  ? `${cats.length}/${FREE_MAX_CATS} categorias · ${links.length}/${FREE_MAX_LINKS} links`
                  : "Categorias e links ilimitados"}
              </div>
            </div>
          </div>
          {role !== "admin" && (
            <Link to="/assinar"><Button variant={role === "pro" ? "outline" : "default"} size="sm">
              {role === "pro" ? "Renovar assinatura" : "Fazer upgrade para Pro"}
            </Button></Link>
          )}
        </Card>

        {user?.id && <SubscriptionCard userId={user.id} />}


        {/* Nova categoria */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Categorias</h2>
          <NewCategoryDialog onCreate={addCategory} disabled={isFree && cats.length >= FREE_MAX_CATS} />
        </div>

        {cats.length === 0 ? (
          <Card className="mt-4 border-dashed p-12 text-center">
            <FolderPlus className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">Comece criando sua primeira categoria</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Por exemplo: <em>"Meus projetos"</em>, <em>"Redes sociais"</em> ou <em>"Leituras favoritas"</em>.
            </p>
          </Card>
        ) : (
          <div className="mt-4 space-y-4">
            {cats.map((cat, i) => {
              const catLinks = links.filter((l) => l.category_id === cat.id).sort((a, b) => a.display_order - b.display_order);
              return (
                <Card key={cat.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <button disabled={i === 0} onClick={() => moveCategory(cat.id, -1)} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button disabled={i === cats.length - 1} onClick={() => moveCategory(cat.id, 1)} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <RenameableTitle name={cat.name} onSave={(n) => renameCategory(cat.id, n)} />
                      {!cat.is_visible && <Badge variant="outline" className="text-[10px]"><EyeOff className="mr-1 h-3 w-3" /> Rascunho</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Público</span>
                        <Switch checked={cat.is_visible} onCheckedChange={(v) => toggleCategoryVisible(cat.id, v)} />
                      </div>
                      <NewLinkDialog categories={cats} defaultCategoryId={cat.id} onSave={saveLink} disabled={isFree && links.length >= FREE_MAX_LINKS} />
                      <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  <div className="divide-y">
                    {catLinks.length === 0 ? (
                      <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                        Nenhum link ainda. Clique em <strong>+ Link</strong> para adicionar.
                      </div>
                    ) : catLinks.map((l, j) => (
                      <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex flex-col">
                          <button disabled={j === 0} onClick={() => moveLink(l.id, -1)} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button disabled={j === catLinks.length - 1} onClick={() => moveLink(l.id, 1)} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <img
                          src={l.favicon_url ?? getFaviconUrl(l.url) ?? ""}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-md border bg-white object-contain p-1.5"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{l.title}</span>
                            {!l.is_visible && <Badge variant="outline" className="text-[10px]">Rascunho</Badge>}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{l.url}</div>
                        </div>
                        <div className="hidden text-right text-xs text-muted-foreground sm:block">
                          <div>{l.clicks_count}</div>
                          <div>cliques</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" title={l.is_visible ? "Ocultar" : "Publicar"} onClick={() => toggleLinkVisible(l.id, !l.is_visible)}>
                            {l.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <NewLinkDialog categories={cats} defaultCategoryId={cat.id} editing={l} onSave={saveLink} triggerAsIcon />
                          <Button variant="ghost" size="icon" onClick={() => deleteLink(l.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function RenameableTitle({ name, onSave }: { name: string; onSave: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  if (!editing) {
    return (
      <button className="text-base font-semibold hover:text-brand" onClick={() => { setVal(name); setEditing(true); }}>
        {name}
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(val.trim() || name); setEditing(false); }}
      className="flex items-center gap-1"
    >
      <Input value={val} onChange={(e) => setVal(e.target.value)} autoFocus className="h-8 w-48" />
      <Button size="sm" type="submit" variant="ghost">OK</Button>
    </form>
  );
}

function NewCategoryDialog({ onCreate, disabled }: { onCreate: (n: string) => Promise<boolean>; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="mr-1.5 h-4 w-4" /> Nova categoria
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Redes sociais" className="mt-1.5" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!name.trim()) return;
              const ok = await onCreate(name.trim());
              if (ok) { setName(""); setOpen(false); }
            }}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewLinkDialog({
  categories, defaultCategoryId, editing, onSave, disabled, triggerAsIcon,
}: {
  categories: Category[]; defaultCategoryId: string;
  editing?: LinkRow;
  onSave: (d: Partial<LinkRow> & { category_id: string; title: string; url: string }) => Promise<boolean>;
  disabled?: boolean; triggerAsIcon?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [url, setUrl] = useState(editing?.url ?? "");
  const [desc, setDesc] = useState(editing?.description ?? "");
  const [catId, setCatId] = useState(editing?.category_id ?? defaultCategoryId);
  const preview = url.trim() ? getFaviconUrl(normalizeUrl(url)) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o && !editing) { setTitle(""); setUrl(""); setDesc(""); setCatId(defaultCategoryId); }
    }}>
      <DialogTrigger asChild>
        {triggerAsIcon ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button variant="outline" size="sm" disabled={disabled}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Link
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Editar link" : "Adicionar link"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            {preview ? (
              <img src={preview} alt="" className="h-10 w-10 rounded-md border bg-white object-contain p-1.5" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-md border bg-white text-muted-foreground">
                <Link2 className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{title || "Título do link"}</div>
              <div className="truncate text-xs text-muted-foreground">{url || "https://..."}</div>
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemplo.com" className="mt-1.5" />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={desc ?? ""} onChange={(e) => setDesc(e.target.value)} rows={2} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!title.trim() || !url.trim() || !catId) return;
              const ok = await onSave({
                id: editing?.id, category_id: catId, title: title.trim(), url: url.trim(), description: desc?.trim() || null,
              });
              if (ok) setOpen(false);
            }}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {editing ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
