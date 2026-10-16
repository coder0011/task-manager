import nodemailer, { type Transporter } from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';

class MailerService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initTransporter();
  }

  // Initializes the nodemailer transporter based on environment configuration
  private initTransporter() {
    try {
      if (env.smtp.user && env.smtp.pass) {
        this.transporter = nodemailer.createTransport({
          host: env.smtp.host,
          port: env.smtp.port,
          secure: env.smtp.secure,
          auth: {
            user: env.smtp.user,
            pass: env.smtp.pass
          }
        });
        this.isConfigured = true;
      } else {
        // Fallback development transporter (logs payload and outputs simulation)
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: 'datapure_dev@ethereal.email',
            pass: 'datapure_dev_secret'
          }
        });
        this.isConfigured = false;
      }
    } catch (err) {
      logger.error({ err }, 'Failed to initialize nodemailer transport');
    }
  }

  /**
   * Generates a sleek, dark-themed HTML template matching DataPure's design system
   */
  private generateDarkEmailTemplate(options: {
    title: string;
    preheader: string;
    contentHtml: string;
    actionButton?: {
      label: string;
      url: string;
    };
    footerNote?: string;
  }): string {
    const { title, preheader, contentHtml, actionButton, footerNote } = options;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #09090b;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f4f4f5;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #09090b;
      padding: 40px 16px;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #121215;
      border: 1px solid #27272a;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 36px 24px;
      border-bottom: 1px solid #27272a;
      background-color: #16161a;
      text-align: left;
    }
    .logo-badge {
      display: inline-block;
      width: 32px;
      height: 32px;
      line-height: 32px;
      text-align: center;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      font-weight: 700;
      font-size: 16px;
      border-radius: 8px;
      vertical-align: middle;
      margin-right: 10px;
    }
    .brand-title {
      display: inline-block;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: #ffffff;
      vertical-align: middle;
    }
    .content {
      padding: 36px;
      line-height: 1.6;
    }
    .headline {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
      letter-spacing: -0.4px;
    }
    .paragraph {
      font-size: 14px;
      color: #a1a1aa;
      margin: 0 0 20px 0;
      line-height: 1.6;
    }
    .btn-container {
      margin: 28px 0;
      text-align: left;
    }
    .btn {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }
    .notice-box {
      background-color: #18181c;
      border: 1px solid #27272a;
      border-radius: 10px;
      padding: 14px 16px;
      margin: 24px 0 0;
    }
    .notice-text {
      font-size: 12px;
      color: #71717a;
      margin: 0;
      line-height: 1.5;
    }
    .notice-text strong {
      color: #a1a1aa;
    }
    .fallback-url {
      font-size: 11px;
      color: #71717a;
      word-break: break-all;
      margin-top: 16px;
    }
    .footer {
      padding: 24px 36px;
      background-color: #0d0d10;
      border-top: 1px solid #27272a;
      text-align: center;
    }
    .footer-text {
      font-size: 12px;
      color: #52525b;
      margin: 0 0 4px 0;
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#09090b;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo-badge">D</span>
        <span class="brand-title">DataPure Task Manager</span>
      </div>
      <div class="content">
        <h1 class="headline">${title}</h1>
        ${contentHtml}

        ${actionButton ? `
        <div class="btn-container">
          <a href="${actionButton.url}" target="_blank" class="btn">${actionButton.label}</a>
        </div>
        <div class="fallback-url">
          If the button above does not work, copy and paste this URL into your browser:<br>
          <a href="${actionButton.url}" style="color: #3b82f6; text-decoration: underline;">${actionButton.url}</a>
        </div>
        ` : ''}

        ${footerNote ? `
        <div class="notice-box">
          <p class="notice-text">${footerNote}</p>
        </div>
        ` : ''}
      </div>
      <div class="footer">
        <p class="footer-text">© ${new Date().getFullYear()} DataPure Inc. All rights reserved.</p>
        <p class="footer-text">Enterprise Task Management & Sprint Governance Platform</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Sends Password Reset Email with the custom dark theme template
   */
  async sendPasswordResetEmail(options: {
    toEmail: string;
    userName?: string;
    resetToken: string;
  }): Promise<{ sent: boolean; previewUrl?: string }> {
    const { toEmail, userName, resetToken } = options;
    const resetUrl = `${env.clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const displayName = userName || toEmail.split('@')[0];

    const subject = 'Reset Your DataPure Account Password';
    const preheader = 'Instructions to securely reset your DataPure password.';

    const contentHtml = `
      <p class="paragraph">Hello <strong>${displayName}</strong>,</p>
      <p class="paragraph">
        We received an official request to reset the password associated with your DataPure Task Manager account.
        Please click the button below to set a new password.
      </p>
    `;

    const footerNote = `
      <strong>Security Advisory:</strong> This password reset link is valid for <strong>1 hour</strong>. 
      If you did not request this password change, you can safely ignore this email — your account and credentials remain protected.
    `;

    const html = this.generateDarkEmailTemplate({
      title: 'Reset Your Password',
      preheader,
      contentHtml,
      actionButton: {
        label: 'Reset Password',
        url: resetUrl
      },
      footerNote
    });

    const text = `
Hello ${displayName},

We received a request to reset your DataPure account password.
Please visit the following link to choose a new password:

${resetUrl}

This link is valid for 1 hour. If you did not request this, please disregard this email.
    `.trim();

    try {
      if (this.isConfigured && this.transporter) {
        await this.transporter.sendMail({
          from: env.smtp.from,
          to: toEmail,
          subject,
          text,
          html
        });
        logger.info({ to: toEmail }, 'Password reset email dispatched via SMTP');
        return { sent: true };
      } else {
        // Development mode: log template and token
        logger.info(
          { to: toEmail, resetUrl },
          '[Mailer Development] Password reset email generated with dark theme template'
        );
        return { 
          sent: true,
          previewUrl: resetUrl 
        };
      }
    } catch (err) {
      logger.error({ err, to: toEmail }, 'Failed to send password reset email');
      return { sent: false };
    }
  }

  /**
   * Sends Team Member Invitation Email
   */
  async sendTeamInviteEmail(options: {
    toEmail: string;
    fullName: string;
    role: string;
    inviterName: string;
    tempPassword?: string;
  }): Promise<{ sent: boolean }> {
    const { toEmail, fullName, role, inviterName, tempPassword } = options;
    const loginUrl = `${env.clientUrl}/login`;

    const subject = `You've been invited to DataPure by ${inviterName}`;
    const preheader = `Join your team workspace on DataPure as a ${role}.`;

    const contentHtml = `
      <p class="paragraph">Hello <strong>${fullName}</strong>,</p>
      <p class="paragraph">
        <strong>${inviterName}</strong> has invited you to join the organization workspace on DataPure Task Manager with the role of <strong>${role}</strong>.
      </p>
      ${tempPassword ? `
      <div class="notice-box" style="margin-bottom: 20px;">
        <p class="notice-text">
          <strong>Temporary Password:</strong> <code style="color: #60a5fa; font-family: monospace;">${tempPassword}</code><br>
          Please sign in and change your password in your profile settings.
        </p>
      </div>
      ` : ''}
    `;

    const html = this.generateDarkEmailTemplate({
      title: 'Welcome to DataPure',
      preheader,
      contentHtml,
      actionButton: {
        label: 'Sign In to Workspace',
        url: loginUrl
      },
      footerNote: 'If you have questions, please contact your organization administrator.'
    });

    try {
      if (this.isConfigured && this.transporter) {
        await this.transporter.sendMail({
          from: env.smtp.from,
          to: toEmail,
          subject,
          html,
          text: `Welcome to DataPure! You were invited by ${inviterName} as ${role}. Login at: ${loginUrl}`
        });
      } else {
        logger.info({ to: toEmail, role }, '[Mailer Development] Team invite email generated');
      }
      return { sent: true };
    } catch (err) {
      logger.error({ err, to: toEmail }, 'Failed to send team invite email');
      return { sent: false };
    }
  }
}

export const mailerService = new MailerService();
export default mailerService;
