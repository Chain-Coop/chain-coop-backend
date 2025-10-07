import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Joi from 'joi';
import EmailService from '../services/emailService';
import EmailJob from '../models/emailJob';
import User from '../models/user';
import logger from '../utils/logger';

// Validation schemas
const sendEmailSchema = Joi.object({
  to: Joi.string().email().required(),
  template: Joi.string().valid('KYC_REMINDER', 'ACTIVATION_REMINDER', 'REENGAGEMENT').required(),
  variables: Joi.object().optional(),
});

const bulkEmailSchema = Joi.object({
  recipients: Joi.array().items(Joi.string().email()).min(1).max(1000).required(),
  template: Joi.string().valid('KYC_REMINDER', 'ACTIVATION_REMINDER', 'REENGAGEMENT').required(),
  variables: Joi.object().optional(),
});

const campaignEmailSchema = Joi.object({
  segment: Joi.string().required(),
  template: Joi.string().valid('KYC_REMINDER', 'ACTIVATION_REMINDER', 'REENGAGEMENT').required(),
  variables: Joi.object().optional(),
});

const jobQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').optional(),
  type: Joi.string().valid('single', 'bulk', 'campaign').optional(),
});

// Custom email validation schemas
const customEmailSchema = Joi.object({
  to: Joi.string().email().required(),
  subject: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).required(),
  isHtml: Joi.boolean().default(false),
});

const customBulkEmailSchema = Joi.object({
  recipients: Joi.array().items(Joi.string().email()).min(1).max(1000).required(),
  subject: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).required(),
  isHtml: Joi.boolean().default(false),
});

/**
 * Send a single email
 */
