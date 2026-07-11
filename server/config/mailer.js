import nodemailer from 'nodemailer';
import net from 'net';

const BUSINESS_NAME = process.env.BUSINESS_NAME || 'HIKLASS Academy';
const IS_DEV = process.env.NODE_ENV !== 'production';

let smtpOverride = null;

export function setSmtpOverride(value) {
  smtpOverride = value || null;
}

export function getSmtpOverride() {
  return smtpOverride;
}

export function hasSmtpConfig() {
  const config = smtpConfig();
  return Boolean(config.host && config.port && config.user && config.pass);
}

export function smtpTimeoutMs() {
  return Number(process.env.SMTP_TIMEOUT_MS || 30000);
}

function envValue(...keys) {
  const value = keys.map((key) => process.env[key]).find((item) => item);
  if (value === undefined || value === null) return '';
  return String(value).trim().replace(/^(['"])(.*)\1$/, '$2');
}

function smtpPassword() {
  const encodedPassword = envValue('SMTP_PASS_BASE64');
  const validBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(encodedPassword) && encodedPassword.length % 4 === 0;
  if (validBase64) {
    try {
      const decodedPassword = Buffer.from(encodedPassword, 'base64').toString('utf8');
      if (decodedPassword) return decodedPassword;
    } catch (error) {
      console.error('SMTP_PASS_BASE64 could not be decoded:', error?.message || error);
    }
  } else if (encodedPassword) {
    console.error('SMTP_PASS_BASE64 is not valid Base64. Falling back to SMTP_PASS.');
  }
  return envValue('SMTP_PASS', 'SMTP_PASSWORD', 'MAIL_PASS', 'MAIL_PASSWORD', 'EMAIL_PASS', 'EMAIL_PASSWORD');
}

export function smtpConfig(overrides = {}) {
  const host = smtpOverride?.smtpHost || envValue('SMTP_HOST', 'MAIL_HOST', 'EMAIL_HOST');
  const port = Number(smtpOverride?.smtpPort || envValue('SMTP_PORT', 'MAIL_PORT') || 465);
  const secureValue = smtpOverride && typeof smtpOverride.smtpSecure === 'boolean'
    ? smtpOverride.smtpSecure
    : (envValue('SMTP_SECURE', 'MAIL_SECURE') || 'true');
  const user = smtpOverride?.smtpUser || envValue('SMTP_USER', 'SMTP_USERNAME', 'MAIL_USER', 'MAIL_USERNAME', 'EMAIL_USER');
  const pass = smtpOverride?.smtpPass || smtpPassword();
  return {
    host: overrides.host || host,
    port: overrides.port || port,
    secure: typeof overrides.secure === 'boolean' ? overrides.secure : String(secureValue).toLowerCase() === 'true',
    user,
    pass,
    from: smtpOverride?.smtpFrom || envValue('SMTP_FROM') || `"${BUSINESS_NAME}" <${user}>`,
  };
}

export function smtpConfigCandidates() {
  const config = smtpConfig();
  const hosts = [config.host].filter(Boolean);
  const uniqueHosts = [...new Set(hosts.map((host) => host.trim()).filter(Boolean))];
  const candidates = [];
  for (const host of uniqueHosts) {
    candidates.push(smtpConfig({ host }));
    candidates.push(smtpConfig({ host, port: 587, secure: false }));
    candidates.push(smtpConfig({ host, port: 465, secure: true }));
  }
  return [...new Map(candidates.map((config) => [`${config.host}:${config.port}:${config.secure}`, config])).values()];
}

export function createTransporter(config = smtpConfig()) {
  if (!hasSmtpConfig()) return null;
  const timeout = smtpTimeoutMs();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    family: 4,
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    socketTimeout: timeout,
    tls: {
      servername: config.host,
    },
    auth: {
      user: config.user,
      pass: config.pass,
    },
    logger: IS_DEV,
    debug: IS_DEV,
  });
}

export async function createVerifiedTransporter() {
  if (!hasSmtpConfig()) return null;

  let lastError;
  let lastConfig;
  const attempts = [];
  for (const config of smtpConfigCandidates()) {
    let transporter;
    try {
      await checkSmtpPort(config);
      transporter = createTransporter(config);
      await withTimeout(
        transporter.verify(),
        smtpTimeoutMs(),
        'SMTP verification timed out before authentication completed.',
      );
      return { transporter, config };
    } catch (error) {
      transporter?.close();
      lastError = error;
      lastConfig = config;
      attempts.push({
        host: config.host,
        port: config.port,
        secure: config.secure,
        code: error?.code || 'SMTP_ERROR',
        message: explainSmtpError(error, config),
      });
      console.error(`SMTP verification failed for ${config.host}:${config.port}:`, explainSmtpError(error, config));
    }
  }

  const error = lastError || new Error('SMTP verification failed for every configured host.');
  error.smtpAttempts = attempts;
  error.smtpLastConfig = lastConfig;
  throw error;
}

export async function sendMailWithSmtpCandidates(mailOptions, label = 'email') {
  if (!hasSmtpConfig()) {
    throw new Error('SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to server/.env.');
  }

  let lastError;
  let lastConfig;
  const attempts = [];

  for (const config of smtpConfigCandidates()) {
    const mailVariants = [
      mailOptions,
      mailOptions.attachments?.length ? { ...mailOptions, attachments: [] } : null,
    ].filter(Boolean);

    for (const variant of mailVariants) {
      let transporter;
      const variantLabel = variant.attachments?.length ? 'with attachments' : 'without attachments';
      try {
        await checkSmtpPort(config);
        transporter = createTransporter(config);
        await withTimeout(
          transporter.verify(),
          smtpTimeoutMs(),
          'SMTP verification timed out before authentication completed.',
        );

        const info = await withTimeout(
          transporter.sendMail({
            ...variant,
            from: config.from,
          }),
          smtpTimeoutMs(),
          'SMTP timed out before email delivery completed.',
        );

        return { info, config, attempts };
      } catch (error) {
        lastError = error;
        lastConfig = config;
        const message = explainSmtpError(error, config);
        attempts.push({
          host: config.host,
          port: config.port,
          secure: config.secure,
          attachments: Boolean(variant.attachments?.length),
          code: error?.code || 'SMTP_ERROR',
          message,
        });
        console.error(`SMTP ${label} failed for ${config.host}:${config.port} ${variantLabel}:`, message);
      } finally {
        transporter?.close();
      }
    }
  }

  const error = lastError || new Error(`${label} delivery failed for every configured SMTP host.`);
  error.smtpAttempts = attempts;
  error.smtpLastConfig = lastConfig;
  throw error;
}

export function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function explainSmtpError(error, config = smtpConfig()) {
  if (error?.code === 'EACCES') {
    return `Outbound SMTP is blocked by this machine or network for ${config.host}:${config.port}. Allow SMTP submission or deploy from a host that permits it.`;
  }

  if (error?.code === 'ENOTFOUND') {
    return `SMTP host ${config.host} does not resolve in DNS. Check SMTP_HOST in server/.env.`;
  }

  if (error?.code === 'ECONNREFUSED') {
    return `SMTP host ${config.host}:${config.port} refused the connection. Check the host, port, and secure setting.`;
  }

  if (error?.code === 'ETIMEDOUT' || /timed out/i.test(error?.message || '')) {
    return `SMTP connection to ${config.host}:${config.port} timed out. This is usually a firewall, ISP, or hosting outbound-port block.`;
  }

  if (error?.code === 'EAUTH') {
    return `SMTP authentication failed for ${config.user || 'the configured user'} on ${config.host}:${config.port}. Check SMTP_USER and SMTP_PASS in the production environment variables.`;
  }

  return error?.message || 'Email delivery failed for an unknown SMTP reason.';
}

export function publicEmailFailureMessage(error) {
  const reason = error?.code === 'EAUTH'
    ? 'the email service login failed'
    : error?.code === 'ENOTFOUND'
      ? 'the email server could not be found'
      : error?.code === 'ECONNREFUSED'
        ? 'the email server refused the connection'
        : error?.code === 'ETIMEDOUT' || /timed out/i.test(error?.message || '')
          ? 'the email server connection timed out'
          : 'the email service is temporarily unavailable';

  return `Your order was saved successfully, but the confirmation email could not be sent because ${reason}. HIKLASS Academy will contact you shortly.`;
}

export function checkSmtpPort(config = smtpConfig()) {
  if (!hasSmtpConfig()) {
    return Promise.reject(new Error('SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to server/.env.'));
  }

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: config.host,
      port: config.port,
      family: 4,
      timeout: Math.min(smtpTimeoutMs(), 6000),
    });

    socket.once('connect', () => {
      socket.destroy();
      resolve();
    });

    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error(`SMTP connection timed out for ${config.host}:${config.port}.`));
    });

    socket.once('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Verify the SMTP connection once at process startup and print a clear status line.
 * Never throws — a failed verification here must not crash the server.
 */
export async function verifySmtpOnStartup() {
  if (!hasSmtpConfig()) {
    console.warn('⚠️  SMTP is not fully configured (missing SMTP_HOST/PORT/USER/PASS). Email sending is disabled until server/.env is completed.');
    return { connected: false, reason: 'not_configured' };
  }

  try {
    const { transporter } = await createVerifiedTransporter();
    transporter.close();
    console.log('✅ SMTP Connected Successfully');
    return { connected: true };
  } catch (error) {
    console.error('❌ SMTP Authentication Failed:', explainSmtpError(error, error.smtpLastConfig));
    return { connected: false, reason: error?.code || 'SMTP_ERROR', message: explainSmtpError(error, error.smtpLastConfig) };
  }
}
