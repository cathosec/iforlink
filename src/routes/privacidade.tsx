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
          Última atualização: 28 de julho de 2026 · Versão 2026-07.2
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
              nome de usuário (slug) e senha (armazenada de forma criptografada
              — nunca temos acesso ao texto puro).
            </li>
            <li>
              <strong>Conteúdo criado por você:</strong> avatar, biografia,
              categorias, links, textos e URLs encurtadas publicadas no seu perfil.
            </li>
            <li>
              <strong>Dados de uso agregados:</strong> contagem de visualizações
              do perfil e cliques em links, para métricas próprias e do titular.
            </li>
            <li>
              <strong>Dados técnicos mínimos:</strong> endereço IP (para
              segurança e prevenção a abusos), tipo de dispositivo, navegador,
              idioma, e cookies estritamente necessários para autenticação.
            </li>
            <li>
              <strong>Dados de pagamento (Plano Pro):</strong> o pagamento é
              processado pelo <strong>Mercado Pago</strong>. Recebemos apenas:
              identificador da transação, status, método (PIX), valor,
              intervalo e data de confirmação. Nunca recebemos dados bancários
              ou de cartão.
            </li>
            <li>
              <strong>Comunicações:</strong> mensagens enviadas por{" "}
              <Link to="/contato" className="underline">Contato</Link> (nome,
              e-mail, assunto e conteúdo), tratadas apenas para responder à
              sua solicitação.
            </li>
          </ul>
          <p>
            <strong>Não coletamos:</strong> dados sensíveis (art. 5º, II, LGPD),
            geolocalização precisa, contatos do dispositivo ou histórico de
            navegação fora da ForLink.
          </p>

          <h2>3. Finalidades e bases legais (arts. 7º e 11 LGPD)</h2>
          <ul>
            <li>
              <strong>Execução de contrato (art. 7º, V):</strong> criar e manter
              sua conta, hospedar seu perfil público, processar assinaturas,
              enviar comunicações operacionais (confirmação de e-mail,
              redefinição de senha, ativação Pro, aviso de vencimento).
            </li>
            <li>
              <strong>Legítimo interesse (art. 7º, IX):</strong> prevenir
              fraudes, spam e abusos; auditoria de segurança; melhoria contínua
              da plataforma com métricas agregadas. Aplicamos teste de
              proporcionalidade e minimização.
            </li>
            <li>
              <strong>Consentimento (art. 7º, I):</strong> cookies de análise
              e publicidade, exclusivamente após aceite no banner. Você pode
              revogar a qualquer momento reabrindo o banner ou apagando o
              cookie <code>forlink_consent_v1</code>.
            </li>
            <li>
              <strong>Cumprimento de obrigação legal (art. 7º, II):</strong>
              guarda de registros fiscais de pagamentos, atendimento a
              determinações judiciais, requisições da ANPD e do Ministério
              Público.
            </li>
            <li>
              <strong>Exercício regular de direitos (art. 7º, VI):</strong>
              defesa em processos administrativos, arbitrais e judiciais.
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

          <h2>5. Compartilhamento com operadores</h2>
          <p>
            Não vendemos, alugamos ou cedemos seus dados. Compartilhamos apenas
            com operadores essenciais à prestação do serviço, vinculados por
            contrato a padrões equivalentes de proteção:
          </p>
          <ul>
            <li>
              <strong>Cloudflare Inc.</strong> — hospedagem edge/CDN, DNS,
              proteção contra DDoS. Dados técnicos e conteúdo do site.
            </li>
            <li>
              <strong>Supabase, Inc.</strong> — banco de dados PostgreSQL,
              autenticação e armazenamento de avatares. Todos os dados de
              cadastro e conteúdo.
            </li>
            <li>
              <strong>Mercado Pago (Ebazar.com.br Ltda.)</strong> —
              processamento de PIX para assinaturas Pro. Nome, e-mail, valor.
            </li>
            <li>
              <strong>Resend, Inc.</strong> — envio de e-mails transacionais
              (confirmação, recuperação de senha, avisos de assinatura,
              respostas de contato). E-mail e conteúdo da mensagem.
            </li>
            <li>
              <strong>Google LLC — Analytics/AdSense</strong> — apenas se você
              consentir com cookies de análise/publicidade. Dados anonimizados
              de uso.
            </li>
          </ul>
          <p>
            Compartilhamentos com autoridades ocorrem somente mediante
            requisição legal formal (ordem judicial, ofício da ANPD, MP ou
            autoridade fiscal competente).
          </p>

          <h2>6. Retenção e eliminação</h2>
          <p>
            Mantemos seus dados pessoais enquanto sua conta estiver ativa e pelo tempo
            necessário para cumprir as finalidades desta Política. Você pode solicitar a
            exclusão a qualquer momento por dois caminhos:
          </p>
          <ul>
            <li>
              <strong>Autoatendimento (recomendado):</strong> acesse{" "}
              <Link to="/settings" className="underline">Meu perfil → Excluir minha conta</Link>{" "}
              e confirme a operação. A exclusão é <strong>imediata e irreversível</strong>.
            </li>
            <li>
              <strong>Solicitação por e-mail:</strong> escreva para{" "}
              <a href="mailto:contato@forlink.app">contato@forlink.app</a>. Respondemos em
              até 15 dias corridos.
            </li>
          </ul>
          <p>
            O que é eliminado: perfil público, avatar, biografia, categorias, links,
            encurtadores, papéis de acesso, sessões e credenciais. Registros mínimos
            exigidos por obrigação legal (art. 16 da LGPD) — como comprovantes fiscais
            de pagamentos — podem ser retidos de forma segregada e apenas pelo prazo
            legal aplicável (até 5 anos, art. 174 do CTN), sem uso comercial.
          </p>

          <h2>7. Direitos do titular (art. 18 LGPD)</h2>
          <p>Você pode, a qualquer momento, e sem custo:</p>
          <ul>
            <li>Confirmar a existência de tratamento;</li>
            <li>Acessar seus dados (portabilidade em JSON disponível em Meu perfil);</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
            <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;</li>
            <li>Solicitar a portabilidade a outro fornecedor;</li>
            <li>Solicitar a eliminação dos dados tratados com base no seu consentimento;</li>
            <li>Obter informação sobre entidades públicas e privadas com as quais compartilhamos dados;</li>
            <li>Ser informado sobre a possibilidade de não fornecer consentimento e sobre suas consequências;</li>
            <li>Revogar o consentimento a qualquer momento;</li>
            <li>Peticionar perante a Autoridade Nacional de Proteção de Dados (ANPD).</li>
          </ul>
          <p>
            Para exercer qualquer direito, use os canais de{" "}
            <Link to="/settings" className="underline">Meu perfil</Link> ou escreva para{" "}
            <a href="mailto:contato@forlink.app">contato@forlink.app</a>. Poderemos
            solicitar informações adicionais para confirmar sua identidade antes de
            atender à requisição, em cumprimento ao art. 19 da LGPD.
          </p>

          <h3>7.1. Encarregado pelo Tratamento de Dados (DPO)</h3>
          <p>
            Nosso Encarregado responde pelas comunicações com titulares e com a ANPD.
            Contato: <a href="mailto:contato@forlink.app">contato@forlink.app</a>{" "}
            (assunto: "LGPD — Encarregado").
          </p>

          <h3>7.2. Transferência internacional de dados</h3>
          <p>
            Alguns operadores (ex.: provedores de nuvem e e-mail transacional) podem
            processar dados fora do Brasil. Nesses casos, exigimos garantias contratuais
            de nível de proteção adequado, conforme arts. 33 a 36 da LGPD.
          </p>

          <h3>7.3. Decisões automatizadas</h3>
          <p>
            A ForLink não realiza decisões automatizadas com efeitos jurídicos ou que
            afetem significativamente os titulares. Caso isso mude, você será informado
            e poderá solicitar revisão nos termos do art. 20 da LGPD.
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
