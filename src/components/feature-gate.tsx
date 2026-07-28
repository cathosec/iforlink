import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFlag, type FeatureFlags } from "@/lib/flags";

export function FeatureGate({
  flag,
  title,
  children,
}: {
  flag: keyof FeatureFlags;
  title: string;
  children: React.ReactNode;
}) {
  const enabled = useFlag(flag);
  if (enabled) return <>{children}</>;
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">{title} indisponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este recurso está temporariamente desabilitado pela administração da plataforma.
          Volte em instantes.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Voltar ao painel</Link>
        </Button>
      </Card>
    </div>
  );
}
