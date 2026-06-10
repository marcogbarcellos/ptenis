import { Resend } from "resend";

type Template = { subject: string; html: string };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const wrap = (corpo: string) =>
  `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
     <h2 style="color:#15803d">🎾 PTenis</h2>${corpo}
     <p style="color:#888;font-size:12px;margin-top:32px">Comunidade de tênis — este e-mail é automático.</p>
   </div>`;

const botao = (url: string, texto: string) =>
  `<p><a href="${url}" style="background:#15803d;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;display:inline-block">${texto}</a></p>`;

export const emailResetSenha = (link: string): Template => ({
  subject: "Redefinir sua senha — PTenis",
  html: wrap(`<p>Recebemos um pedido para redefinir sua senha. O link vale por 1 hora.</p>${botao(link, "Redefinir senha")}<p>Se não foi você, ignore este e-mail.</p>`),
});

export const emailPropostaRecebida = (deQuem: string, linkJogo: string): Template => ({
  subject: `${deQuem} propôs uma data de jogo — PTenis`,
  html: wrap(`<p><strong>${escapeHtml(deQuem)}</strong> propôs data para um jogo com você.</p>${botao(linkJogo, "Ver proposta")}`),
});

export const emailAmistosoCombinado = (deQuem: string, linkJogo: string): Template => ({
  subject: `${deQuem} marcou um amistoso com você — PTenis`,
  html: wrap(`<p><strong>${escapeHtml(deQuem)}</strong> marcou um amistoso com você no app.</p>${botao(linkJogo, "Ver jogo")}`),
});

export const emailPlacarParaConfirmar = (deQuem: string, linkJogo: string): Template => ({
  subject: `Placar para você confirmar — PTenis`,
  html: wrap(`<p><strong>${escapeHtml(deQuem)}</strong> lançou o placar de um jogo com você. Sem resposta em 48h, confirma sozinho.</p>${botao(linkJogo, "Confirmar placar")}`),
});

export async function sendEmail(to: string, template: Template) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email desativado] para=${to} assunto=${template.subject}`);
    console.log(template.html);
    return;
  }
  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "PTenis <onboarding@resend.dev>",
      to,
      subject: template.subject,
      html: template.html,
    });
  } catch (e) {
    console.error("Falha ao enviar e-mail (seguindo sem ele):", e);
  }
}

export const appUrl = () => {
  const u = process.env.APP_URL;
  if (!u) throw new Error("APP_URL não configurada.");
  return u;
};

export const linkJogo = (id: string) => `${appUrl()}/jogo/${id}`;
