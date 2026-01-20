/* eslint-disable @typescript-eslint/no-explicit-any */
import ejs from "ejs";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import ENV from "../../config/env.js";
import ApiError from "../../app/errors/ApiError.js";


const smtpPort = Number(ENV.EMAIL_SENDER.SMTP_PORT || 0);
const smtpSecure = smtpPort === 465; // use SSL only for port 465
const transporter = nodemailer.createTransport({
  host: ENV.EMAIL_SENDER.SMTP_HOST,
  port: smtpPort || undefined,
  secure: smtpSecure,
  auth:
    ENV.EMAIL_SENDER.SMTP_USER && ENV.EMAIL_SENDER.SMTP_PASS
      ? {
          user: ENV.EMAIL_SENDER.SMTP_USER,
          pass: ENV.EMAIL_SENDER.SMTP_PASS,
        }
      : undefined,
});

interface SendEmailOptions {
  to: string;
  subject: string;
  templateName: string;
  templateData?: Record<string, any>;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType: string;
  }[];
}

export const sendEmail = async ({
  to,
  subject,
  templateName,
  templateData,
  attachments,
}: SendEmailOptions) => {
  try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const templatePath = path.join(__dirname, `templates/${templateName}.ejs`);
  const html = await ejs.renderFile(templatePath, templateData);
    const info = await transporter.sendMail({
      from: ENV.EMAIL_SENDER.SMTP_FROM,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });
    console.log(`\u2709\uFE0F Email sent to ${to}: ${info.messageId}`);
  } catch (error: any) {
    console.log("email sending error", error.message);
    throw new ApiError(401, "Email error");
  }
};
