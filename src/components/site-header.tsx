import { Link } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, User as UserIcon, Shield, Scissors, CreditCard } from "lucide-react";
import { LogoWordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function SiteHeader() {
  const { session, profile, role, signOut, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center" aria-label="ForLink">
          <LogoWordmark className="h-6" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/precos"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            Preços
          </Link>
          <Link
            to="/guias"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            Guias
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              {profile && (
                <Link to="/$username" params={{ username: profile.username }}>
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                    Ver meu perfil
                  </Button>
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full p-1 pr-3 transition hover:bg-accent">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.display_name ?? "Perfil"} />
                      <AvatarFallback>
                        {(profile?.display_name ?? session.user.email ?? "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium sm:inline">
                      {profile?.display_name ?? "Conta"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>{profile ? `@${profile.username}` : session.user.email}</span>
                    {role && <Badge variant="secondary" className="text-[10px] uppercase">{role}</Badge>}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Painel</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/encurtar" className="flex w-full items-center">
                      <Scissors className="mr-2 h-4 w-4" /> Encurtador
                      {role !== "pro" && role !== "admin" && (
                        <Badge variant="outline" className="ml-auto text-[9px] uppercase">Pro</Badge>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/assinatura"><CreditCard className="mr-2 h-4 w-4" /> Assinatura</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings"><UserIcon className="mr-2 h-4 w-4" /> Perfil</Link>
                  </DropdownMenuItem>
                  {role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin"><Shield className="mr-2 h-4 w-4" /> Admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : loading ? (
            <div className="h-8 w-32" aria-hidden />
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                  Criar conta
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
