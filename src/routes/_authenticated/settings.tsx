import { createFileRoute } from "@tanstack/react-router";
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
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Perfil · ForLink" }, { name: "robots", content: "noindex,nofollow" }] }),
});

const PUBLIC_ORIGIN = "https://forlink.app";

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
  const { user, profile, refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

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
      const publicUrl = `${PUBLIC_ORIGIN}/api/public/avatar/${user.id}.jpg?v=${Date.now()}`;
      setAvatarUrl(publicUrl);
      toast.success("Foto enviada — clique em Salvar.");
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
      </main>
    </div>
  );
}
