const BRAND_NAVY = '#0D2957';
const BRAND_RED = '#D30D1A';
const BRAND_BLUE = '#0149CA';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Shared branded wrapper for the newer, self-contained transactional emails
 * (password reset, contact notification, test email). Table-based inline
 * styles for maximum email-client compatibility.
 */
function baseEmailWrapper({ preheader = '', title, subtitle, bodyHtml }) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#F4F7FB;color:#2B2B2B;font-family:Arial,Helvetica,sans-serif">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F4F7FB" style="border-collapse:collapse;background:#F4F7FB">
          <tr>
            <td align="center" style="padding:28px 12px">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:separate;width:600px;max-width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 18px 50px rgba(17,24,39,0.10)">
                <tr>
                  <td bgcolor="${BRAND_NAVY}" style="background:${BRAND_NAVY};padding:26px 28px">
                    <div style="color:#FFFFFF;font-size:22px;line-height:28px;font-weight:700">HIKLASS Academy</div>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="${BRAND_RED}" height="3" style="height:3px;font-size:0;line-height:3px;background:${BRAND_RED}">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:30px 28px">
                    <h1 style="margin:0 0 8px;color:${BRAND_NAVY};font-size:22px;line-height:28px;font-weight:700">${escapeHtml(title)}</h1>
                    ${subtitle ? `<p style="margin:0 0 18px;color:#6B7280;font-size:14px;line-height:20px">${escapeHtml(subtitle)}</p>` : ''}
                    ${bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px 28px;border-top:1px solid #E5E7EB">
                    <p style="margin:0;color:#6B7280;font-size:13px;line-height:20px">
                      Need help? Email <a href="mailto:info@hiklassacademy.com" style="color:${BRAND_BLUE};text-decoration:none">info@hiklassacademy.com</a>
                      or WhatsApp <a href="https://wa.me/237651251941" style="color:${BRAND_BLUE};text-decoration:none">+237 651 251 941</a>.
                    </p>
                    <p style="margin:10px 0 0;color:#9CA3AF;font-size:12px;line-height:18px">&copy; ${new Date().getFullYear()} HIKLASS Academy. All Rights Reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
}

function button(label, url) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:22px 0">
      <tr>
        <td bgcolor="${BRAND_RED}" style="background:${BRAND_RED};border-radius:9px">
          <a href="${url}" style="display:inline-block;padding:13px 26px;color:#FFFFFF;font-size:15px;line-height:20px;font-weight:700;text-decoration:none">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

export function passwordResetTemplate({ name, resetUrl, expiresInMinutes = 60 }) {
  const bodyHtml = `
    <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:24px">Hello ${escapeHtml(name || 'there')},</p>
    <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:24px">
      We received a request to reset the password for your HIKLASS Academy student account. Click the button below to choose a new password.
      This link expires in ${expiresInMinutes} minutes.
    </p>
    ${button('Reset My Password', resetUrl)}
    <p style="margin:18px 0 0;color:#6B7280;font-size:13px;line-height:20px">
      If the button above doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color:${BRAND_BLUE};word-break:break-all">${escapeHtml(resetUrl)}</a>
    </p>
    <p style="margin:18px 0 0;color:#9CA3AF;font-size:13px;line-height:20px">
      If you didn't request a password reset, you can safely ignore this email — your password will not change.
    </p>`;

  return baseEmailWrapper({
    preheader: 'Reset your HIKLASS Academy password',
    title: 'Reset Your Password',
    subtitle: 'HIKLASS Academy Student Portal',
    bodyHtml,
  });
}

export function passwordResetPlainText({ name, resetUrl, expiresInMinutes = 60 }) {
  return [
    `Hello ${name || 'there'},`,
    '',
    `We received a request to reset the password for your HIKLASS Academy student account.`,
    `This link expires in ${expiresInMinutes} minutes:`,
    resetUrl,
    '',
    `If you didn't request this, you can safely ignore this email.`,
  ].join('\n');
}

