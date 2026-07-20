import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { BookOpen, Lightbulb, TrendingUp, Palette, Search, ShieldCheck } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";

export const Route = createFileRoute("/guias")({
  component: Guias,
  head: () => {
    const title = "Guias ForLink — Como usar bio link para crescer online";
    const description =
      "Aprenda a organizar seus links, escolher a estrutura ideal do seu bio link, aumentar a taxa de cliques, personalizar o visual e usar métricas para crescer nas redes sociais. Guias práticos em português.";
    const url = "https://forlink.app/guias";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article id={id} className="scroll-mt-20 space-y-4 border-t pt-10 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <Icon className="h-6 w-6 text-brand" />
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-4 text-base leading-relaxed text-muted-foreground">{children}</div>
    </article>
  );
}

function Guias() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <header className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-brand" /> Guias e artigos
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Aprenda a construir um bio link que realmente converte
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Reunimos aqui uma série de guias práticos, escritos por quem usa a ForLink no dia a dia, para ajudar você a tirar o máximo proveito da sua página. Cada artigo é independente — leia na ordem que fizer mais sentido para o seu caso.
          </p>
        </header>

        <nav className="mb-10 grid gap-2 rounded-xl border bg-secondary/20 p-4 sm:grid-cols-2">
          <a href="#organizar-links" className="text-sm text-brand hover:underline">1. Como organizar seus links por categorias</a>
          <a href="#aumentar-cliques" className="text-sm text-brand hover:underline">2. 7 formas de aumentar a taxa de cliques</a>
          <a href="#visual-profissional" className="text-sm text-brand hover:underline">3. Como deixar seu perfil visualmente profissional</a>
          <a href="#seo-bio-link" className="text-sm text-brand hover:underline">4. SEO para bio link: apareça no Google</a>
          <a href="#metricas" className="text-sm text-brand hover:underline">5. Lendo as métricas do seu perfil</a>
          <a href="#seguranca" className="text-sm text-brand hover:underline">6. Segurança e boas práticas</a>
        </nav>

        <AdSlot slot="content_top" label="Publicidade" />

        <Section id="organizar-links" icon={Lightbulb} title="1. Como organizar seus links por categorias">
          <p>
            Uma das principais diferenças da ForLink em relação a agregadores tradicionais é permitir que você agrupe links por categorias. Em vez de uma lista vertical infinita, o visitante vê blocos temáticos que se expandem sob demanda — uma experiência muito mais próxima de um menu de site do que de uma lista de favoritos.
          </p>
          <p>
            Antes de sair criando categorias, faça um exercício simples: liste em um papel todos os links que você quer expor. Depois, agrupe-os por <strong className="text-foreground">intenção do visitante</strong>. Alguém que abre seu perfil pode estar querendo comprar algo, ler conteúdo, ouvir seu podcast, entrar em contato ou apoiar seu trabalho. Cada uma dessas intenções vira uma categoria.
          </p>
          <p>
            Nomes curtos funcionam melhor: <em>"Comprar"</em>, <em>"Assistir"</em>, <em>"Contato"</em>, <em>"Apoie"</em>. Evite categorias com mais de 8 links — se estourar esse limite, é sinal de que ela precisa ser dividida em duas. Use o recurso de arrastar e soltar do painel para posicionar primeiro as categorias mais importantes; a maioria dos cliques acontece nas duas primeiras seções visíveis.
          </p>
          <p>
            Por fim, aproveite a opção de tornar categorias públicas ou privadas. Conteúdos que só fazem sentido para clientes ativos, alunos ou membros pagos podem ficar restritos a visitantes autenticados, criando uma sensação de exclusividade sem precisar de outra ferramenta.
          </p>
        </Section>

        <Section id="aumentar-cliques" icon={TrendingUp} title="2. 7 formas comprovadas de aumentar a taxa de cliques">
          <p>
            A taxa de cliques (CTR) do seu bio link é o percentual de visitantes que clicam em pelo menos um link depois de abrir o perfil. Uma boa CTR fica entre 25% e 45%; abaixo disso, provavelmente há algo a melhorar. Aqui vão sete ajustes que costumam gerar impacto imediato:
          </p>
          <ol className="ml-5 list-decimal space-y-2">
            <li><strong className="text-foreground">Escreva títulos com verbos.</strong> "Baixar catálogo" converte mais que "Catálogo". "Assistir episódio" converte mais que "YouTube".</li>
            <li><strong className="text-foreground">Coloque o link mais importante em primeiro.</strong> O olho do visitante sempre desce; nunca o obrigue a rolar para encontrar o que você mais quer promover.</li>
            <li><strong className="text-foreground">Use até 3 emojis por categoria, no máximo.</strong> Ajudam na leitura em escaneamento, mas em excesso poluem.</li>
            <li><strong className="text-foreground">Atualize sazonalmente.</strong> Promova o link da temporada no topo (Black Friday, Dia dos Namorados, lançamento novo) e recolha quando acabar.</li>
            <li><strong className="text-foreground">Remova links mortos.</strong> Cada clique frustrado reduz a confiança no seu perfil como um todo.</li>
            <li><strong className="text-foreground">Padronize a descrição.</strong> Se um link tem descrição e o outro não, o visitante interpreta como algo incompleto.</li>
            <li><strong className="text-foreground">Cheque os favicons.</strong> Sites sem favicon parecem menos oficiais. A ForLink busca automaticamente, mas domínios muito novos podem não ter — nesse caso, prefira encurtar via nosso encurtador Pro.</li>
          </ol>
        </Section>

        <Section id="visual-profissional" icon={Palette} title="3. Como deixar seu perfil visualmente profissional">
          <p>
            Um bio link bem cuidado transmite profissionalismo antes mesmo do visitante ler qualquer palavra. Três elementos definem a percepção inicial: <strong className="text-foreground">avatar, nome de exibição e primeira dobra da página</strong>.
          </p>
          <p>
            O avatar ideal é uma foto quadrada, com fundo neutro e boa iluminação. Se for marca, use o logotipo em versão pequena — não caiba o logo horizontal completo, que fica ilegível em telas móveis. O nome de exibição pode ser diferente do @usuário: enquanto o @ é técnico e único, o nome pode ser mais descritivo, como "Ana Costa — Nutricionista". Isso ajuda inclusive na busca dentro de mecanismos de pesquisa.
          </p>
          <p>
            A biografia curta abaixo do nome deve responder rapidamente três perguntas: quem você é, o que faz e para quem faz. Duas linhas são suficientes. Frases genéricas do tipo "Bem-vindo ao meu perfil!" desperdiçam esse espaço nobre.
          </p>
        </Section>

        <AdSlot slot="content_middle" label="Publicidade" />

        <Section id="seo-bio-link" icon={Search} title="4. SEO para bio link: como aparecer no Google">
          <p>
            Diferente de perfis em redes sociais fechadas, um perfil ForLink é indexável por buscadores. Isso significa que, com alguns cuidados, seu bio link pode aparecer quando alguém pesquisa seu nome, sua marca ou seu nicho no Google.
          </p>
          <p>
            Primeiro, escolha um @usuário próximo do seu nome real ou marca. <em>forlink.app/anacosta</em> é muito mais fácil de ranquear do que <em>forlink.app/ac_nutri_2025</em>. Segundo, capriche na biografia: as primeiras 150 caracteres viram descrição na SERP e influenciam diretamente a taxa de clique orgânico.
          </p>
          <p>
            Terceiro, mantenha o perfil ativo. Páginas atualizadas são visitadas com mais frequência pelo Googlebot e recebem sinais positivos de frescor. Uma boa prática é revisar os links a cada 30 dias, mesmo que seja só para reorganizar a ordem.
          </p>
          <p>
            Por fim, se você tem site próprio ou publica em portais externos, aponte para o seu ForLink em rodapés, assinaturas de e-mail e biografias — cada link externo funciona como um voto de confiança perante os buscadores.
          </p>
        </Section>

        <Section id="metricas" icon={TrendingUp} title="5. Lendo as métricas do seu perfil sem se enganar">
          <p>
            O painel da ForLink exibe visualizações únicas, cliques totais, taxa de conversão (CTR) e os cinco links mais clicados. Todos são números importantes, mas cada um responde a uma pergunta diferente:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li><strong className="text-foreground">Visualizações únicas</strong> respondem "quantas pessoas descobriram meu perfil?". Sobem quando você aumenta o alcance nas redes ou publica em canais novos.</li>
            <li><strong className="text-foreground">Cliques totais</strong> respondem "quanto engajamento o perfil gera?". Sobem quando você melhora títulos e ordena melhor os links.</li>
            <li><strong className="text-foreground">CTR</strong> responde "meu perfil é eficiente?". Um CTR baixo com muita visualização indica um problema na página em si, não no alcance.</li>
            <li><strong className="text-foreground">Top 5 links</strong> mostra o que o público realmente quer. Se um link surpreendentemente bom aparece no topo, considere promovê-lo mais.</li>
          </ul>
          <p>
            Um erro comum é comparar métricas semana a semana sem considerar sazonalidade. Prefira comparações mês contra mês ou trimestre contra trimestre para tomar decisões mais estáveis.
          </p>
        </Section>

        <Section id="seguranca" icon={ShieldCheck} title="6. Segurança e boas práticas para o seu perfil">
          <p>
            Seu perfil ForLink é uma porta de entrada pública para vários outros lugares da sua vida digital. Vale a pena cuidar dele com o mesmo carinho que você cuida das suas redes sociais principais.
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Use uma senha forte e única — de preferência gerada por um gerenciador de senhas.</li>
            <li>Ative o e-mail de recuperação em um endereço que você acessa com frequência.</li>
            <li>Revise periodicamente os links: sites que mudam de dono podem passar a hospedar conteúdo indevido.</li>
            <li>Evite colocar informações pessoais sensíveis (CPF, endereço residencial completo, telefone privado) na biografia pública.</li>
            <li>Se receber mensagens suspeitas se passando pela ForLink, encaminhe para <a href="mailto:abuso@forlink.app" className="text-brand hover:underline">abuso@forlink.app</a> — nunca clicamos por você nem pedimos senha por e-mail.</li>
          </ul>
        </Section>

        <AdSlot slot="content_bottom" label="Publicidade" />

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Continue lendo</h3>
            <Link to="/sobre" className="mt-2 block text-sm text-brand hover:underline">Sobre a ForLink →</Link>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Precisa de ajuda?</h3>
            <Link to="/contato" className="mt-2 block text-sm text-brand hover:underline">Fale com o suporte →</Link>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Quer testar?</h3>
            <Link to="/auth" className="mt-2 block text-sm text-brand hover:underline">Criar conta grátis →</Link>
          </Card>
        </section>
      </main>

      <footer className="mt-16 border-t bg-secondary/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ForLink · forlink.app</span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/sobre" className="hover:text-foreground">Sobre</Link>
            <Link to="/contato" className="hover:text-foreground">Contato</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
