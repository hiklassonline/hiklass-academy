import { enrichOrder, sendOrderEmails } from '../server/index.js';

const recipient = process.argv[2] || 'hiklassonline2018@gmail.com';
const now = new Date().toISOString();

const order = enrichOrder({
  id: `LIVE-MAIL-TEST-${Date.now()}`,
  createdAt: now,
  name: 'HIKLASS Live Mail Test',
  email: recipient,
  phone: '+237 651 251 941',
  mode: 'Online',
  paymentMethod: 'Cash',
  courses: ['Basic Computer Training'],
  packages: [],
  notes: `Live email template test from local Codex run on ${now}.`,
  subtotal: 25000,
  discountCode: '',
  discountAmount: 0,
  grandTotal: 25000,
});

try {
  const result = await sendOrderEmails(order);
  console.log(JSON.stringify({
    recipient,
    studentEmailSent: result.studentEmailSent,
    adminEmailSent: result.adminEmailSent,
    warnings: result.warnings,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    recipient,
    error: error?.message || 'Email test failed.',
    attempts: (error?.smtpAttempts || []).map((attempt) => ({
      host: attempt.host,
      port: attempt.port,
      secure: attempt.secure,
      code: attempt.code,
      message: attempt.message,
    })),
  }, null, 2));
  process.exitCode = 1;
}
