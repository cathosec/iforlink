import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { LogoWordmark } from "@/components/logo";
import { CookieConsent } from "@/components/cookie-consent";
import { AdSlot } from "@/components/ad-slot";
import { GoogleAnalytics } from "@/components/google-analytics";
import { AnalyticsProvider } from "@/lib/analytics";
import { InstallPrompt } from "@/components/install-prompt";
import { PushReminder } from "@/components/push-reminder";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Link to="/" className="flex items-center gap-2">
            <LogoWordmark />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Erro 404
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Este link não existe por aqui.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A página que você tentou abrir pode ter sido removida, renomeada
            ou nunca existiu no ForLink. Confira o endereço ou volte para
            explorar perfis públicos do diretório.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
            >
              Ir para o início
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Entrar
            </Link>
          </div>

          <div className="mt-10 rounded-lg border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Atalhos
            </p>
            <ul className="mt-3 divide-y">
              <li>
                <Link to="/" className="flex items-center justify-between py-2 text-sm hover:text-brand">
                  <span>Página inicial</span>
                  <span className="text-muted-foreground">/</span>
                </Link>
              </li>
              <li>
                <Link to="/auth" className="flex items-center justify-between py-2 text-sm hover:text-brand">
                  <span>Criar conta / entrar</span>
                  <span className="text-muted-foreground">/auth</span>
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="flex items-center justify-between py-2 text-sm hover:text-brand">
                  <span>Meu painel</span>
                  <span className="text-muted-foreground">/dashboard</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground">
          ForLink · forlink.app
        </div>
      </footer>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente recarregar ou volte para a página inicial.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#003399" },
      { name: "application-name", content: "ForLink" },
      { name: "apple-mobile-web-app-title", content: "ForLink" },
      { name: "format-detection", content: "telephone=no" },
      { name: "author", content: "ForLink" },
      { name: "publisher", content: "ForLink" },
      { httpEquiv: "content-language", content: "pt-BR" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "ForLink" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@forlinkapp" },
      { name: "robots", content: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" },
      { name: "googlebot", content: "index,follow,max-image-preview:large,max-snippet:-1" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/svg+xml", href: "/brand/favicon.svg" },
      { rel: "apple-touch-icon", href: "/pwa/apple-touch-icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://forlink.app/#organization",
              name: "ForLink",
              url: "https://forlink.app",
              logo: "https://forlink.app/brand/mark-color.svg",
              sameAs: [],
            },
            {
              "@type": "WebSite",
              "@id": "https://forlink.app/#website",
              url: "https://forlink.app",
              name: "ForLink",
              inLanguage: "pt-BR",
              publisher: { "@id": "https://forlink.app/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: "https://forlink.app/?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <AdSlot slot="mobile_sticky" label="Publicidade" />
        <GoogleAnalytics />
        <AnalyticsProvider />
        <InstallPrompt />
        <CookieConsent />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
