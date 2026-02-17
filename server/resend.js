const RESEND_API_URL = 'https://api.resend.com/emails';

function getRequiredEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function isResendConfigured() {
  return Boolean(getRequiredEnv('RESEND_API_KEY') && getRequiredEnv('RESEND_FROM_EMAIL'));
}

export async function sendSignupEmail({ toEmail, appUrl }) {
  const apiKey = getRequiredEnv('RESEND_API_KEY');
  const fromEmail = getRequiredEnv('RESEND_FROM_EMAIL');

  if (!apiKey || !fromEmail) {
    throw new Error('Resend não configurado. Define RESEND_API_KEY e RESEND_FROM_EMAIL.');
  }

  const safeAppUrl = typeof appUrl === 'string' && appUrl.trim() ? appUrl.trim() : 'http://localhost:8080';
  const verifyUrl = `${safeAppUrl}/auth/verify?email=${encodeURIComponent(toEmail)}`;

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: 'Bem-vindo ao Buracos de Portugal!',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <h2>Conta criada com sucesso</h2>
          <p>Obrigado por te registares no Buracos de Portugal.</p>
          <p>Para confirmares o email, abre esta página e introduz o código de 6 dígitos recebido no email da Neon Auth:</p>
          <p><a href="${verifyUrl}" target="_blank" rel="noreferrer">${verifyUrl}</a></p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = JSON.stringify(payload);
    } catch {
      details = await response.text();
    }

    throw new Error(`Falha ao enviar email com Resend (${response.status}): ${details}`);
  }

  return response.json();
}
