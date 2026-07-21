import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Política de Privacidade · ForLink" },
      {
        name: "description",
        content:
          "Política de Privacidade da ForLink em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).",
      },
      { property: "og:title", content: "Política de Privacidade · ForLink" },
      { property: "og:description", content: "Política de Privacidade da ForLink em conformidade com a LGPD. Saiba como tratamos seus dados e exercite seus direitos." },
      { property: "og:url", content: "https://forlink.app/privacidade" },
    ],
    links: [{ rel: "canonical", href: "https://forlink.app/privacidade" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Documento Legal · LGPD
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 17 de julho de 2026 · Versão 2026-07
        </p>

        <div className="prose prose-sm mt-8 max-w-none text-foreground/90 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:font-semibold [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1">
          <p>
            A <strong>ForLink</strong> ("nós", "nosso", "plataforma"), inscrita
            no domínio <strong>forlink.app</strong>, respeita sua privacidade e
            está comprometida com a proteção dos seus dados pessoais nos termos
            da <strong>Lei nº 13.709/2018 — Lei Geral de Proteção de Dados
            Pessoais (LGPD)</strong>. Esta Política explica quais dados
            coletamos, como usamos, com quem compartilhamos e quais são seus
            direitos como titular.
          </p>

          <h2>1. Controlador dos dados</h2>
          <p>
            O controlador dos dados coletados é a <strong>ForLink</strong>. Para
            exercer seus direitos ou tirar dúvidas, entre em contato pelo
            e-mail <a href="mailto:contato@forlink.app">contato@forlink.app</a>.
          </p>

          <h2>2. Dados que coletamos</h2>
          <ul>
            <li>
              <strong>Dados de cadastro:</strong> e-mail, nome de exibição,
              nome de usuário (slug), avatar opcional.
            </li>
            <li>
              <strong>Conteúdo criado por você:</strong> links, categorias,
              biografia e demais informações que você publica em seu perfil.
            </li>
            <li>
              <strong>Dados de uso:</strong> contagem de visualizações e
              cliques em links, para fins estatísticos agregados.
            </li>
            <li>
              <strong>Dados técnicos:</strong> endereço IP, tipo de
              dispositivo, navegador e cookies estritamente necessários.
            </li>
            <li>
              <strong>Dados de pagamento (planos Pro):</strong> os dados de
              pagamento via PIX são processados pelo Mercado Pago; recebemos
              apenas confirmação e identificador da transação.
            </li>
          </ul>

          <h2>3. Bases legais e finalidades</h2>
          <ul>
            <li>
              <strong>Execução de contrato</strong> — criar e manter sua conta,
              hospedar seu perfil público, processar assinaturas.
            </li>
            <li>
              <strong>Legítimo interesse</strong> — prevenir fraudes, garantir
              a segurança e melhorar a plataforma.
            </li>
            <li>
              <strong>Consentimento</strong> — cookies de análise e
              publicidade, que dependem da sua autorização explícita no
              banner de cookies.
            </li>
            <li>
              <strong>Obrigação legal</strong> — cumprimento de determinações
              fiscais, regulatórias ou judiciais.
            </li>
          </ul>

          <h2>4. Cookies</h2>
          <p>Utilizamos três categorias de cookies:</p>
          <ul>
            <li>
              <strong>Essenciais</strong> — necessários para login, sessão e
              segurança. Não podem ser desativados.
            </li>
            <li>
              <strong>Análise</strong> — nos ajudam a entender o uso da
              plataforma de forma agregada e anônima.
            </li>
            <li>
              <strong>Publicidade</strong> — permitem a exibição de anúncios
              de parceiros. Sem consentimento, nenhum anúncio é carregado.
            </li>
          </ul>
          <p>
            Você pode alterar suas preferências a qualquer momento apagando o
            cookie <code>forlink_consent_v1</code> no seu navegador ou
            revisitando o banner de consentimento.
          </p>

          <h2>5. Compartilhamento de dados</h2>
          <p>
            Não vendemos seus dados. Compartilhamos apenas com operadores
            necessários à prestação do serviço:
          </p>
          <ul>
            <li>Provedor de hospedagem e infraestrutura em nuvem.</li>
            <li>Supabase (banco de dados e autenticação).</li>
            <li>Mercado Pago (processamento de pagamentos PIX).</li>
            <li>
              Redes de anúncios contratadas (somente após seu consentimento
              para cookies de publicidade).
            </li>
          </ul>

          <h2>6. Retenção</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Ao excluir
            sua conta, os dados de perfil e links são apagados em até 30 dias.
            Registros mínimos necessários para cumprimento de obrigações
            legais (financeiras/fiscais) podem ser retidos pelos prazos
            exigidos por lei.
          </p>

          <h2>7. Direitos do titular (art. 18 LGPD)</h2>
          <ul>
            <li>Confirmar a existência de tratamento e acessar seus dados;</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
            <li>Solicitar anonimização, bloqueio ou eliminação;</li>
            <li>Portabilidade dos dados a outro fornecedor;</li>
            <li>Revogar o consentimento a qualquer momento;</li>
            <li>Informação sobre com quem compartilhamos seus dados.</li>
          </ul>
          <p>
            Para exercer qualquer direito, escreva para{" "}
            <a href="mailto:contato@forlink.app">contato@forlink.app</a>.
            Responderemos em até 15 dias.
          </p>

          <h2>8. Segurança</h2>
          <p>
            Adotamos medidas técnicas e administrativas para proteger seus
            dados, incluindo criptografia em trânsito (HTTPS), controle de
            acesso por perfis e políticas de segurança em nível de linha
            (Row Level Security) no banco de dados.
          </p>

          <h2>9. Menores de idade</h2>
          <p>
            A plataforma é destinada a maiores de 13 anos. Contas de menores
            entre 13 e 17 anos exigem o consentimento dos responsáveis legais.
          </p>

          <h2>10. Alterações</h2>
          <p>
            Podemos atualizar esta Política. Alterações relevantes serão
            comunicadas por e-mail ou banner na plataforma. A data no topo
            desta página indica a versão vigente.
          </p>

          <p className="mt-8 text-sm text-muted-foreground">
            Dúvidas? Escreva para{" "}
            <a href="mailto:contato@forlink.app">contato@forlink.app</a>.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t pt-6 text-sm">
          <Link to="/termos" className="text-brand hover:underline">
            Termos de Uso
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
