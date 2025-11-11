import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { sendEmail as legacySendEmail, EmailOptions } from '../utils/sendEmail';

dotenv.config();

type EmailTemplateType = 'kyc_reminder' | 'activation_reminder' | 'reengagement' | 'newsletter';

interface SendTemplateParams {
  recipient: string;
  template: EmailTemplateType;
  variables?: Record<string, any>;
}

export class EmailService {
  private static instance: EmailService;
  private resend?: Resend;
  private dryRun: boolean;
  private fromEmail: string;
  private fromName?: string;

  private constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.dryRun = (process.env.EMAIL_DRY_RUN || 'false') === 'true';
    this.fromEmail = process.env.FROM_EMAIL || process.env.EMAIL_ADDRESS || '';
    this.fromName = process.env.FROM_NAME;

    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  public static getInstance() {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public getStatus() {
    return {
      dryRun: this.dryRun,
      provider: this.resend ? 'resend' : 'nodemailer',
      fromEmail: this.fromEmail,
    };
  }

  private renderTemplate(template: EmailTemplateType, variables: Record<string, any> = {}) {
    let subject = '';
    let html = '';

    const kycHtml = (vars: Record<string, any> = {}) => {
      const firstName = vars.firstName || 'Member';
      const kycLevel = vars.kycLevel || 'incomplete';
      const ctaUrl = vars.ctaUrl || 'https://chaincoop.com/kyc';
      return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #222;">
          <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;">
            <h2>🔐 Complete Your KYC Verification - Chain Coop</h2>
            <p>Hi ${firstName},</p>
            <p>Your KYC is currently <strong>${kycLevel}</strong>. Completing your KYC helps us keep the community secure and unlocks full access to Chain Coop features.</p>
            <ul>
              <li>Secure transactions</li>
              <li>Access advanced membership benefits</li>
              <li>Faster support resolution</li>
            </ul>
            <p>
              <a href="${ctaUrl}" style="display:inline-block;background:#0d6efd;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;">Complete KYC</a>
            </p>
            <p>If you have any questions, reply to this email and our team will assist you.</p>
            <p>— Chain Coop Team</p>
          </div>
        </body>
      </html>`;
    };

    const activationHtml = (vars: Record<string, any> = {}) => {
      const firstName = vars.firstName || 'Member';
      const activateUrl = vars.activateUrl || 'https://chaincoop.com/activate';
      return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #222;">
          <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;">
            <h2>⚡ Activate Your Chain Coop Account</h2>
            <p>Hi ${firstName},</p>
            <p>Your account isn’t fully activated yet. Activate now to start enjoying your membership benefits:</p>
            <ul>
              <li>Community participation</li>
              <li>Exclusive projects</li>
              <li>Member support</li>
            </ul>
            <p>
              <a href="${activateUrl}" style="display:inline-block;background:#0d6efd;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;">Activate Account</a>
            </p>
            <p>Need help? Reply to this message and we’ll assist.</p>
            <p>— Chain Coop Team</p>
          </div>
        </body>
      </html>`;
    };

    const reengagementHtml = (vars: Record<string, any> = {}) => {
      const firstName = vars.firstName || 'Member';
      const featuresUrl = vars.featuresUrl || 'https://chaincoop.com/features';
      return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #222;">
          <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;">
            <h2>🚀 We Miss You at Chain Coop!</h2>
            <p>Hi ${firstName},</p>
            <p>We’ve introduced new features and improvements that we think you’ll love. Come back and explore what’s new:</p>
            <ul>
              <li>Enhanced project discovery</li>
              <li>Better wallet integrations</li>
              <li>Streamlined member experience</li>
            </ul>
            <p>
              <a href="${featuresUrl}" style="display:inline-block;background:#0d6efd;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;">Explore Updates</a>
            </p>
            <p>Questions? Reply to this email—we’re here to help.</p>
            <p>— Chain Coop Team</p>
          </div>
        </body>
      </html>`;
    };

    const escapeHtml = (str: string) =>
      String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const newsletterHtml = (vars: Record<string, any> = {}) => {
      const title = vars.subject || 'Chain Coop Newsletter';
      const isHtml = vars.isHtml !== false; // default true
      const content = String(vars.content || '');
      const images: string[] = Array.isArray(vars.imageUrls) ? vars.imageUrls : [];
      const preheader = vars.preheader || '';
      const brandColor = '#0d6efd';

      const contentHtml = isHtml
        ? content
        : `<div style="white-space:pre-wrap;line-height:1.6;color:#222;">${escapeHtml(content)}</div>`;

      const imagesHtml = images.length
        ? `<div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:12px;">
            ${images
              .map(
                (src) =>
                  `<img src="${src}" alt="image" style="max-width:100%;width:calc(50% - 6px);border-radius:6px;border:1px solid #eee;" loading="lazy"/>`
              )
              .join('')}
           </div>`
        : '';

      return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1"/>
          ${preheader ? `<meta name="x-preheader" content="${escapeHtml(preheader)}"/>` : ''}
        </head>
        <body style="margin:0;padding:0;background:#f7f7f7;font-family:Arial,sans-serif;color:#222;">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;">
            <div style="background:${brandColor};color:#fff;padding:16px 20px;">
              <h1 style="margin:0;font-size:20px;">${escapeHtml(title)}</h1>
            </div>
            <div style="padding:20px;">
              ${contentHtml}
              ${imagesHtml}
            </div>
            <div style="padding:16px 20px;border-top:1px solid #eee;color:#666;font-size:12px;">
              <p style="margin:0;">You’re receiving this because you are a Chain Coop member or subscriber.</p>
              <p style="margin:0;">© ${new Date().getFullYear()} Chain Coop</p>
            </div>
          </div>
        </body>
      </html>`;
    };

    switch (template) {
      case 'kyc_reminder':
        subject = '🔐 Complete Your KYC Verification - Chain Coop';
        html = kycHtml(variables);
        break;
      case 'activation_reminder':
        subject = '⚡ Activate Your Chain Coop Account';
        html = activationHtml(variables);
        break;
      case 'reengagement':
        subject = '🚀 We Miss You at Chain Coop!';
        html = reengagementHtml(variables);
        break;
      case 'newsletter':
        subject = variables.subject || 'Chain Coop Newsletter';
        html = newsletterHtml(variables);
        break;
      default:
        subject = 'Chain Coop Notification';
        html = '<p>Hello from Chain Coop</p>';
    }

    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { subject, html, text };
  }

  public async sendTemplateEmail({ recipient, template, variables = {} }: SendTemplateParams) {
    const { subject, html, text } = this.renderTemplate(template, variables);

    if (this.dryRun) {
      const fakeId = `dry-${uuidv4()}`;
      return { success: true, messageId: fakeId, provider: 'dry-run' };
    }

    // Prefer Resend if available
    if (this.resend && this.fromEmail) {
      const from = this.fromName ? `${this.fromName} <${this.fromEmail}>` : this.fromEmail;
      try {
        const result = await this.resend.emails.send({
          from,
          to: recipient,
          subject,
          html,
          text,
        });
        return { success: true, messageId: (result?.data as any)?.id || uuidv4(), provider: 'resend' };
      } catch (err) {
        // Fall back to legacy nodemailer
        try {
          const options: EmailOptions = { to: recipient, subject, html, text };
          await legacySendEmail(options);
          return { success: true, messageId: uuidv4(), provider: 'nodemailer' };
        } catch (legacyErr) {
          throw legacyErr;
        }
      }
    }

    // Fall back if Resend not configured
    const options: EmailOptions = { to: recipient, subject, html, text };
    await legacySendEmail(options);
    return { success: true, messageId: uuidv4(), provider: 'nodemailer' };
  }

  public async sendRawEmail({ recipient, subject, html, text }: { recipient: string; subject: string; html?: string; text?: string; }) {
    const finalHtml = html || (text ? `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;color:#222;">${text}</pre>` : '<p></p>');
    const finalText = text || finalHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (this.dryRun) {
      const fakeId = `dry-${uuidv4()}`;
      return { success: true, messageId: fakeId, provider: 'dry-run' };
    }

    if (this.resend && this.fromEmail) {
      const from = this.fromName ? `${this.fromName} <${this.fromEmail}>` : this.fromEmail;
      try {
        const result = await this.resend.emails.send({
          from,
          to: recipient,
          subject,
          html: finalHtml,
          text: finalText,
        });
        return { success: true, messageId: (result?.data as any)?.id || uuidv4(), provider: 'resend' };
      } catch (err) {
        try {
          const options: EmailOptions = { to: recipient, subject, html: finalHtml, text: finalText };
          await legacySendEmail(options);
          return { success: true, messageId: uuidv4(), provider: 'nodemailer' };
        } catch (legacyErr) {
          throw legacyErr;
        }
      }
    }

    const options: EmailOptions = { to: recipient, subject, html: finalHtml, text: finalText };
    await legacySendEmail(options);
    return { success: true, messageId: uuidv4(), provider: 'nodemailer' };
  }
}

export default EmailService.getInstance();