export const sendEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = sendEmailSchema.validate(req.body);
    if (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
      return;
    }

    const { to, template, variables } = value;
    const emailService = EmailService.getInstance();

    // Check if recipient exists in our user database
    const user = await User.findOne({ email: to });
    const userId = user?._id?.toString();

    const result = await emailService.sendEmail({
      to,
      template,
      variables,
      userId,
    });

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Email sent successfully',
        data: {
          messageId: result.messageId,
          recipient: to,
          template,
        },
      });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to send email',
        error: result.error,
      });
    }
  } catch (error) {
    logger.error(`Error in sendEmail controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Send bulk emails
 */
export const sendBulkEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = bulkEmailSchema.validate(req.body);
    if (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
      return;
    }

    const { recipients, template, variables } = value;
    const emailService = EmailService.getInstance();

    const jobId = await emailService.sendBulkEmails({
      recipients,
      template,
      variables,
    });

    res.status(StatusCodes.ACCEPTED).json({
      success: true,
      message: 'Bulk email job created successfully',
      data: {
        jobId,
        recipientCount: recipients.length,
        template,
      },
    });
  } catch (error) {
    logger.error(`Error in sendBulkEmails controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Send campaign emails to a user segment
 */
export const sendCampaignEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = campaignEmailSchema.validate(req.body);
    if (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
      return;
    }

    const { segment, template, variables } = value;
    const emailService = EmailService.getInstance();

    // Validate segment exists
    const segments = await emailService.getSegmentCriteria();
    const segmentConfig = segments.find(s => s.id === segment);
    if (!segmentConfig) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid segment',
        availableSegments: segments.map(s => ({ id: s.id, name: s.name })),
      });
      return;
    }

    // Get user count for the segment
    const users = await emailService.getUsersBySegment(segment);
    if (users.length === 0) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'No users found for the specified segment',
        segment: segmentConfig.name,
      });
      return;
    }

    const jobId = await emailService.sendCampaignEmails({
      segment,
      template,
      variables,
    });

    res.status(StatusCodes.ACCEPTED).json({
      success: true,
      message: 'Campaign email job created successfully',
      data: {
        jobId,
        segment: segmentConfig.name,
        recipientCount: users.length,
        template,
      },
    });
  } catch (error) {
    logger.error(`Error in sendCampaignEmails controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get email statistics
 */
export const getEmailStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const emailService = EmailService.getInstance();
    const stats = await emailService.getEmailStats();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Email statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    logger.error(`Error in getEmailStats controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get email jobs with pagination and filtering
 */
export const getEmailJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = jobQuerySchema.validate(req.query);
    if (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
      return;
    }

    const { page, limit, status, type } = value;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [jobs, totalCount] = await Promise.all([
      EmailJob.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-recipients.email -recipients.userId'), // Exclude sensitive data
      EmailJob.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Email jobs retrieved successfully',
      data: {
        jobs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error(`Error in getEmailJobs controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get specific email job details
 */
export const getEmailJobDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Job ID is required',
      });
      return;
    }

    const job = await EmailJob.findOne({ jobId });
    if (!job) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Email job not found',
      });
      return;
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Email job details retrieved successfully',
      data: job,
    });
  } catch (error) {
    logger.error(`Error in getEmailJobDetails controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get available user segments
 */
export const getUserSegments = async (req: Request, res: Response): Promise<void> => {
  try {
    const emailService = EmailService.getInstance();
    const segments = await emailService.getSegmentCriteria();

    // Get user count for each segment
    const segmentsWithCounts = await Promise.all(
      segments.map(async (segment) => {
        try {
          const users = await emailService.getUsersBySegment(segment.id);
          return {
            ...segment,
            userCount: users.length,
          };
        } catch (error) {
          logger.error(`Error getting user count for segment ${segment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return {
            ...segment,
            userCount: 0,
          };
        }
      })
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'User segments retrieved successfully',
      data: segmentsWithCounts,
    });
  } catch (error) {
    logger.error(`Error in getUserSegments controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Test email service connection
 */
export const testEmailConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    const emailService = EmailService.getInstance();
    const result = await emailService.testConnection();

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Email service connection test successful',
      });
    } else {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Email service connection test failed',
        error: result.error,
      });
    }
  } catch (error) {
    logger.error(`Error in testEmailConnection controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Cancel a pending email job
 */
export const cancelEmailJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Job ID is required',
      });
      return;
    }

    const job = await EmailJob.findOne({ jobId });
    if (!job) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Email job not found',
      });
      return;
    }

    if (job.status !== 'pending') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Cannot cancel job with status: ${job.status}`,
      });
      return;
    }

    job.status = 'failed';
    job.error = 'Job cancelled by user';
    job.completedAt = new Date();
    await job.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Email job cancelled successfully',
      data: {
        jobId,
        status: job.status,
      },
    });
  } catch (error) {
    logger.error(`Error in cancelEmailJob controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get email templates information
 */
export const getEmailTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = [
      {
        id: 'KYC_REMINDER',
        name: 'KYC Reminder',
        description: 'Reminds users to complete their KYC verification',
        variables: ['firstName', 'kycUrl'],
      },
      {
        id: 'ACTIVATION_REMINDER',
        name: 'Activation Reminder',
        description: 'Reminds users to activate their account and choose a membership tier',
        variables: ['firstName', 'activationUrl'],
      },
      {
        id: 'REENGAGEMENT',
        name: 'Re-engagement',
        description: 'Brings back inactive users with updates and new features',
        variables: ['firstName', 'loginUrl'],
      },
    ];

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Email templates retrieved successfully',
      data: templates,
    });
  } catch (error) {
    logger.error(`Error in getEmailTemplates controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Send a custom email with custom subject and content
 */
export const sendCustomEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = customEmailSchema.validate(req.body);
    if (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
      return;
    }

    const { to, subject, content, isHtml } = value;
    const emailService = EmailService.getInstance();

    // Check if recipient exists in our user database
    const user = await User.findOne({ email: to });
    const userId = user?._id?.toString();

    const result = await emailService.sendCustomEmail(to, subject, content, isHtml);

    if (result.success) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Custom email sent successfully',
        data: {
          messageId: result.messageId,
          recipient: to,
          subject,
        },
      });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to send custom email',
        error: result.error,
      });
    }
  } catch (error) {
    logger.error(`Error in sendCustomEmail controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Send custom bulk emails with custom subject and content
 */
export const sendCustomBulkEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = customBulkEmailSchema.validate(req.body);
    if (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
      return;
    }

    const { recipients, subject, content, isHtml } = value;
    const emailService = EmailService.getInstance();

    const result = await emailService.sendCustomBulkEmails(recipients, subject, content, isHtml);

    res.status(StatusCodes.ACCEPTED).json({
      success: true,
      message: 'Custom bulk email job created successfully',
      data: {
        jobId: result.jobId,
        recipientCount: recipients.length,
        subject,
      },
    });
  } catch (error) {
    logger.error(`Error in sendCustomBulkEmails controller: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};