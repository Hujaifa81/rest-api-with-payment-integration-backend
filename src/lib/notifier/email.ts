import nodemailer from "nodemailer";

interface DeadLetterInfo {
  outboxId: string;
  orderId: string;
  paymentId: string;
  reason?: string;
}

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const from = process.env.DEAD_LETTER_EMAIL_FROM || `noreply@${process.env.DOMAIN || "example.com"}`;
const to = process.env.DEAD_LETTER_EMAIL_TO; // comma-separated

function transporter() {
  if (!smtpHost || !smtpPort) {
    throw new Error("SMTP_HOST and SMTP_PORT must be set to send emails");
  }
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  });
}

export async function sendDeadLetterNotification(info: DeadLetterInfo) {
  if (!to) {
    console.warn("DEAD_LETTER_EMAIL_TO not configured; skipping dead-letter email");
    return;
  }

  const t = transporter();
  const subject = `Dead-lettered outbox event ${info.outboxId}`;
  const body = [
    `Outbox ID: ${info.outboxId}`,
    `Order ID: ${info.orderId}`,
    `Payment ID: ${info.paymentId}`,
    `Reason: ${info.reason || "N/A"}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");

  await t.sendMail({ from, to, subject, text: body });
}

export async function sendDeadLetterResolvedNotification(
  info: DeadLetterInfo & { resolution?: string }
) {
  if (!to) return;
  const t = transporter();
  const subject = `Dead-letter resolved ${info.outboxId}`;
  const body = [
    `Outbox ID: ${info.outboxId}`,
    `Order ID: ${info.orderId}`,
    `Payment ID: ${info.paymentId}`,
    `Resolution: ${info.resolution || "auto-restored"}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");
  await t.sendMail({ from, to, subject, text: body });
}

export default { sendDeadLetterNotification, sendDeadLetterResolvedNotification };
