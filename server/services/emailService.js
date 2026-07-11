import { sendMailWithSmtpCandidates } from '../config/mailer.js';
import {
  passwordResetTemplate,
  passwordResetPlainText,
  contactNotificationTemplate,
  contactNotificationPlainText,
  contactAutoReplyTemplate,
  contactAutoReplyPlainText,
} from '../templates/emailTemplates.js';

/**
 * Low-level reusable send function. Never throws — always resolves to
 * { success: true, info } or { success: false, error }.
 */
export async function sendEmail({ to, subject, html, text, attachments, replyTo }, label = 'email') {
  try {
    const { info } = await sendMailWithSmtpCandidates({ to, subject, html, text, attachments, replyTo }, label);
    return { success: true, info };
  } catch (error) {
    console.error(`sendEmail(${label}) failed:`, error?.message || error);
    return { success: false, error };
  }
}

/** Sends an already-rendered enrollment confirmation email to a student. */
export async function sendEnrollmentConfirmation({ to, subject, html, text, attachments }) {
  return sendEmail({ to, subject, html, text, attachments }, 'enrollment confirmation email');
}

/** Sends an already-rendered new-enrollment notification email to the academy admin. */
export async function sendAdminNotification({ to, subject, html, text, attachments, replyTo }) {
  return sendEmail({ to, subject, html, text, attachments, replyTo }, 'admin notification email');
}

/** Builds and sends a password-reset email with a secure reset link. */
export async function sendPasswordReset({ to, name, resetUrl, expiresInMinutes = 60 }) {
  const html = passwordResetTemplate({ name, resetUrl, expiresInMinutes });
  const text = passwordResetPlainText({ name, resetUrl, expiresInMinutes });
  return sendEmail({ to, subject: '🔒 Reset Your HIKLASS Academy Password', html, text }, 'password reset email');
}

/**
 * Builds and sends a contact-form notification email to the academy admin,
 * plus a confirmation auto-reply to the person who submitted the form.
 * Overall success reflects the admin notification, since that's the
 * business-critical delivery; the auto-reply result is reported separately.
 */
export async function sendContactEmail({ name, email, phone, subject, message, adminEmail }) {
  const submittedAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const adminHtml = contactNotificationTemplate({ name, email, phone, subject, message, submittedAt });
  const adminText = contactNotificationPlainText({ name, email, phone, subject, message, submittedAt });
  const adminResult = await sendEmail(
    { to: adminEmail, replyTo: email, subject: `📩 New Contact Form Message from ${name}`, html: adminHtml, text: adminText },
    'contact form admin email',
  );

  const autoReplyHtml = contactAutoReplyTemplate({ name, subject, message, submittedAt });
  const autoReplyText = contactAutoReplyPlainText({ name, subject, message, submittedAt });
  const autoReplyResult = await sendEmail(
    { to: email, subject: '✅ We Received Your Message - HIKLASS Academy', html: autoReplyHtml, text: autoReplyText },
    'contact form auto-reply email',
  );

  return {
    success: adminResult.success,
    error: adminResult.error,
    info: adminResult.info,
    autoReplySent: autoReplyResult.success,
    autoReplyError: autoReplyResult.error,
  };
}
