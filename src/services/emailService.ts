import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import EmailJob, { EmailJobDocument } from '../models/emailJob';
import User, { UserDocument } from '../models/user';
import UserSegmentationService from './userSegmentationService';
import logger from '../utils/logger';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailVariables {
  [key: string]: string | number | boolean;
}

export interface SendEmailOptions {
  to: string;
  template: 'KYC_REMINDER' | 'ACTIVATION_REMINDER' | 'REENGAGEMENT';
  variables?: EmailVariables;
  userId?: string;
}

export interface BulkEmailOptions {
  recipients: string[];
  template: 'KYC_REMINDER' | 'ACTIVATION_REMINDER' | 'REENGAGEMENT';
  variables?: EmailVariables;
}

export interface CampaignEmailOptions {
  segment: string;
  template: 'KYC_REMINDER' | 'ACTIVATION_REMINDER' | 'REENGAGEMENT';
  variables?: EmailVariables;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: object;
  userCount?: number;
}

class EmailService {
  private static instance: EmailService;
  private resend: Resend;
  private fromEmail: string;
  private fromName: string;
  private maxRetries: number;
  private retryDelayMs: number;
  private segmentationService: UserSegmentationService;

  private constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@chaincoop.com';
    this.fromName = process.env.FROM_NAME || 'Chain Coop';
    this.maxRetries = parseInt(process.env.EMAIL_JOB_MAX_RETRIES || '3');
    this.retryDelayMs = parseInt(process.env.EMAIL_JOB_RETRY_DELAY_MS || '300000');
    this.segmentationService = UserSegmentationService.getInstance();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private getEmailTemplate(templateType: string, variables: EmailVariables = {}): EmailTemplate {
    const templates = {
      KYC_REMINDER: {
        subject: '🔐 Complete Your KYC Verification - Chain Coop',
        html: this.getKYCReminderHTML(variables),
        text: this.getKYCReminderText(variables),
      },
      ACTIVATION_REMINDER: {
        subject: '⚡ Activate Your Chain Coop Account',
        html: this.getActivationReminderHTML(variables),
        text: this.getActivationReminderText(variables),
      },
      REENGAGEMENT: {
        subject: '🚀 We Miss You at Chain Coop!',
        html: this.getReengagementHTML(variables),
        text: this.getReengagementText(variables),
      },
    };

    return templates[templateType as keyof typeof templates];
  }

