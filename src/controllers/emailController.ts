import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Joi from 'joi';
import EmailService from '../services/emailService';
import { buildSegmentQuery } from '../helpers/userAdapter';
import User from '../models/authModel';

function getEmailJobModel(): any {
  try {
    const mod = require('../models/emailJob');
    return mod.default || mod;
  } catch (_err) {
    return null;
  }
}

const SKIP_DB = (process.env.SKIP_DB || 'false') === 'true';

const individualSchema = Joi.object({
  recipient: Joi.string().email().required(),
  template: Joi.string()
    .valid('kyc_reminder', 'activation_reminder', 'reengagement', 'newsletter')
    .required(),
  variables: Joi.alternatives()
    .conditional('template', {
      is: 'newsletter',
      then: Joi.object({
        subject: Joi.string().required(),
        content: Joi.string().required(),
        isHtml: Joi.boolean().optional(),
        imageUrls: Joi.array().items(Joi.string().uri()).optional(),
        preheader: Joi.string().optional(),
      }).unknown(true),
      otherwise: Joi.object().default({}),
    }),
});

const bulkSchema = Joi.object({
  recipients: Joi.array().items(Joi.string().email()).min(1).required(),
  template: Joi.string()
    .valid('kyc_reminder', 'activation_reminder', 'reengagement', 'newsletter')
    .required(),
  variables: Joi.alternatives()
    .conditional('template', {
      is: 'newsletter',
      then: Joi.object({
        subject: Joi.string().required(),
        content: Joi.string().required(),
        isHtml: Joi.boolean().optional(),
        imageUrls: Joi.array().items(Joi.string().uri()).optional(),
        preheader: Joi.string().optional(),
      }).unknown(true),
      otherwise: Joi.object().default({}),
    }),
});

const campaignSchema = Joi.object({
  segment: Joi.string().required(),
  template: Joi.string()
    .valid('kyc_reminder', 'activation_reminder', 'reengagement', 'newsletter')
    .required(),
  variables: Joi.alternatives()
    .conditional('template', {
      is: 'newsletter',
      then: Joi.object({
        subject: Joi.string().required(),
        content: Joi.string().required(),
        isHtml: Joi.boolean().optional(),
        imageUrls: Joi.array().items(Joi.string().uri()).optional(),
        preheader: Joi.string().optional(),
      }).unknown(true),
      otherwise: Joi.object().default({}),
    }),
});

const rawSchema = Joi.object({
  recipient: Joi.string().email().optional(),
  recipients: Joi.array().items(Joi.string().email()).min(1).optional(),
  segment: Joi.string().optional(),
  segments: Joi.array().items(Joi.string()).min(1).optional(),
  subject: Joi.string().required(),
  html: Joi.string().optional(),
  text: Joi.string().optional(),
  scheduledAt: Joi.date().iso().optional(),
}).or('html', 'text');

