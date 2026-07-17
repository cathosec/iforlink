import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Perfil · ForLink" }] }),
});

function Settings() {
  const { user, profile, refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      username: username.toLowerCase().trim(),
      display_name: displayName.trim(),
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    }).eq("id", user!.id);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("username_format") ? "Nome de usuário inválido (3-32 caracteres: letras, números, hífens)." : error.message.includes("duplicate") ? "Este @usuario já está em uso." : error.message);
      return;
    }
    toast.success("Perfil atualizado");
    await refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl tracking-tight">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Como você aparece publicamente.</p>

        <Card className="mt-8 p-6">
          <form onSubmit={save} className="space-y-5">
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
            <div>
              <Label>URL do avatar</Label>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="mt-1.5" placeholder="https://…" />
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
