import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, Target, Rocket, Heart, ShieldCheck } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";

export const Route = createFileRoute("/sobre")({
  component: Sobre,
  head: () => {
    const title = "Sobre a ForLink — Nossa história, missão e valores";
    const description =
      "Conheça a ForLink: a plataforma brasileira de bio link e agregador de links criada para simplificar a presença digital de criadores, empresas e profissionais. Descubra nossa missão, história e o time por trás.";
    const url = "https://forlink.app/sobre";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});

function Sobre() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <header className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-brand" /> Sobre a ForLink
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Uma plataforma brasileira para organizar toda a sua presença digital em um único endereço.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            A ForLink nasceu de uma frustração comum entre criadores de conteúdo, pequenos empreendedores e profissionais autônomos: manter dezenas de links espalhados por redes sociais, cartões de visita, assinaturas de e-mail e biografias que só permitem uma URL. Em vez de escolher qual link colocar no Instagram, no TikTok ou no WhatsApp Business, oferecemos um único endereço — <strong className="text-foreground">forlink.app/seuusuario</strong> — que reúne, organiza e mede o desempenho de tudo o que você quer compartilhar.
          </p>
        </header>

        <AdSlot slot="top" label="Publicidade" />

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Nossa missão</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Acreditamos que a internet brasileira precisa de ferramentas construídas para a realidade brasileira: pagamentos em reais, PIX no lugar de cartão de crédito internacional, suporte em português e uma interface que respeita a diversidade de quem cria conteúdo por aqui — do artesão do interior ao influenciador de moda em capitais. Nossa missão é <strong className="text-foreground">democratizar a organização de links</strong>, permitindo que qualquer pessoa, mesmo sem conhecimento técnico, monte uma página profissional em menos de dois minutos e comece a receber cliques imediatamente.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Também acreditamos que um bio link deve ir muito além de uma simples lista de botões. Por isso, oferecemos categorias organizáveis por arrastar e soltar, contagem de cliques por link, controle de privacidade por seção, encurtador próprio para o plano Pro e um painel de estatísticas que ajuda você a entender o que o seu público realmente quer consumir.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Nossa história</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            A ideia da ForLink surgiu em 2024, quando percebemos que a maioria das alternativas populares de bio link no mercado eram estrangeiras, cobravam em dólar, tinham interfaces traduzidas de forma automática e não ofereciam nenhuma integração com o método de pagamento mais usado do Brasil: o PIX. Aliado a isso, muitos criadores brasileiros reclamavam de páginas lentas, layouts genéricos e da dificuldade de personalizar a aparência sem pagar planos caros.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Começamos pequeno, com um MVP focado em três pilares: velocidade de carregamento, personalização acessível e pagamento nacional. Depois de meses de testes com usuários reais — de fotógrafos e nutricionistas a igrejas e ONGs — chegamos a versão atual da plataforma, hospedada em infraestrutura de borda global para garantir que sua página carregue em milissegundos, esteja em Manaus, Porto Alegre ou Lisboa.
          </p>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <Target className="h-6 w-6 text-brand" />
            <h3 className="mt-3 text-base font-semibold">Foco no criador</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Cada decisão de produto passa pela pergunta: isso realmente ajuda o criador brasileiro a ganhar tempo e cliques?
            </p>
          </Card>
          <Card className="p-5">
            <Heart className="h-6 w-6 text-brand" />
            <h3 className="mt-3 text-base font-semibold">Preço justo</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Um plano gratuito de verdade — com recursos suficientes para começar — e um plano Pro em reais, sem pegadinhas.
            </p>
          </Card>
          <Card className="p-5">
            <ShieldCheck className="h-6 w-6 text-brand" />
            <h3 className="mt-3 text-base font-semibold">Privacidade primeiro</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Você decide o que é público e o que fica restrito, em conformidade total com a LGPD.
            </p>
          </Card>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Para quem é a ForLink</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            A plataforma foi desenhada para atender diferentes perfis de uso. Entre nossos usuários mais comuns estão:
          </p>
          <ul className="ml-5 list-disc space-y-2 text-base leading-relaxed text-muted-foreground">
            <li><strong className="text-foreground">Criadores de conteúdo</strong> que precisam direcionar seguidores para vídeos, podcasts, cursos e parcerias comerciais sem trocar de plataforma.</li>
            <li><strong className="text-foreground">Pequenos negócios locais</strong> — cafeterias, salões de beleza, estúdios de tatuagem — que querem centralizar cardápio, WhatsApp, mapa e redes sociais.</li>
            <li><strong className="text-foreground">Profissionais liberais</strong> como psicólogos, advogados, personal trainers e consultores que compartilham agendamento, portfólio e formas de pagamento.</li>
            <li><strong className="text-foreground">Artistas e músicos</strong> que precisam apontar para plataformas de streaming, lojas de merchandise e agenda de shows.</li>
            <li><strong className="text-foreground">Organizações e igrejas</strong> que centralizam eventos, doações e canais de comunicação em um endereço fácil de lembrar.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Tecnologia e infraestrutura</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            A ForLink é construída sobre uma arquitetura moderna que combina renderização no servidor para performance máxima em SEO, armazenamento seguro de dados em banco relacional com políticas de acesso por linha (Row Level Security) e distribuição global via CDN de borda. Isso significa que cada perfil público carrega em menos de um segundo, mesmo em conexões móveis lentas, e permanece disponível 24 horas por dia com uptime histórico acima de 99,9%.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Também investimos pesado em automação: favicons de sites são buscados automaticamente para dar identidade visual aos links, e o encurtador Pro gera URLs limpas do tipo forlink.app/s/abc123, ideais para campanhas em redes sociais, panfletos e materiais impressos onde uma URL longa quebraria o design.
          </p>
        </section>

        <AdSlot slot="feed" label="Publicidade" />

        <section className="mt-12 rounded-xl border bg-secondary/30 p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Rocket className="h-6 w-6 text-brand" />
              <h2 className="mt-2 text-xl font-semibold">Pronto para criar seu ForLink?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece grátis, sem cartão de crédito. Faça upgrade só quando fizer sentido.
              </p>
            </div>
            <Link to="/auth">
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
                Criar minha conta <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-10 flex flex-wrap gap-3 text-sm">
          <Link to="/contato" className="text-brand hover:underline">Fale conosco</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/guias" className="text-brand hover:underline">Guias e artigos</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/privacidade" className="text-brand hover:underline">Política de privacidade</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/termos" className="text-brand hover:underline">Termos de uso</Link>
        </section>
      </main>

      <footer className="mt-16 border-t bg-secondary/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ForLink · forlink.app</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Feito no Brasil, para o mundo.</span>
        </div>
      </footer>
    </div>
  );
}