  private getKYCReminderHTML(variables: EmailVariables): string {
    const firstName = variables.firstName || 'Valued Member';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Complete Your KYC Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Complete Your KYC Verification</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>We noticed that your KYC (Know Your Customer) verification is still pending. To unlock all the amazing features Chain Coop has to offer, please complete your verification process.</p>
              
              <h3>Benefits of completing KYC:</h3>
              <ul>
                <li>✅ Access to all membership tiers</li>
                <li>✅ Enhanced security for your account</li>
                <li>✅ Higher transaction limits</li>
                <li>✅ Priority customer support</li>
                <li>✅ Exclusive investment opportunities</li>
              </ul>
              
              <p>The verification process is quick and secure, taking only a few minutes to complete.</p>
              
              <a href="${variables.kycUrl || '#'}" class="button">Complete KYC Verification</a>
              
              <p>If you have any questions or need assistance, our support team is here to help.</p>
              
              <p>Best regards,<br>The Chain Coop Team</p>
            </div>
            <div class="footer">
              <p>© 2024 Chain Coop. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getKYCReminderText(variables: EmailVariables): string {
    const firstName = variables.firstName || 'Valued Member';
    return `
Complete Your KYC Verification - Chain Coop

Hello ${firstName},

We noticed that your KYC (Know Your Customer) verification is still pending. To unlock all the amazing features Chain Coop has to offer, please complete your verification process.

Benefits of completing KYC:
- Access to all membership tiers
- Enhanced security for your account
- Higher transaction limits
- Priority customer support
- Exclusive investment opportunities

The verification process is quick and secure, taking only a few minutes to complete.

Complete your KYC verification: ${variables.kycUrl || 'Visit our website'}

If you have any questions or need assistance, our support team is here to help.

Best regards,
The Chain Coop Team

© 2024 Chain Coop. All rights reserved.
    `;
  }

  private getActivationReminderHTML(variables: EmailVariables): string {
    const firstName = variables.firstName || 'Future Member';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Activate Your Chain Coop Account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .membership-tier { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #f5576c; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚡ Activate Your Account</h1>
            </div>
            <div class="content">
              <h2>Welcome ${firstName}!</h2>
              <p>Your Chain Coop account is almost ready! Just one more step to unlock the full potential of our platform.</p>
              
              <h3>Choose Your Membership Tier:</h3>
              
              <div class="membership-tier">
                <h4>🌟 Explorer ($10/month)</h4>
                <p>Perfect for beginners looking to start their investment journey.</p>
              </div>
              
              <div class="membership-tier">
                <h4>🚀 Pioneer ($25/month)</h4>
                <p>For serious investors ready to explore advanced opportunities.</p>
              </div>
              
              <div class="membership-tier">
                <h4>💎 Voyager ($50/month)</h4>
                <p>Premium tier with exclusive access to high-yield investments.</p>
              </div>
              
              <a href="${variables.activationUrl || '#'}" class="button">Activate Your Account</a>
              
              <p>Join thousands of satisfied members who are already building their financial future with Chain Coop.</p>
              
              <p>Best regards,<br>The Chain Coop Team</p>
            </div>
            <div class="footer">
              <p>© 2024 Chain Coop. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getActivationReminderText(variables: EmailVariables): string {
    const firstName = variables.firstName || 'Future Member';
    return `
Activate Your Chain Coop Account

Welcome ${firstName}!

Your Chain Coop account is almost ready! Just one more step to unlock the full potential of our platform.

Choose Your Membership Tier:

Explorer ($10/month)
Perfect for beginners looking to start their investment journey.

Pioneer ($25/month)
For serious investors ready to explore advanced opportunities.

Voyager ($50/month)
Premium tier with exclusive access to high-yield investments.

Activate your account: ${variables.activationUrl || 'Visit our website'}

Join thousands of satisfied members who are already building their financial future with Chain Coop.

Best regards,
The Chain Coop Team

© 2024 Chain Coop. All rights reserved.
    `;
  }

  private getReengagementHTML(variables: EmailVariables): string {
    const firstName = variables.firstName || 'Valued Member';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>We Miss You at Chain Coop!</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #4facfe; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #4facfe; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 We Miss You!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>We've noticed you haven't been active on Chain Coop lately, and we miss having you as part of our community!</p>
              
              <h3>Here's what's new since your last visit:</h3>
              
              <div class="feature">
                <h4>🔥 New Investment Opportunities</h4>
                <p>Discover high-yield projects with verified returns.</p>
              </div>
              
              <div class="feature">
                <h4>💰 Enhanced Savings Circles</h4>
                <p>Join collaborative savings with better interest rates.</p>
              </div>
              
              <div class="feature">
                <h4>📱 Mobile App Updates</h4>
                <p>Faster, more secure, and user-friendly interface.</p>
              </div>
              
              <div class="feature">
                <h4>🎯 Personalized Dashboard</h4>
                <p>Track your investments and goals more effectively.</p>
              </div>
              
              <p>Your financial journey is important to us, and we're here to help you achieve your goals.</p>
              
              <a href="${variables.loginUrl || '#'}" class="button">Welcome Back</a>
              
              <p>If you have any questions or feedback, we'd love to hear from you.</p>
              
              <p>Best regards,<br>The Chain Coop Team</p>
            </div>
            <div class="footer">
              <p>© 2024 Chain Coop. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getReengagementText(variables: EmailVariables): string {
    const firstName = variables.firstName || 'Valued Member';
    return `
We Miss You at Chain Coop!

Hello ${firstName},

We've noticed you haven't been active on Chain Coop lately, and we miss having you as part of our community!

Here's what's new since your last visit:

New Investment Opportunities
Discover high-yield projects with verified returns.

Enhanced Savings Circles
Join collaborative savings with better interest rates.

Mobile App Updates
Faster, more secure, and user-friendly interface.

Personalized Dashboard
Track your investments and goals more effectively.

Your financial journey is important to us, and we're here to help you achieve your goals.

Welcome back: ${variables.loginUrl || 'Visit our website'}

If you have any questions or feedback, we'd love to hear from you.

Best regards,
The Chain Coop Team

© 2024 Chain Coop. All rights reserved.
    `;
  }

  public async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const template = this.getEmailTemplate(options.template, options.variables);
      
      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info(`Email sent successfully to ${options.to} with template ${options.template}`);

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      logger.error(`Failed to send email to ${options.to} with template ${options.template}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async sendBulkEmails(options: BulkEmailOptions): Promise<string> {
    const jobId = uuidv4();
    
    try {
      const recipients = options.recipients.map(email => ({
        email,
        status: 'pending' as const,
      }));

      const emailJob = new EmailJob({
        jobId,
        type: 'bulk',
        emailType: options.template,
        recipients,
        totalCount: recipients.length,
        successCount: 0,
        failureCount: 0,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: this.maxRetries,
      });

      await emailJob.save();

      // Process emails asynchronously
      this.processBulkEmailJob(jobId);

      logger.info(`Bulk email job created with ID: ${jobId} for template ${options.template} with ${options.recipients.length} recipients`);

      return jobId;
    } catch (error) {
      logger.error(`Failed to create bulk email job for template ${options.template}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  public async sendCampaignEmails(options: CampaignEmailOptions): Promise<string> {
    const jobId = uuidv4();
    
    try {
      const users = await this.getUsersBySegment(options.segment);
      const recipients = users.map(user => ({
        email: user.email,
        userId: (user._id as any).toString(),
        status: 'pending' as const,
      }));

      const emailJob = new EmailJob({
        jobId,
        type: 'campaign',
        emailType: options.template,
        recipients,
        criteria: { segment: options.segment },
        totalCount: recipients.length,
        successCount: 0,
        failureCount: 0,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: this.maxRetries,
      });

      await emailJob.save();

      // Process emails asynchronously
      this.processCampaignEmailJob(jobId, options.variables);

      logger.info(`Campaign email job created with ID: ${jobId} for template ${options.template} targeting segment ${options.segment} with ${recipients.length} recipients`);

      return jobId;
    } catch (error) {
      logger.error(`Failed to create campaign email job for template ${options.template} targeting segment ${options.segment}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async processBulkEmailJob(jobId: string): Promise<void> {
    try {
      const job = await EmailJob.findOne({ jobId });
      if (!job) return;

      job.status = 'processing';
      job.startedAt = new Date();
      await job.save();

      for (let i = 0; i < job.recipients.length; i++) {
        const recipient = job.recipients[i];
        if (recipient.status !== 'pending') continue;

        const result = await this.sendEmail({
          to: recipient.email,
          template: job.emailType,
          userId: recipient.userId,
        });

        if (result.success) {
          job.recipients[i].status = 'sent';
          job.recipients[i].sentAt = new Date();
          job.successCount++;
        } else {
          job.recipients[i].status = 'failed';
          job.recipients[i].error = result.error;
          job.failureCount++;
        }

        await job.save();

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      job.status = 'completed';
      job.completedAt = new Date();
      await job.save();

    } catch (error) {
      logger.error(`Failed to process bulk email job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processCampaignEmailJob(jobId: string, variables?: EmailVariables): Promise<void> {
    try {
      const job = await EmailJob.findOne({ jobId });
      if (!job) return;

      job.status = 'processing';
      job.startedAt = new Date();
      await job.save();

      for (let i = 0; i < job.recipients.length; i++) {
        const recipient = job.recipients[i];
        if (recipient.status !== 'pending') continue;

        // Get user data for personalization
        const user = await User.findById(recipient.userId);
        const personalizedVariables = {
          ...variables,
          firstName: user?.firstName || 'Valued Member',
        };

        const result = await this.sendEmail({
          to: recipient.email,
          template: job.emailType,
          variables: personalizedVariables,
          userId: recipient.userId,
        });

        if (result.success) {
          job.recipients[i].status = 'sent';
          job.recipients[i].sentAt = new Date();
          job.successCount++;
        } else {
          job.recipients[i].status = 'failed';
          job.recipients[i].error = result.error;
          job.failureCount++;
        }

        await job.save();

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      job.status = 'completed';
      job.completedAt = new Date();
      await job.save();

    } catch (error) {
      logger.error(`Failed to process campaign email job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getUsersBySegment(segment: string): Promise<UserDocument[]> {
    return await this.segmentationService.getUsersBySegment(segment);
  }

  public async getSegmentCriteria(): Promise<UserSegment[]> {
    return await this.segmentationService.getAvailableSegments();
  }

  public async getEmailStats(): Promise<any> {
    const [totalJobs, completedJobs, failedJobs, pendingJobs] = await Promise.all([
      EmailJob.countDocuments(),
      EmailJob.countDocuments({ status: 'completed' }),
      EmailJob.countDocuments({ status: 'failed' }),
      EmailJob.countDocuments({ status: 'pending' }),
    ]);

    const successfulJobs = await EmailJob.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalSent: { $sum: '$successCount' }, totalFailed: { $sum: '$failureCount' } } }
    ]);

    const lastSentJob = await EmailJob.findOne({ status: 'completed' }).sort({ completedAt: -1 });

    const stats = successfulJobs[0] || { totalSent: 0, totalFailed: 0 };
    const successRate = stats.totalSent + stats.totalFailed > 0 
      ? (stats.totalSent / (stats.totalSent + stats.totalFailed)) * 100 
      : 0;

    return {
      totalSent: stats.totalSent,
      totalFailed: stats.totalFailed,
      totalPending: pendingJobs,
      successRate: Math.round(successRate * 100) / 100,
      lastSent: lastSentJob?.completedAt || null,
      totalJobs,
      completedJobs,
      failedJobs,
    };
  }

  public async sendCustomEmail(to: string, subject: string, content: string, isHtml: boolean = false): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      logger.info(`Attempting to send custom email to ${to} with subject: ${subject}`);
      
      const emailData: any = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject,
      };

      if (isHtml) {
        emailData.html = content;
        // Generate text version from HTML for better compatibility
        emailData.text = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      } else {
        emailData.text = content;
      }

      logger.info(`Email data prepared: from=${emailData.from}, to=${emailData.to}, subject=${emailData.subject}, hasHtml=${!!emailData.html}, hasText=${!!emailData.text}`);

      const result = await this.resend.emails.send(emailData);

      logger.info(`Custom email sent successfully to ${to} with messageId: ${result.data?.id}`);

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      logger.error(`Error sending custom email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error sending custom email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async sendCustomBulkEmails(recipients: string[], subject: string, content: string, isHtml: boolean = false): Promise<{ jobId: string }> {
    const jobId = uuidv4();
    
    const job = new EmailJob({
      jobId,
      type: 'custom_bulk',
      recipients: recipients.map(email => ({ email })),
      subject,
      content,
      isHtml,
      status: 'pending',
      totalCount: recipients.length,
      createdAt: new Date(),
    });

    await job.save();

    // Process the job asynchronously
    this.processCustomBulkEmailJob(jobId);

    return { jobId };
  }

  private async processCustomBulkEmailJob(jobId: string): Promise<void> {
    try {
      const job = await EmailJob.findOne({ jobId });
      if (!job) {
        console.error(`Job ${jobId} not found`);
        return;
      }

      job.status = 'processing';
      job.startedAt = new Date();
      await job.save();

      let successCount = 0;
      let failureCount = 0;
      const results: any[] = [];

      for (const recipient of job.recipients) {
        try {
          const result = await this.sendCustomEmail(
            recipient.email,
            job.subject!,
            job.content!,
            job.isHtml || false
          );

          if (result.success) {
            successCount++;
            results.push({
              email: recipient.email,
              status: 'sent',
              messageId: result.messageId,
            });
          } else {
            failureCount++;
            results.push({
              email: recipient.email,
              status: 'failed',
              error: result.error,
            });
          }

          // Add a small delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          failureCount++;
          results.push({
            email: recipient.email,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.successCount = successCount;
      job.failureCount = failureCount;
      job.results = results;
      await job.save();

      console.log(`Custom bulk email job ${jobId} completed: ${successCount} sent, ${failureCount} failed`);
    } catch (error) {
      console.error(`Error processing custom bulk email job ${jobId}:`, error);
      
      try {
        await EmailJob.findByIdAndUpdate(jobId, {
          status: 'failed',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (updateError) {
        console.error(`Error updating failed job ${jobId}:`, updateError);
      }
    }
  }

  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test with a simple API call to Resend
      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: 'test@resend.dev', // Resend's test email
        subject: 'Test Connection',
        html: '<p>Test email from Chain Coop Email Service</p>',
        text: 'Test email from Chain Coop Email Service',
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default EmailService;