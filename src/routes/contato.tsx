import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Mail, MessageCircle, LifeBuoy, Clock, MapPin, Building2, ShieldCheck, Send, Loader2, CheckCircle2 } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendContactMessage } from "@/lib/contact.functions";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/contato")({
  component: Contato,
  head: () => {
    const title = "Contato — Fale com a ForLink";
    const description =
      "Canais oficiais de contato da ForLink: suporte por e-mail, dúvidas comerciais, parcerias e imprensa. Atendimento em português, com prioridade Pro.";
    const url = "https://forlink.app/contato";
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

function Contato() {
  const send = useServerFn(sendContactMessage);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", website: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await send({ data: form });
      setSent(true);
      trackEvent("contact_form_submit", { subject: form.subject });
      setForm({ name: "", email: "", subject: "", message: "", website: "" });
      toast.success("Mensagem enviada! Responderemos em breve.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar. Tente novamente.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Fale com a ForLink</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Estamos à disposição para tirar dúvidas, receber sugestões e ajudar você a extrair o máximo da plataforma. Escolha o canal mais adequado abaixo — respondemos todas as mensagens em ordem de chegada, priorizando assinantes do plano Pro em situações críticas.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <LifeBuoy className="h-6 w-6 text-brand" />
            <h2 className="mt-3 text-lg font-semibold">Suporte técnico</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Dúvidas sobre uso do painel, problemas de acesso, redefinição de senha, links que não abrem, cobrança ou cancelamento de assinatura.
            </p>
            <a href="mailto:suporte@forlink.app" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
              suporte@forlink.app
            </a>
          </Card>

          <Card className="p-6">
            <Mail className="h-6 w-6 text-brand" />
            <h2 className="mt-3 text-lg font-semibold">Contato geral</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Sugestões de melhorias, feedback sobre a plataforma, correções em conteúdo público e qualquer outro assunto que não se enquadre nos demais.
            </p>
            <a href="mailto:contato@forlink.app" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
              contato@forlink.app
            </a>
          </Card>

          <Card className="p-6">
            <Building2 className="h-6 w-6 text-brand" />
            <h2 className="mt-3 text-lg font-semibold">Parcerias e negócios</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Propostas comerciais, integrações, agências, revendas, uso corporativo e planos personalizados para times acima de 20 usuários.
            </p>
            <a href="mailto:parcerias@forlink.app" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
              parcerias@forlink.app
            </a>
          </Card>

          <Card className="p-6">
            <ShieldCheck className="h-6 w-6 text-brand" />
            <h2 className="mt-3 text-lg font-semibold">Privacidade e LGPD</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Solicitações do titular dos dados (acesso, correção, portabilidade e exclusão), incidentes de segurança e comunicação com o Encarregado.
            </p>
            <a href="mailto:privacidade@forlink.app" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
              privacidade@forlink.app
            </a>
          </Card>
        </div>

        <section className="mt-10">
          <Card className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Envie uma mensagem</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Preencha o formulário abaixo e nossa equipe responderá no e-mail informado. Todas as mensagens chegam diretamente à caixa de entrada oficial da ForLink.
              </p>
            </div>

            {sent ? (
              <div className="flex items-start gap-3 rounded-lg border border-brand/30 bg-brand/5 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand" />
                <div>
                  <p className="font-medium">Mensagem enviada com sucesso.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Retornaremos em até 48h úteis. Verifique também sua caixa de spam.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="mt-3 text-sm font-medium text-brand hover:underline"
                  >
                    Enviar outra mensagem
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-name">Nome</Label>
                    <Input id="c-name" required minLength={2} maxLength={100} value={form.name} onChange={update("name")} placeholder="Seu nome completo" autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-email">E-mail</Label>
                    <Input id="c-email" type="email" required maxLength={200} value={form.email} onChange={update("email")} placeholder="voce@exemplo.com" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-subject">Assunto</Label>
                  <Input id="c-subject" required minLength={3} maxLength={150} value={form.subject} onChange={update("subject")} placeholder="Sobre o que você quer falar?" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-message">Mensagem</Label>
                  <Textarea id="c-message" required minLength={10} maxLength={4000} rows={6} value={form.message} onChange={update("message")} placeholder="Descreva sua dúvida, sugestão ou solicitação com o máximo de detalhes possível." />
                  <p className="text-xs text-muted-foreground">{form.message.length}/4000 caracteres</p>
                </div>
                {/* Honeypot */}
                <div className="hidden" aria-hidden="true">
                  <label>
                    Website
                    <input tabIndex={-1} autoComplete="off" value={form.website} onChange={update("website")} />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-4 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Ao enviar, você concorda com a nossa <Link to="/privacidade" className="text-brand hover:underline">política de privacidade</Link>.
                  </p>
                  <Button type="submit" disabled={loading} className="min-w-[140px]">
                    {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando…</>) : (<><Send className="mr-2 h-4 w-4" />Enviar mensagem</>)}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </section>

        <AdSlot slot="top" label="Publicidade" />

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Antes de nos escrever, dê uma olhada aqui</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Muitas dúvidas comuns já estão respondidas nas seções abaixo. Consultá-las costuma resolver o problema em minutos, em vez de esperar pelo nosso retorno:
          </p>
          <ul className="ml-5 list-disc space-y-2 text-base leading-relaxed text-muted-foreground">
            <li>Perguntas frequentes na <Link to="/" className="text-brand hover:underline">página inicial</Link>, seção FAQ.</li>
            <li>Guias passo a passo em <Link to="/guias" className="text-brand hover:underline">forlink.app/guias</Link>.</li>
            <li>Detalhes de cobrança e alteração de plano em <Link to="/assinatura" className="text-brand hover:underline">forlink.app/assinatura</Link> (área logada).</li>
            <li>Direitos do usuário e tratamento de dados na <Link to="/privacidade" className="text-brand hover:underline">política de privacidade</Link>.</li>
          </ul>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <Clock className="h-5 w-5 text-brand" />
            <h3 className="mt-3 text-sm font-semibold">Tempo de resposta</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Até 48 horas úteis para contas gratuitas. Até 12 horas úteis para assinantes Pro. Feriados nacionais podem estender esse prazo.
            </p>
          </Card>
          <Card className="p-5">
            <MessageCircle className="h-5 w-5 text-brand" />
            <h3 className="mt-3 text-sm font-semibold">Idiomas atendidos</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Atendemos em português (Brasil) e, em casos específicos, em inglês. Não temos suporte por telefone.
            </p>
          </Card>
          <Card className="p-5">
            <MapPin className="h-5 w-5 text-brand" />
            <h3 className="mt-3 text-sm font-semibold">Onde estamos</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Empresa brasileira, operação 100% remota. Correspondência oficial pode ser solicitada pelo canal de privacidade.
            </p>
          </Card>
        </section>

        <AdSlot slot="feed" label="Publicidade" />

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Denúncias e conteúdo abusivo</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Se você encontrou um perfil ForLink apontando para conteúdo ilegal, discurso de ódio, golpes, phishing ou material que viole os <Link to="/termos" className="text-brand hover:underline">nossos termos de uso</Link>, envie um e-mail para <a href="mailto:abuso@forlink.app" className="text-brand hover:underline">abuso@forlink.app</a> com o link do perfil, uma descrição do problema e, se possível, capturas de tela. Analisamos todos os relatos e, quando cabível, removemos o conteúdo ou suspendemos a conta em até 24 horas úteis. Denúncias anônimas são aceitas, mas casos que exigem retorno formal precisam de identificação.
          </p>
        </section>
      </main>

      <footer className="mt-16 border-t bg-secondary/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ForLink · forlink.app</span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/sobre" className="hover:text-foreground">Sobre</Link>
            <Link to="/guias" className="hover:text-foreground">Guias</Link>
            <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link to="/termos" className="hover:text-foreground">Termos</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
