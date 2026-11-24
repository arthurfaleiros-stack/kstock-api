const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  /**
   * Obtém ou inicializa o transportador SMTP do Nodemailer
   */
  async getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    // Se as credenciais SMTP foram preenchidas no .env, usa o servidor configurado
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 25000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
      });
      return this.transporter;
    }

    // Modo desenvolvimento sem SMTP real configurado: envio simulado instantâneo sem delay de rede
    this.transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return this.transporter;
  }

  /**
   * Dispara e-mail de recuperação de senha com link e token
   */
  async sendPasswordResetEmail({ email, nome, token }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/recuperar-senha?token=${token}&email=${encodeURIComponent(email)}`;
    const fromAddress = process.env.SMTP_FROM || '"KeepStock" <nao-responda@keepstock.com.br>';

    const subject = 'Recuperação de Senha — KeepStock';

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; padding: 40px 20px; color: #f8fafc;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Cabeçalho -->
          <tr>
            <td style="padding: 32px 32px 20px; text-align: center; border-bottom: 1px solid #334155;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                <span style="color: #ffffff;">Keep</span><span style="color: #6366f1;">Stock</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">Sistema de Gestão e Controle de Estoque</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 14px; font-size: 18px; color: #f8fafc; font-weight: 600;">
                Olá, ${nome || 'Usuário'}!
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong>KeepStock</strong>. Para cadastrar sua nova senha com segurança, utilize o botão abaixo:
              </p>

              <!-- Botão Principal -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);">
                  Redefinir Minha Senha
                </a>
              </div>

              <!-- Token manual -->
              <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 8px; font-size: 12px; color: #94a3b8; font-weight: 500;">
                  Ou informe este token manualmente na tela de recuperação:
                </p>
                <div style="font-family: monospace; font-size: 13px; background-color: #1e293b; color: #a5b4fc; padding: 10px 12px; border-radius: 6px; word-break: break-all; border: 1px dashed #4f46e5;">
                  ${token}
                </div>
              </div>

              <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #94a3b8;">
                ⚠️ <strong>Atenção:</strong> Este link e token são válidos por <strong>1 hora</strong>. Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanecerá inalterada.
              </p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background-color: #0b1120; padding: 20px 32px; text-align: center; border-top: 1px solid #334155; font-size: 12px; color: #64748b;">
              KeepStock &copy; ${new Date().getFullYear()} — Todos os direitos reservados.
            </td>
          </tr>
        </table>
      </div>
    `;

    const textContent = `Olá, ${nome || 'Usuário'}!\n\nPara redefinir sua senha no KeepStock, acesse o link:\n${resetUrl}\n\nOu utilize o token: ${token}\n\nEste token expira em 1 hora.\nSe você não solicitou, ignore esta mensagem.`;

    // 1. Envio via MailerSend REST API (apenas se for chave de API 'mlsn.')
    const isApiKey = process.env.MAILERSEND_API_KEY && process.env.MAILERSEND_API_KEY.startsWith('mlsn.');
    if (isApiKey) {
      try {
        const fromEmail = process.env.MAILERSEND_FROM_EMAIL || 'info@trial.mailersend.net';
        const fromName = process.env.MAILERSEND_FROM_NAME || 'KeepStock';

        const msResponse = await fetch('https://api.mailersend.com/v1/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${process.env.MAILERSEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: { email: fromEmail, name: fromName },
            to: [{ email, name: nome || 'Usuário' }],
            subject,
            html,
            text: textContent,
          }),
        });

        if (msResponse.status === 202 || msResponse.ok) {
          const messageId = msResponse.headers.get('x-message-id');
          console.log(`✉️  [MailerSend API] E-mail enviado com sucesso para: ${email} (Status: ${msResponse.status})`);
          return { success: true, messageId };
        } else {
          const errData = await msResponse.json().catch(() => ({}));
          console.warn(`⚠️ [MailerSend API] Falha na API (${msResponse.status}), tentando via SMTP...`, errData.message || '');
        }
      } catch (msErr) {
        console.warn(`⚠️ [MailerSend API] Exceção de rede na API, tentando via SMTP...`, msErr.message);
      }
    }

    // 2. Envio via SMTP (Nodemailer) ou simulador local
    try {
      const transporter = await this.getTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html,
        text: textContent,
      });

      console.log(`✉️  E-mail de recuperação enviado com sucesso para: ${email}`);

      // Se for conta de teste do Ethereal, exibe a URL de preview do e-mail no navegador
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`🔗 [PREVIEW DO E-MAIL]: ${previewUrl}`);
      }

      return { success: true, messageId: info.messageId, previewUrl };
    } catch (error) {
      console.error(`❌ Erro ao enviar e-mail de recuperação para ${email}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