export async function sendIndividualEmail(req: Request, res: Response) {
  const { error, value } = individualSchema.validate(req.body);
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: error.message });
  }
  const { recipient, template, variables } = value;
  const result = await EmailService.sendTemplateEmail({ recipient, template, variables });

  // Record job (best-effort)
  try {
    const EmailJob = getEmailJobModel();
    if (EmailJob) await EmailJob.create({
      jobId: result.messageId,
      type: 'individual',
      status: 'completed',
      emailType: template.toUpperCase(),
      recipients: [{ email: recipient, status: 'completed' }],
      totalCount: 1,
      successCount: 1,
      failureCount: 0,
      scheduledAt: new Date(),
      completedAt: new Date(),
      retryCount: 0,
      maxRetries: Number(process.env.EMAIL_JOB_MAX_RETRIES || 3),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (_err) {}

  return res.status(StatusCodes.OK).json({ success: true, message: 'Email sent successfully', data: result });
}

export async function sendBulkEmails(req: Request, res: Response) {
  const { error, value } = bulkSchema.validate(req.body);
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: error.message });
  }
  const { recipients, template, variables } = value;

  const jobId = `bulk-${Date.now()}`;
  const results: any[] = [];
  let successCount = 0;
  let failureCount = 0;
  for (const r of recipients) {
    try {
      const result = await EmailService.sendTemplateEmail({ recipient: r, template, variables });
      results.push({ email: r, status: 'completed', messageId: result.messageId });
      successCount++;
    } catch (err: any) {
      results.push({ email: r, status: 'failed', error: err?.message || 'send_failed' });
      failureCount++;
    }
  }

  try {
    const EmailJob = getEmailJobModel();
    if (EmailJob) await EmailJob.create({
      jobId,
      type: 'bulk',
      status: failureCount > 0 ? 'failed' : 'completed',
      emailType: template.toUpperCase(),
      recipients: results,
      totalCount: recipients.length,
      successCount,
      failureCount,
      scheduledAt: new Date(),
      completedAt: new Date(),
      retryCount: 0,
      maxRetries: Number(process.env.EMAIL_JOB_MAX_RETRIES || 3),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (_err) {}

  return res.status(StatusCodes.OK).json({
    success: true,
    message: 'Bulk emails queued successfully',
    data: { totalQueued: recipients.length, jobId, results },
  });
}

export async function sendCampaignEmails(req: Request, res: Response) {
  if (SKIP_DB) {
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'Campaign emailing unavailable with SKIP_DB=true',
    });
  }

  const { error, value } = campaignSchema.validate(req.body);
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: error.message });
  }
  const { segment, template, variables } = value;

  // Very simple mapping: segment is free-string criteria JSON name in body or known presets.
  let criteria: any = {};
  let users: any[] = [];
  if (typeof segment === 'string') {
    // Example presets (extend as needed)
    if (segment === 'incomplete_kyc_users') {
      // Users with Tier 0 or 1
      users = await User.find({ Tier: { $in: [0, 1] } }).select('email firstName');
      criteria = { tier: [0, 1] };
    } else if (segment === 'unverified_users') {
      users = await User.find({ isVerified: false }).select('email firstName');
      criteria = { isVerified: false };
    } else if (segment === 'inactive_users') {
      // Direct query based on membershipStatus when available
      users = await User.find({ membershipStatus: 'inactive' }).select('email firstName');
      criteria = { membershipStatus: ['inactive'] };
    } else if (segment === 'active_users' || segment === 'all_active_users') {
      // Users with active membership status
      users = await User.find({ membershipStatus: 'active' }).select('email firstName');
      criteria = { membershipStatus: ['active'] };
    } else if (segment === 'new_users') {
      // Users created within the last 30 days
      const cutoff = new Date();
      cutoff.setUTCDate(cutoff.getUTCDate() - 30);
      users = await User.find({ createdAt: { $gte: cutoff } }).select('email firstName');
      criteria = { createdAfter: cutoff };
    } else if (segment === 'birthday_today') {
      // Match users whose dateOfBirth (month/day) matches today
      const now = new Date();
      const month = now.getUTCMonth() + 1; // Mongo $month is 1-12
      const day = now.getUTCDate();
      users = await User.find({
        $expr: {
          $and: [
            { $eq: [{ $month: '$dateOfBirth' }, month] },
            { $eq: [{ $dayOfMonth: '$dateOfBirth' }, day] },
          ],
        },
      }).select('email firstName');
      criteria = { birthday_today: true };
    } else {
      criteria = {}; // default all
      users = await User.find({}).select('email firstName');
    }
  }

  const jobId = `campaign-${Date.now()}`;
  let successCount = 0;
  let failureCount = 0;
  const results: any[] = [];
  for (const u of users) {
    const to = (u as any).email;
    if (!to) continue;
    try {
      const result = await EmailService.sendTemplateEmail({ recipient: to, template, variables: { ...variables, firstName: (u as any).firstName } });
      results.push({ email: to, status: 'completed', messageId: result.messageId });
      successCount++;
    } catch (err: any) {
      results.push({ email: to, status: 'failed', error: err?.message || 'send_failed' });
      failureCount++;
    }
  }

  try {
    const EmailJob = getEmailJobModel();
    if (EmailJob) await EmailJob.create({
      jobId,
      type: 'campaign',
      status: failureCount > 0 ? 'failed' : 'completed',
      emailType: template.toUpperCase(),
      recipients: results,
      criteria,
      totalCount: users.length,
      successCount,
      failureCount,
      scheduledAt: new Date(),
      completedAt: new Date(),
      retryCount: 0,
      maxRetries: Number(process.env.EMAIL_JOB_MAX_RETRIES || 3),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (_err) {}

  return res.status(StatusCodes.OK).json({
    success: true,
    message: 'Campaign emails queued successfully',
    data: { segmentName: segment, totalUsers: users.length, emailsQueued: successCount },
  });
}

export async function sendRawEmail(req: Request, res: Response) {
  const { error, value } = rawSchema.validate(req.body);
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: error.message });
  }

  const { recipient, recipients, segment, segments, subject, html, text, scheduledAt } = value as any;
  const hasSegments = Boolean(segment) || (Array.isArray(segments) && segments.length > 0);

  if (!hasSegments && !recipient && (!Array.isArray(recipients) || recipients.length === 0)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Provide recipient(s) or segment(s).' });
  }

  // If scheduling in the future is provided, queue as pending job and do not send immediately
  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const isFutureSchedule = scheduleDate && scheduleDate.getTime() > Date.now();

  // Resolve recipients from segments if provided
  let resolvedRecipients: string[] = [];

  if (hasSegments) {
    if (SKIP_DB) {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ success: false, message: 'Segment-based raw emailing unavailable with SKIP_DB=true' });
    }

    const segs: string[] = [];
    if (segment) segs.push(segment);
    if (Array.isArray(segments)) segs.push(...segments);

    const seen = new Set<string>();
    const normalizeEmail = (e: string) => String(e).trim().toLowerCase();
    for (const s of segs) {
      let users: any[] = [];
      if (s === 'incomplete_kyc_users') {
        users = await User.find({ Tier: { $in: [0, 1] } }).select('email');
      } else if (s === 'unverified_users') {
        users = await User.find({ isVerified: false }).select('email');
      } else if (s === 'inactive_users') {
        users = await User.find({ membershipStatus: 'inactive' }).select('email');
      } else if (s === 'active_users' || s === 'all_active_users') {
        users = await User.find({ membershipStatus: 'active' }).select('email');
      } else if (s === 'new_users') {
        const cutoff = new Date();
        cutoff.setUTCDate(cutoff.getUTCDate() - 30);
        users = await User.find({ createdAt: { $gte: cutoff } }).select('email');
      } else if (s === 'birthday_today') {
        const now = new Date();
        const month = now.getUTCMonth() + 1;
        const day = now.getUTCDate();
        users = await User.find({
          $expr: {
            $and: [
              { $eq: [{ $month: '$dateOfBirth' }, month] },
              { $eq: [{ $dayOfMonth: '$dateOfBirth' }, day] },
            ],
          },
        }).select('email');
      } else {
        users = await User.find({}).select('email');
      }

      for (const u of users) {
        const rawEmail = (u as any).email;
        const emailKey = rawEmail ? normalizeEmail(rawEmail) : '';
        if (emailKey && !seen.has(emailKey)) {
          seen.add(emailKey);
          // Preserve original casing in the recipient list, dedup by normalized key
          resolvedRecipients.push(rawEmail);
        }
      }
    }
  }

  // Determine final recipients (segments override direct recipients)
  const normalizeEmail = (e: string) => String(e).trim().toLowerCase();
  const finalRecipientsBase: string[] = hasSegments
    ? resolvedRecipients
    : (Array.isArray(recipients) ? recipients : (recipient ? [recipient] : []));

  // Ensure no duplicates even if frontend passes duplicates; dedup by normalized email
  const uniqueSet = new Set<string>();
  const finalRecipients: string[] = [];
  for (const e of finalRecipientsBase) {
    const key = normalizeEmail(e);
    if (key && !uniqueSet.has(key)) {
      uniqueSet.add(key);
      finalRecipients.push(e);
    }
  }

  if (finalRecipients.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'No recipients resolved.' });
  }

  const jobType: 'campaign' | 'bulk' | 'individual' = hasSegments
    ? 'campaign'
    : (finalRecipients.length > 1 ? 'bulk' : 'individual');

  // Scheduling: queue as pending job only
  if (isFutureSchedule) {
    try {
      const EmailJob = getEmailJobModel();
      if (EmailJob) {
        const jobId = `raw-${Date.now()}`;
        await EmailJob.create({
          jobId,
          type: jobType,
          status: 'pending',
          emailType: 'RAW',
          recipients: finalRecipients.map((e) => ({ email: e, status: 'pending' })),
          criteria: { isRaw: true, subject, html, text, segments: hasSegments ? (segment ? [segment] : segments) : undefined },
          totalCount: finalRecipients.length,
          successCount: 0,
          failureCount: 0,
          scheduledAt: scheduleDate,
          retryCount: 0,
          maxRetries: Number(process.env.EMAIL_JOB_MAX_RETRIES || 3),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return res.status(StatusCodes.OK).json({ success: true, message: 'Email(s) scheduled successfully', data: { jobId, totalQueued: finalRecipients.length, scheduledAt: scheduleDate } });
      }
    } catch (_err) {}
    return res.status(StatusCodes.OK).json({ success: true, message: 'Scheduling unavailable; emails not sent due to future schedule', data: { totalQueued: finalRecipients.length } });
  }

  // Immediate send
  const jobId = `raw-${Date.now()}`;
  const results: any[] = [];
  let successCount = 0;
  let failureCount = 0;
  for (const to of finalRecipients) {
    try {
      const result = await EmailService.sendRawEmail({ recipient: to, subject, html, text });
      results.push({ email: to, status: 'completed', messageId: result.messageId });
      successCount++;
    } catch (err: any) {
      results.push({ email: to, status: 'failed', error: err?.message || 'send_failed' });
      failureCount++;
    }
  }

  try {
    const EmailJob = getEmailJobModel();
    if (EmailJob) await EmailJob.create({
      jobId,
      type: jobType,
      status: failureCount > 0 ? 'failed' : 'completed',
      emailType: 'RAW',
      recipients: results,
      totalCount: finalRecipients.length,
      successCount,
      failureCount,
      scheduledAt: new Date(),
      completedAt: new Date(),
      retryCount: 0,
      maxRetries: Number(process.env.EMAIL_JOB_MAX_RETRIES || 3),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (_err) {}

  return res.status(StatusCodes.OK).json({ success: true, message: 'Raw email(s) processed', data: { totalQueued: finalRecipients.length, jobId, results } });
}

export async function getEmailStats(_req: Request, res: Response) {
  try {
    const EmailJob = getEmailJobModel();
    if (!EmailJob) {
      return res.status(StatusCodes.OK).json({ success: true, data: { totalSent: 0, totalFailed: 0, totalPending: 0, successRate: 0, lastSent: null } });
    }
    const totalSent = await EmailJob.countDocuments({ status: 'completed' });
    const totalFailed = await EmailJob.countDocuments({ status: 'failed' });
    const totalPending = await EmailJob.countDocuments({ status: 'pending' });
    const last = await EmailJob.findOne({}).sort({ updatedAt: -1 });
    const successRate = totalSent + totalFailed > 0 ? (totalSent / (totalSent + totalFailed)) * 100 : 0;
    return res.status(StatusCodes.OK).json({ success: true, data: { totalSent, totalFailed, totalPending, successRate, lastSent: last?.updatedAt || null } });
  } catch (err) {
    return res.status(StatusCodes.OK).json({ success: true, data: { totalSent: 0, totalFailed: 0, totalPending: 0, successRate: 0, lastSent: null } });
  }
}

export async function getPendingJobs(req: Request, res: Response) {
  const limit = Number((req.query.limit as string) || 50);
  const offset = Number((req.query.offset as string) || 0);
  const EmailJob = getEmailJobModel();
  if (!EmailJob) return res.status(StatusCodes.OK).json({ success: true, data: [] });
  const jobs = await EmailJob.find({ status: 'pending' }).skip(offset).limit(limit);
  return res.status(StatusCodes.OK).json({ success: true, data: jobs });
}

export async function retryFailedJobs(_req: Request, res: Response) {
  // Placeholder: In a real system, enqueue retries
  const EmailJob = getEmailJobModel();
  if (!EmailJob) return res.status(StatusCodes.OK).json({ success: true, message: 'No job model available', data: { count: 0 } });
  const failed = await EmailJob.find({ status: 'failed' }).limit(50);
  for (const job of failed) {
    job.retryCount = (job.retryCount || 0) + 1;
    job.status = 'pending';
    await job.save();
  }
  return res.status(StatusCodes.OK).json({ success: true, message: 'Marked failed jobs for retry', data: { count: failed.length } });
}

export async function getUserSegments(_req: Request, res: Response) {
  const segments = [
    {
      id: 'no_kyc',
      name: 'No KYC',
      description: 'Users with KYC Tier 0',
      criteria: { tier: [0] },
    },
    {
      id: 'incomplete_kyc',
      name: 'Incomplete KYC',
      description: 'Users with KYC Tier 1',
      criteria: { tier: [1] },
    },
    {
      id: 'complete_kyc',
      name: 'Complete KYC',
      description: 'Users with KYC Tier 2',
      criteria: { tier: [2] },
    },
    { id: 'unverified', name: 'Unverified Users', description: 'Unverified users', criteria: { isVerified: false } },
    { id: 'verified', name: 'Verified Users', description: 'Verified users', criteria: { isVerified: true } },
    { id: 'crypto_interest', name: 'Crypto Interest', description: 'Users interested in crypto', criteria: { isCrypto: true } },
    { id: 'inactive_users', name: 'Inactive Users', description: 'Users with membershipStatus inactive', criteria: { membershipStatus: ['inactive'] } },
    { id: 'birthday_today', name: 'Birthdays Today', description: 'Users whose birthday is today', criteria: { birthday_today: true } },
    { id: 'active_users', name: 'Active Users', description: 'Users with membershipStatus active', criteria: { membershipStatus: ['active'] } },
    { id: 'all_active_users', name: 'All Active Users', description: 'All users with active membership', criteria: { membershipStatus: ['active'] } },
    { id: 'new_users', name: 'New Users (30d)', description: 'Users created within the last 30 days', criteria: { createdAfter: 'now-30d' } },
  ];

  const data: any[] = [];
  for (const s of segments) {
    let count = 0;
    if (!SKIP_DB) {
      try {
        if (s.id === 'birthday_today') {
          const now = new Date();
          const month = now.getUTCMonth() + 1;
          const day = now.getUTCDate();
          count = await User.countDocuments({
            $expr: {
              $and: [
                { $eq: [{ $month: '$dateOfBirth' }, month] },
                { $eq: [{ $dayOfMonth: '$dateOfBirth' }, day] },
              ],
            },
          });
        } else if (s.id === 'inactive_users') {
          count = await User.countDocuments({ membershipStatus: 'inactive' });
        } else if (s.id === 'active_users' || s.id === 'all_active_users') {
          count = await User.countDocuments({ membershipStatus: 'active' });
        } else if (s.id === 'new_users') {
          const cutoff = new Date();
          cutoff.setUTCDate(cutoff.getUTCDate() - 30);
          count = await User.countDocuments({ createdAt: { $gte: cutoff } });
        } else {
          const query = buildSegmentQuery(s.criteria);
          count = await User.countDocuments(query);
        }
      } catch (_err) {}
    }
    data.push({ ...s, userCount: count });
  }
  return res.status(StatusCodes.OK).json({ success: true, data });
}

export async function testEmailService(_req: Request, res: Response) {
  const status = EmailService.getStatus();
  return res.status(StatusCodes.OK).json({ success: true, message: status.dryRun ? 'Dry run mode' : 'Email service ready', data: status });
}