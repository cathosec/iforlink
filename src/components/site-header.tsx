import { Link } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, User as UserIcon, Shield, Scissors } from "lucide-react";
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


        <div className="flex items-center gap-2">
          {loading ? null : session && profile ? (
            <>
              <Link to="/$username" params={{ username: profile.username }}>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Ver meu perfil
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full p-1 pr-3 transition hover:bg-accent">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
                      <AvatarFallback>{profile.display_name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium sm:inline">{profile.display_name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>@{profile.username}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase">{role}</Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Painel</Link>
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
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                  Criar conta grátis
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
