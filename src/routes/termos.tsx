import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/termos")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Termos de Uso · ForLink" },
      {
        name: "description",
        content:
          "Termos e Condições de Uso da plataforma ForLink — regras, direitos e deveres dos usuários.",
      },
      { property: "og:title", content: "Termos de Uso · ForLink" },
      { property: "og:url", content: "https://forlink.app/termos" },
    ],
    links: [{ rel: "canonical", href: "https://forlink.app/termos" }],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <FileText className="h-3.5 w-3.5 text-brand" /> Documento Legal
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Termos de Uso
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 28 de julho de 2026 · Versão 2026-07.2
        </p>

        <div className="prose prose-sm mt-8 max-w-none text-foreground/90 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1">
          <p>
            Estes Termos de Uso regem o acesso e a utilização da plataforma{" "}
            <strong>ForLink</strong> (forlink.app). Ao criar uma conta ou
            utilizar nossos serviços, você declara ter lido, entendido e
            aceito integralmente estes Termos e a nossa{" "}
            <Link to="/privacidade" className="underline">
              Política de Privacidade
            </Link>
            .
          </p>

          <h2>1. Objeto</h2>
          <p>
            A ForLink é uma plataforma de agregação de links e "bio-link" que
            permite a criação de perfis públicos personalizados para
            organizar e compartilhar endereços da web em um único endereço no
            formato <code>forlink.app/seu-usuario</code>.
          </p>

          <h2>2. Cadastro</h2>
          <ul>
            <li>Você deve fornecer informações verdadeiras e atualizadas.</li>
            <li>Você é responsável pela guarda da sua senha.</li>
            <li>
              É proibido criar contas em nome de terceiros sem autorização.
            </li>
            <li>Menores de 13 anos não podem se cadastrar.</li>
          </ul>

          <h2>3. Conteúdo do usuário</h2>
          <p>
            Você é o único responsável pelos links, textos, imagens e demais
            conteúdos que publica. Ao publicar, você declara possuir os
            direitos necessários e concede à ForLink uma licença não exclusiva
            e gratuita para hospedar e exibir esse conteúdo nas páginas da
            plataforma.
          </p>

          <h2>4. Conduta proibida</h2>
          <p>É expressamente vedado utilizar a ForLink para:</p>
          <ul>
            <li>
              Divulgar conteúdo ilegal, ofensivo, difamatório, discriminatório
              ou que viole direitos de terceiros;
            </li>
            <li>Distribuir malware, phishing, spam ou golpes;</li>
            <li>
              Contornar limites técnicos, mecanismos de segurança ou realizar
              engenharia reversa;
            </li>
            <li>Vender ou revender contas ou espaços do perfil;</li>
            <li>
              Publicar links que violem direitos autorais, marcas ou a
              legislação brasileira.
            </li>
          </ul>

          <h2>5. Planos e pagamentos</h2>
          <ul>
            <li>
              O <strong>Plano Free</strong> é gratuito e limitado a 3
              categorias, 15 links e <strong>1 campanha ativa</strong> no
              módulo Campanhas.
            </li>
            <li>
              O <strong>Plano Pro</strong> é pago (mensal, trimestral ou
              anual) via PIX processado pelo Mercado Pago, com renovação
              automática opcional, e libera: links e categorias ilimitados,
              <strong> campanhas ilimitadas</strong>, encurtador
              <code> forlink.app/s/</code>, selo de verificação, estatísticas
              detalhadas de cliques, remoção de anúncios e suporte prioritário.
            </li>
            <li>
              O direito de arrependimento (art. 49 do CDC) pode ser exercido
              em até 7 dias corridos da contratação, com reembolso
              proporcional.
            </li>
          </ul>

          <h2>6. Módulo Campanhas (arrecadação via Mercado Pago)</h2>
          <p>
            O módulo Campanhas permite que usuários criem páginas públicas de
            arrecadação (<code>forlink.app/pix/seu-slug</code>) vinculadas à
            sua própria conta Mercado Pago. A ForLink atua exclusivamente como
            <strong> facilitadora tecnológica</strong>:
          </p>
          <ul>
            <li>
              Os valores <strong>não</strong> transitam pela ForLink. Cada
              pagamento é liquidado diretamente na conta MP do criador da
              campanha, conforme regras do próprio Mercado Pago.
            </li>
            <li>
              A ForLink cobra uma <strong>taxa de serviço</strong>{" "}
              (<em>application_fee</em>) configurada pelo administrador e
              informada de forma transparente ao apoiador antes do pagamento,
              retida automaticamente pelo Mercado Pago e repassada à ForLink.
            </li>
            <li>
              As <strong>taxas do Mercado Pago</strong> (PIX, cartão, carteira)
              seguem a tabela vigente do próprio MP e podem ser exibidas de
              forma estimada no checkout. O criador pode optar por absorver
              as taxas ou repassá-las ao apoiador (gross-up).
            </li>
            <li>
              O criador é o único responsável pela veracidade da campanha,
              pelo cumprimento de eventual obrigação fiscal sobre os valores
              recebidos e pela relação com os apoiadores (recibos, entregas,
              contrapartidas, reembolsos).
            </li>
            <li>
              É vedado usar campanhas para: lavagem de dinheiro, financiamento
              a atividades ilícitas, produtos/serviços proibidos pelas
              políticas do Mercado Pago, arrecadação política irregular ou
              qualquer prática vedada pela legislação brasileira.
            </li>
            <li>
              O apoiador que se sentir lesado deve, primeiramente, acionar o
              criador da campanha; disputas de pagamento devem ser abertas
              diretamente no Mercado Pago. A ForLink cooperará com autoridades
              mediante requisição formal.
            </li>
          </ul>

          <h2>7. Encurtador de links</h2>
          <p>
            O encurtador <code>forlink.app/s/</code> está disponível para
            assinantes do plano Pro. É proibido encurtar links que direcionem
            para conteúdo ilegal, phishing, malware, fraudes ou material que
            viole estes Termos. Links que violem estas regras serão removidos
            e podem levar à suspensão da conta. A ForLink pode aplicar
            verificações automatizadas de reputação de URL sem aviso prévio.
          </p>



          <h2>8. Publicidade</h2>
          <p>
            A ForLink pode exibir anúncios de parceiros em áreas específicas
            do site. Anúncios só são carregados quando o usuário autoriza
            expressamente cookies de publicidade no banner de consentimento.
          </p>

          <h2>9. Suspensão e encerramento</h2>
          <p>
            Podemos suspender ou encerrar contas que violem estes Termos, sem
            aviso prévio, especialmente em casos de risco à segurança da
            plataforma ou de terceiros.
          </p>
          <p>
            Você pode encerrar sua conta a qualquer momento em{" "}
            <Link to="/settings" className="underline">Meu perfil → Excluir minha conta</Link>.
            A exclusão é imediata e apaga perfil, avatar, links, categorias,
            encurtadores, papel de acesso e sessões. Registros exigidos por
            obrigação legal (fiscal/financeira) podem ser retidos pelo prazo
            legal aplicável, de forma segregada. Consulte a{" "}
            <Link to="/privacidade" className="underline">Política de Privacidade</Link>{" "}
            para detalhes.
          </p>

          <h2>10. Isenção de responsabilidade</h2>
          <p>
            O serviço é fornecido "no estado em que se encontra". A ForLink
            não se responsabiliza por indisponibilidades causadas por
            terceiros, casos fortuitos, força maior, nem pelo conteúdo dos
            sites externos referenciados por links publicados pelos usuários.
          </p>

          <h2>11. Propriedade intelectual</h2>
          <p>
            A marca, o design, o código-fonte e a estrutura do site pertencem
            à ForLink. É proibida a reprodução total ou parcial sem prévia
            autorização por escrito.
          </p>

          <h2>12. Lei aplicável e foro</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do
            Brasil. Fica eleito o foro do domicílio do usuário consumidor
            para dirimir eventuais controvérsias.
          </p>

          <h2>13. Alterações</h2>
          <p>
            Podemos alterar estes Termos a qualquer momento. Alterações
            relevantes serão comunicadas com antecedência mínima de 15 dias
            por e-mail ou banner na plataforma.
          </p>

          <p className="mt-8 text-sm text-muted-foreground">
            Contato:{" "}
            <a href="mailto:contato@forlink.app">contato@forlink.app</a>
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t pt-6 text-sm">
          <Link to="/privacidade" className="text-brand hover:underline">
            Política de Privacidade
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Voltar ao início
          </Link>
        </div>
      </main>
    </div>
  );
}
