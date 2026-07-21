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
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, ExternalLink, FolderPlus, Sparkles, Eye, EyeOff, Link2, Lock, GripVertical, Scissors,
  MousePointerClick, BarChart3, TrendingUp, Layers, Trophy, CreditCard,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Painel · ForLink" }, { name: "robots", content: "noindex,nofollow" }] }),
});

interface Category { id: string; name: string; display_order: number; is_visible: boolean; is_public: boolean; icon: string | null; }
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
  const profileStatsQ = useQuery({
    queryKey: ["dash-profile-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("views_count").eq("id", user!.id).maybeSingle();
      return (data?.views_count as number | undefined) ?? 0;
    },
  });
  const activeSubQ = useQuery({
    queryKey: ["dash-active-sub", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("current_period_end,interval,amount_cents")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const cats = catsQ.data ?? [];
  const links = linksQ.data ?? [];
  const profileViews = profileStatsQ.data ?? 0;
  const activeSub = activeSubQ.data;
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
  const toggleCategoryPublic = async (id: string, v: boolean) => {
    const { error } = await supabase.from("user_categories").update({ is_public: v }).eq("id", id);
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
  const persistCategoryOrder = async (ordered: Category[]) => {
    await Promise.all(
      ordered.map((c, idx) =>
        c.display_order === idx
          ? Promise.resolve()
          : supabase.from("user_categories").update({ display_order: idx }).eq("id", c.id),
      ),
    );
    refresh();
  };
  const moveCategory = async (id: string, dir: -1 | 1) => {
    const idx = cats.findIndex((c) => c.id === id);
    if (idx < 0 || idx + dir < 0 || idx + dir >= cats.length) return;
    await persistCategoryOrder(arrayMove(cats, idx, idx + dir));
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
  const persistLinkOrder = async (categoryId: string, ordered: LinkRow[]) => {
    await Promise.all(
      ordered.map((l, idx) =>
        l.display_order === idx
          ? Promise.resolve()
          : supabase.from("links").update({ display_order: idx }).eq("id", l.id),
      ),
    );
    refresh();
  };
  const moveLink = async (id: string, dir: -1 | 1) => {
    const link = links.find((l) => l.id === id)!;
    const siblings = links
      .filter((l) => l.category_id === link.category_id)
      .sort((a, b) => a.display_order - b.display_order);
    const idx = siblings.findIndex((l) => l.id === id);
    if (idx < 0 || idx + dir < 0 || idx + dir >= siblings.length) return;
    await persistLinkOrder(link.category_id, arrayMove(siblings, idx, idx + dir));
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleCategoryDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = cats.findIndex((c) => c.id === active.id);
    const newIdx = cats.findIndex((c) => c.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    void persistCategoryOrder(arrayMove(cats, oldIdx, newIdx));
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
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/encurtar">
              <Button variant="outline" size="sm">
                <Scissors className="mr-2 h-3.5 w-3.5" /> Encurtador
                {isFree && <span className="ml-2 rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">Pro</span>}
              </Button>
            </Link>
            {profile && (
              <Link to="/$username" params={{ username: profile.username }}>
                <Button variant="outline" size="sm"><ExternalLink className="mr-2 h-3.5 w-3.5" /> Ver perfil público</Button>
              </Link>
            )}
          </div>
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
                  : activeSub?.current_period_end
                  ? `Renova em ${new Date(activeSub.current_period_end).toLocaleDateString("pt-BR")}`
                  : "Categorias e links ilimitados"}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/assinatura">
              <Button variant="outline" size="sm">
                <CreditCard className="mr-2 h-3.5 w-3.5" /> Minha assinatura
              </Button>
            </Link>
            {role !== "admin" && (
              <Link to="/assinar">
                <Button variant={role === "pro" ? "outline" : "default"} size="sm">
                  {role === "pro" ? "Renovar" : "Fazer upgrade para Pro"}
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Visão geral */}
        <OverviewSection
          links={links}
          cats={cats}
          profileViews={profileViews}
        />



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
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              Dica: arraste pelo ícone <GripVertical className="inline h-3 w-3 align-[-2px]" /> para reordenar categorias e links.
            </p>
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
              <SortableContext items={cats.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="mt-4 space-y-4">
                  {cats.map((cat, i) => {
                    const catLinks = links.filter((l) => l.category_id === cat.id).sort((a, b) => a.display_order - b.display_order);
                    return (
                      <SortableCategoryCard
                        key={cat.id}
                        cat={cat}
                        index={i}
                        total={cats.length}
                        catLinks={catLinks}
                        cats={cats}
                        isFree={isFree}
                        totalLinks={links.length}
                        sensors={dndSensors}
                        onMoveCategory={moveCategory}
                        onRenameCategory={renameCategory}
                        onToggleCategoryVisible={toggleCategoryVisible}
                        onToggleCategoryPublic={toggleCategoryPublic}
                        onDeleteCategory={deleteCategory}
                        onSaveLink={saveLink}
                        onMoveLink={moveLink}
                        onDeleteLink={deleteLink}
                        onToggleLinkVisible={toggleLinkVisible}
                        onPersistLinkOrder={persistLinkOrder}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </main>
    </div>
  );
}

type SortableCategoryCardProps = {
  cat: Category;
  index: number;
  total: number;
  catLinks: LinkRow[];
  cats: Category[];
  isFree: boolean;
  totalLinks: number;
  sensors: ReturnType<typeof useSensors>;
  onMoveCategory: (id: string, dir: -1 | 1) => void;
  onRenameCategory: (id: string, name: string) => void;
  onToggleCategoryVisible: (id: string, v: boolean) => void;
  onToggleCategoryPublic: (id: string, v: boolean) => void;
  onDeleteCategory: (id: string) => void;
  onSaveLink: (d: Partial<LinkRow> & { category_id: string; title: string; url: string }) => Promise<boolean>;
  onMoveLink: (id: string, dir: -1 | 1) => void;
  onDeleteLink: (id: string) => void;
  onToggleLinkVisible: (id: string, v: boolean) => void;
  onPersistLinkOrder: (categoryId: string, ordered: LinkRow[]) => Promise<void>;
};

function SortableCategoryCard(props: SortableCategoryCardProps) {
  const {
    cat, index, total, catLinks, cats, isFree, totalLinks, sensors,
    onMoveCategory, onRenameCategory, onToggleCategoryVisible, onToggleCategoryPublic,
    onDeleteCategory, onSaveLink, onMoveLink, onDeleteLink, onToggleLinkVisible, onPersistLinkOrder,
  } = props;
  const sortable = useSortable({ id: cat.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.6 : 1,
  };

  const handleLinkDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = catLinks.findIndex((l) => l.id === active.id);
    const newIdx = catLinks.findIndex((l) => l.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    void onPersistLinkOrder(cat.id, arrayMove(catLinks, oldIdx, newIdx));
  };

  return (
    <div ref={sortable.setNodeRef} style={style}>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              {...sortable.attributes}
              {...sortable.listeners}
              className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
              title="Arraste para reordenar categoria"
              aria-label="Arraste para reordenar categoria"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex flex-col">
              <button disabled={index === 0} onClick={() => onMoveCategory(cat.id, -1)} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button disabled={index === total - 1} onClick={() => onMoveCategory(cat.id, 1)} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <RenameableTitle name={cat.name} onSave={(n) => onRenameCategory(cat.id, n)} />
            {!cat.is_visible && <Badge variant="outline" className="text-[10px]"><EyeOff className="mr-1 h-3 w-3" /> Rascunho</Badge>}
            {cat.is_visible && !cat.is_public && <Badge variant="secondary" className="text-[10px]"><Lock className="mr-1 h-3 w-3" /> Privada</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Publicar (visível no perfil) ou manter como rascunho">
              <span>Publicar</span>
              <Switch checked={cat.is_visible} onCheckedChange={(v) => onToggleCategoryVisible(cat.id, v)} />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Público: todos veem. Privado: só você (logado) vê no seu perfil.">
              <span>Pública</span>
              <Switch checked={cat.is_public} onCheckedChange={(v) => onToggleCategoryPublic(cat.id, v)} disabled={!cat.is_visible} />
            </label>
            <NewLinkDialog categories={cats} defaultCategoryId={cat.id} onSave={onSaveLink} disabled={isFree && totalLinks >= FREE_MAX_LINKS} />
            <Button variant="ghost" size="icon" onClick={() => onDeleteCategory(cat.id)}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="divide-y">
          {catLinks.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhum link ainda. Clique em <strong>+ Link</strong> para adicionar.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLinkDragEnd}>
              <SortableContext items={catLinks.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                {catLinks.map((l, j) => (
                  <SortableLinkRow
                    key={l.id}
                    link={l}
                    index={j}
                    total={catLinks.length}
                    cats={cats}
                    catId={cat.id}
                    onMoveLink={onMoveLink}
                    onSaveLink={onSaveLink}
                    onDeleteLink={onDeleteLink}
                    onToggleLinkVisible={onToggleLinkVisible}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </Card>
    </div>
  );
}

function SortableLinkRow({
  link: l, index: j, total, cats, catId, onMoveLink, onSaveLink, onDeleteLink, onToggleLinkVisible,
}: {
  link: LinkRow; index: number; total: number; cats: Category[]; catId: string;
  onMoveLink: (id: string, dir: -1 | 1) => void;
  onSaveLink: (d: Partial<LinkRow> & { category_id: string; title: string; url: string }) => Promise<boolean>;
  onDeleteLink: (id: string) => void;
  onToggleLinkVisible: (id: string, v: boolean) => void;
}) {
  const sortable = useSortable({ id: l.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
    background: sortable.isDragging ? "var(--muted)" : undefined,
  };
  return (
    <div ref={sortable.setNodeRef} style={style} className="flex items-center gap-3 px-5 py-3">
      <button
        {...sortable.attributes}
        {...sortable.listeners}
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        title="Arraste para reordenar link"
        aria-label="Arraste para reordenar link"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex flex-col">
        <button disabled={j === 0} onClick={() => onMoveLink(l.id, -1)} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button disabled={j === total - 1} onClick={() => onMoveLink(l.id, 1)} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
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
        <Button variant="ghost" size="icon" title={l.is_visible ? "Ocultar" : "Publicar"} onClick={() => onToggleLinkVisible(l.id, !l.is_visible)}>
          {l.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        <NewLinkDialog categories={cats} defaultCategoryId={catId} editing={l} onSave={onSaveLink} triggerAsIcon />
        <Button variant="ghost" size="icon" onClick={() => onDeleteLink(l.id)}>
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
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
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader><DialogTitle>{editing ? "Editar link" : "Adicionar link"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-3 overflow-hidden rounded-lg border bg-muted/30 p-3">
            {preview ? (
              <img src={preview} alt="" className="h-10 w-10 shrink-0 rounded-md border bg-white object-contain p-1.5" />
            ) : (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border bg-white text-muted-foreground">
                <Link2 className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="truncate text-sm font-medium">{title || "Título do link"}</div>
              <div className="truncate text-xs text-muted-foreground" title={url || undefined}>
                {url || "https://..."}
              </div>
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

/* -------------------------- Visão geral (stats) -------------------------- */

const CHART_COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#3730a3", "#4338ca"];

function OverviewSection({
  links, cats, profileViews,
}: { links: LinkRow[]; cats: Category[]; profileViews: number }) {
  const totalLinks = links.length;
  const totalClicks = links.reduce((s, l) => s + (l.clicks_count ?? 0), 0);
  const visibleLinks = links.filter((l) => l.is_visible).length;
  const visibleCats = cats.filter((c) => c.is_visible).length;
  const avgClicks = totalLinks ? totalClicks / totalLinks : 0;
  const ctr = profileViews > 0 ? (totalClicks / profileViews) * 100 : 0;

  const topLinks = [...links]
    .sort((a, b) => (b.clicks_count ?? 0) - (a.clicks_count ?? 0))
    .slice(0, 5)
    .map((l) => ({ name: l.title.length > 22 ? l.title.slice(0, 22) + "…" : l.title, clicks: l.clicks_count ?? 0 }));

  const byCategory = cats
    .map((c) => ({
      name: c.name,
      clicks: links.filter((l) => l.category_id === c.id).reduce((s, l) => s + (l.clicks_count ?? 0), 0),
      count: links.filter((l) => l.category_id === c.id).length,
    }))
    .filter((c) => c.count > 0);

  const catsWithClicks = byCategory.filter((c) => c.clicks > 0);

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-brand" />
        <h2 className="text-lg font-semibold">Visão geral</h2>
      </div>

      {/* KPI grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Eye className="h-4 w-4" />}
          label="Visualizações do perfil"
          value={profileViews.toLocaleString("pt-BR")}
          hint="Únicas por sessão"
        />
        <KpiCard
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Cliques totais"
          value={totalClicks.toLocaleString("pt-BR")}
          hint={`Média de ${avgClicks.toFixed(1)} por link`}
          accent
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Taxa de conversão"
          value={`${ctr.toFixed(1)}%`}
          hint="Cliques / visualizações"
        />
        <KpiCard
          icon={<Layers className="h-4 w-4" />}
          label="Conteúdo publicado"
          value={`${visibleLinks} / ${totalLinks}`}
          hint={`${visibleCats} categoria${visibleCats === 1 ? "" : "s"} visível${visibleCats === 1 ? "" : "eis"}`}
        />
      </div>

      {/* Charts */}
      {totalLinks > 0 && (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-brand" />
              <h3 className="text-sm font-semibold">Top 5 links por cliques</h3>
            </div>
            {topLinks.some((l) => l.clicks > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topLinks} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                      formatter={(v: number) => [`${v} cliques`, ""]}
                    />
                    <Bar dataKey="clicks" radius={[0, 6, 6, 0]}>
                      {topLinks.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Nenhum clique registrado ainda" />
            )}
          </Card>

          <Card className="lg:col-span-2 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand" />
              <h3 className="text-sm font-semibold">Cliques por categoria</h3>
            </div>
            {catsWithClicks.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                      formatter={(v: number, _n, item: any) => [`${v} cliques`, item?.payload?.name]}
                    />
                    <Pie
                      data={catsWithClicks}
                      dataKey="clicks"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {catsWithClicks.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Sem cliques por categoria" />
            )}
            {catsWithClicks.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {catsWithClicks.slice(0, 5).map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{c.clicks}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </section>
  );
}

function KpiCard({
  icon, label, value, hint, accent,
}: { icon: React.ReactNode; label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? "border-brand/40 bg-brand-soft/40" : ""}`}>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <span className={accent ? "text-brand" : ""}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  );
}