export function contactNotificationTemplate({ name, email, phone, subject, message, submittedAt }) {
  const rows = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone || 'Not provided'],
    ['Subject', subject || 'General enquiry'],
    ['Submitted', submittedAt],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #EEF1F5;color:#6B7280;font-size:14px;width:120px">${escapeHtml(label)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #EEF1F5;color:#111827;font-size:14px;font-weight:700">${escapeHtml(String(value))}</td>
        </tr>`,
    )
    .join('');

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:18px">
      ${rowsHtml}
    </table>
    <p style="margin:0 0 6px;color:#6B7280;font-size:13px;font-weight:700;text-transform:uppercase">Message</p>
    <p style="margin:0;padding:14px;background:#F4F7FB;border-radius:10px;color:#111827;font-size:14px;line-height:22px;white-space:pre-line">${escapeHtml(message)}</p>`;

  return baseEmailWrapper({
    preheader: `New contact form message from ${name}`,
    title: 'New Contact Form Submission',
    subtitle: 'Submitted via hiklassacademy.com',
    bodyHtml,
  });
}

export function contactNotificationPlainText({ name, email, phone, subject, message, submittedAt }) {
  return [
    'New Contact Form Submission',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || 'Not provided'}`,
    `Subject: ${subject || 'General enquiry'}`,
    `Submitted: ${submittedAt}`,
    '',
    'Message:',
    message,
  ].join('\n');
}

export function contactAutoReplyTemplate({ name, subject, message, submittedAt }) {
  const bodyHtml = `
    <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:24px">Hello ${escapeHtml(name || 'there')},</p>
    <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:24px">
      Thanks for reaching out to HIKLASS Academy! We've received your message and a member of our team will get back to you within <strong>24 hours</strong>.
    </p>
    <p style="margin:0 0 6px;color:#6B7280;font-size:13px;font-weight:700;text-transform:uppercase">Your Message</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:18px">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #EEF1F5;color:#6B7280;font-size:14px;width:120px">Subject</td>
        <td style="padding:8px 0;border-bottom:1px solid #EEF1F5;color:#111827;font-size:14px;font-weight:700">${escapeHtml(subject || 'General enquiry')}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6B7280;font-size:14px">Sent</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:700">${escapeHtml(submittedAt)}</td>
      </tr>
    </table>
    <p style="margin:0;padding:14px;background:#F4F7FB;border-radius:10px;color:#111827;font-size:14px;line-height:22px;white-space:pre-line">${escapeHtml(message)}</p>
    <p style="margin:20px 0 0;color:#374151;font-size:14px;line-height:22px">
      Need a faster answer? Chat with our admissions team on WhatsApp at
      <a href="https://wa.me/237651251941" style="color:${BRAND_BLUE};text-decoration:none">+237 651 251 941</a>.
    </p>`;

  return baseEmailWrapper({
    preheader: "We've received your message and will reply within 24 hours",
    title: 'We Received Your Message',
    subtitle: 'HIKLASS Academy',
    bodyHtml,
  });
}

export function contactAutoReplyPlainText({ name, subject, message, submittedAt }) {
  return [
    `Hello ${name || 'there'},`,
    '',
    "Thanks for reaching out to HIKLASS Academy! We've received your message and a member of our team will get back to you within 24 hours.",
    '',
    `Subject: ${subject || 'General enquiry'}`,
    `Sent: ${submittedAt}`,
    '',
    'Your message:',
    message,
    '',
    'Need a faster answer? Chat with our admissions team on WhatsApp at +237 651 251 941.',
  ].join('\n');
}

export function testEmailTemplate({ recipient, sentAt }) {
  const bodyHtml = `
    <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:24px">
      This is a test email confirming that SMTP is correctly configured and working for HIKLASS Academy.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:18px 0">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #EEF1F5;color:#6B7280;font-size:14px">Sent to</td>
        <td style="padding:8px 0;border-bottom:1px solid #EEF1F5;color:#111827;font-size:14px;font-weight:700">${escapeHtml(recipient)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6B7280;font-size:14px">Sent at</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:700">${escapeHtml(sentAt)}</td>
      </tr>
    </table>
    <p style="margin:0;color:#16A34A;font-size:15px;line-height:24px;font-weight:700">✅ SMTP Working Successfully</p>`;

  return baseEmailWrapper({
    preheader: 'HIKLASS Academy SMTP test email',
    title: 'SMTP Test Email',
    subtitle: 'HIKLASS Academy Backend',
    bodyHtml,
  });
}
