import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { sendEmail as legacySendEmail, EmailOptions } from '../utils/sendEmail';

dotenv.config();

type EmailTemplateType = 'kyc_reminder' | 'activation_reminder' | 'reengagement';

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
}

export default EmailService.getInstance();