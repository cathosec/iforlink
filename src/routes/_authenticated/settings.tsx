import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Upload, Trash2, ShieldAlert, Download, Plus, X } from "lucide-react";
import { PushToggle } from "@/components/push-toggle";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_MAP,
  SocialIcon,
  normalizeSocialLinks,
  type SocialLinkEntry,
} from "@/lib/social-links";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Perfil · ForLink" }, { name: "robots", content: "noindex,nofollow" }] }),
});



async function fileToSquareBlob(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const s = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - s) / 2;
  const sy = (bitmap.height - s) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, s, s, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.88,
    ),
  );
}

function Settings() {
  const { user, profile, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [socials, setSocials] = useState<SocialLinkEntry[]>([]);
  const [savingSocials, setSavingSocials] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const runDelete = useServerFn(deleteMyAccount);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setSocials(normalizeSocialLinks(profile.social_links));
    }
  }, [profile]);

  const addSocial = (key: string) => {
    if (socials.some((s) => s.key === key)) return;
    setSocials((prev) => [...prev, { key, value: "" }]);
  };
  const updateSocial = (key: string, value: string) => {
    setSocials((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };
  const removeSocial = (key: string) => {
    setSocials((prev) => prev.filter((s) => s.key !== key));
  };
  const saveSocials = async () => {
    if (!user) return;
    setSavingSocials(true);
    const payload = socials
      .map((s) => ({ key: s.key, value: s.value.trim() }))
      .filter((s) => s.value.length > 0);
    const { error } = await supabase
      .from("profiles")
      .update({ social_links: payload })
      .eq("id", user.id);
    setSavingSocials(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Redes sociais atualizadas");
    await refresh();
  };


  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!user) return;
    if (!file.type.startsWith("image/")) return toast.error("Envie uma imagem.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem muito grande (máx. 5 MB).");
    setUploading(true);
    try {
      const blob = await fileToSquareBlob(file, 512);
      const path = `${user.id}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          upsert: true,
          contentType: "image/jpeg",
          cacheControl: "3600",
        });
      if (upErr) throw upErr;
      const publicUrl = `/api/public/avatar/${user.id}.jpg?v=${Date.now()}`;
      // Persiste imediatamente para não perder ao sair sem clicar em Salvar
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(publicUrl);
      await refresh();
      toast.success("Foto atualizada");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.toLowerCase().trim(),
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("username_format")
          ? "Nome de usuário inválido (3-32 caracteres: letras, números, hífens)."
          : error.message.includes("duplicate")
            ? "Este @usuario já está em uso."
            : error.message,
      );
      return;
    }
    toast.success("Perfil atualizado");
    await refresh();
  };

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [profileRes, linksRes, catsRes, rolesRes, subsRes, pixRes, shortRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("links").select("*").eq("user_id", user.id),
        supabase.from("user_categories").select("*").eq("user_id", user.id),
        supabase.from("user_roles").select("*").eq("user_id", user.id),
        supabase.from("subscriptions").select("*").eq("user_id", user.id),
        supabase.from("pix_payments").select("*").eq("user_id", user.id),
        supabase.from("short_links").select("*").eq("user_id", user.id),
      ]);
      const bundle = {
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email },
        profile: profileRes.data,
        roles: rolesRes.data,
        categories: catsRes.data,
        links: linksRes.data,
        subscriptions: subsRes.data,
        pix_payments: pixRes.data,
        short_links: shortRes.data,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `forlink-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Portabilidade gerada");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível gerar seus dados.");
    } finally {
      setExporting(false);
    }
  };

  const onDelete = async () => {
    if (deleteConfirm !== "EXCLUIR") {
      toast.error('Digite EXCLUIR para confirmar.');
      return;
    }
    setDeleting(true);
    try {
      await runDelete({ data: { confirm: "EXCLUIR" } });
      toast.success("Conta excluída. Até logo.");
      await signOut();
      navigate({ to: "/" });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Falha ao excluir conta.");
    } finally {
      setDeleting(false);
    }
  };

  const initials = (displayName || username || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl tracking-tight">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Como você aparece publicamente.</p>

        <Card className="mt-8 p-6">
          <form onSubmit={save} className="space-y-6">
            <div className="flex items-center gap-5">
              <Avatar className="h-20 w-20 border">
                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  {uploading ? "Processando…" : avatarUrl ? "Trocar foto" : "Enviar foto"}
                </Button>
                {avatarUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl("")}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Remover
                  </Button>
                )}
                <p className="w-full text-xs text-muted-foreground">JPG ou PNG, quadrado. Máx. 5 MB.</p>
              </div>
            </div>

            <div>
              <Label>Nome de usuário</Label>
              <div className="mt-1.5 flex items-center rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring">
                <span className="pl-3 text-sm text-muted-foreground">forlink.app/</span>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} className="border-0 shadow-none focus-visible:ring-0" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">3 a 32 caracteres, apenas letras minúsculas, números e hífens.</p>
            </div>
            <div>
              <Label>Nome de exibição</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1.5" placeholder="Uma linha rápida sobre você." />
            </div>
            <Button type="submit" disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {saving ? "Salvando…" : "Salvar alterações"}
            </Button>
          </form>
        </Card>

        <Card className="mt-8 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Redes sociais</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Aparecem como ícones oficiais abaixo dos seus links, no seu perfil público.
              </p>
            </div>
          </div>

          {socials.length > 0 && (
            <div className="mt-5 space-y-2.5">
              {socials.map((s) => {
                const p = SOCIAL_MAP[s.key];
                if (!p) return null;
                return (
                  <div
                    key={s.key}
                    className="flex items-center gap-2 rounded-lg border bg-background/60 p-2"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white"
                      style={{ backgroundColor: p.brand }}
                    >
                      <SocialIcon platform={p} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-muted-foreground">{p.label}</div>
                      <Input
                        value={s.value}
                        onChange={(e) => updateSocial(s.key, e.target.value)}
                        placeholder={p.placeholder}
                        className="mt-0.5 h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSocial(s.key)}
                      aria-label={`Remover ${p.label}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5">
            <div className="text-xs font-medium text-muted-foreground">Adicionar rede</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.filter((p) => !socials.some((s) => s.key === p.key)).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => addSocial(p.key)}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-transparent hover:bg-accent"
                >
                  <span
                    className="grid h-4 w-4 place-items-center rounded-sm text-white"
                    style={{ color: p.brand }}
                  >
                    <SocialIcon platform={p} className="h-3.5 w-3.5" />
                  </span>
                  {p.label}
                  <Plus className="h-3 w-3 opacity-60" />
                </button>
              ))}
              {SOCIAL_PLATFORMS.every((p) => socials.some((s) => s.key === p.key)) && (
                <p className="text-xs text-muted-foreground">Todas as redes suportadas já foram adicionadas.</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              onClick={saveSocials}
              disabled={savingSocials}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {savingSocials ? "Salvando…" : "Salvar redes sociais"}
            </Button>
          </div>
        </Card>

        <PushToggle />

        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold tracking-tight">Privacidade e dados (LGPD)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Você é titular dos seus dados. Exercite seus direitos previstos no art. 18 da Lei 13.709/2018.
            Consulte a <Link to="/privacidade" className="text-brand hover:underline">Política de Privacidade</Link> para
            detalhes sobre finalidades, bases legais, retenção e compartilhamento.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={exportData} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Preparando…" : "Baixar meus dados (JSON)"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <a href="mailto:contato@forlink.app?subject=Solicitação%20LGPD">Falar com o encarregado (DPO)</a>
            </Button>
          </div>
        </Card>

        <Card className="mt-8 border-destructive/40 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold tracking-tight text-destructive">Excluir minha conta</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ao excluir sua conta, apagamos permanentemente: perfil público, avatar, links,
                categorias, encurtadores, papel de acesso, assinaturas e histórico de PIX associado a você.
                Esta ação é <strong>irreversível</strong> e concluída imediatamente. Registros mínimos
                exigidos por obrigação legal (fiscal/financeira) podem ser retidos pelo prazo legal, de
                forma segregada e sem uso comercial.
              </p>
              <ul className="mt-3 list-disc pl-5 text-xs text-muted-foreground">
                <li>Sua URL <code>forlink.app/{username || "seu-usuario"}</code> ficará disponível para outros usuários.</li>
                <li>Assinaturas Pro em curso serão canceladas — reembolsos seguem o CDC (art. 49) quando aplicável.</li>
                <li>Você receberá confirmação por e-mail caso as notificações estejam ativas.</li>
              </ul>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="mt-4">
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir conta permanentemente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão de conta</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação apagará todos os seus dados pessoais e conteúdos publicados na ForLink e
                      não poderá ser desfeita. Para confirmar, digite <strong>EXCLUIR</strong> abaixo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="EXCLUIR"
                    autoComplete="off"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirm("")}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      disabled={deleting || deleteConfirm !== "EXCLUIR"}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? "Excluindo…" : "Excluir agora"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
