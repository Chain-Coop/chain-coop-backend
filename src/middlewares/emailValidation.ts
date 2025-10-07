import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { BadRequestError } from '../errors';

// Single email validation schema
const singleEmailSchema = Joi.object({
  to: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Recipient email is required',
  }),
  template: Joi.string().valid('KYC_REMINDER', 'ACTIVATION_REMINDER', 'REENGAGEMENT').required().messages({
    'any.required': 'Email template is required',
    'any.only': 'Template must be one of: KYC_REMINDER, ACTIVATION_REMINDER, REENGAGEMENT',
  }),
  variables: Joi.object().optional(),
  scheduledAt: Joi.date().greater('now').optional().messages({
    'date.greater': 'Scheduled time must be in the future',
  }),
});

// Bulk email validation schema
const bulkEmailSchema = Joi.object({
  recipients: Joi.array()
    .items(Joi.string().email())
    .min(1)
    .max(1000)
    .required()
    .messages({
      'array.min': 'At least one recipient is required',
      'array.max': 'Cannot send to more than 1000 recipients at once',
      'any.required': 'Recipients array is required',
    }),
  template: Joi.string().valid('KYC_REMINDER', 'ACTIVATION_REMINDER', 'REENGAGEMENT').required().messages({
    'any.required': 'Email template is required',
    'any.only': 'Template must be one of: KYC_REMINDER, ACTIVATION_REMINDER, REENGAGEMENT',
  }),
  variables: Joi.object().optional(),
  scheduledAt: Joi.date().greater('now').optional().messages({
    'date.greater': 'Scheduled time must be in the future',
  }),
});

// Campaign email validation schema
const campaignEmailSchema = Joi.object({
  segmentIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one segment ID is required',
      'any.required': 'Segment IDs array is required',
    }),
  template: Joi.string().valid('KYC_REMINDER', 'ACTIVATION_REMINDER', 'REENGAGEMENT').required().messages({
    'any.required': 'Email template is required',
    'any.only': 'Template must be one of: KYC_REMINDER, ACTIVATION_REMINDER, REENGAGEMENT',
  }),
  variables: Joi.object().optional(),
  scheduledAt: Joi.date().greater('now').optional().messages({
    'date.greater': 'Scheduled time must be in the future',
  }),
});

// Custom email validation schemas
const customEmailSchema = Joi.object({
  to: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Recipient email is required',
  }),
  subject: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Subject cannot be empty',
    'string.max': 'Subject cannot exceed 200 characters',
    'any.required': 'Subject is required',
  }),
  content: Joi.string().min(1).max(50000).required().messages({
    'string.min': 'Content cannot be empty',
    'string.max': 'Content cannot exceed 50000 characters',
    'any.required': 'Content is required',
  }),
  isHtml: Joi.boolean().optional().default(false),
});

const customBulkEmailSchema = Joi.object({
  recipients: Joi.array()
    .items(Joi.string().email())
    .min(1)
    .max(1000)
    .required()
    .messages({
      'array.min': 'At least one recipient is required',
      'array.max': 'Cannot send to more than 1000 recipients at once',
      'any.required': 'Recipients array is required',
    }),
  subject: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Subject cannot be empty',
    'string.max': 'Subject cannot exceed 200 characters',
    'any.required': 'Subject is required',
  }),
  content: Joi.string().min(1).max(50000).required().messages({
    'string.min': 'Content cannot be empty',
    'string.max': 'Content cannot exceed 50000 characters',
    'any.required': 'Content is required',
  }),
  isHtml: Joi.boolean().optional().default(false),
});

export const validateEmailRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let schema: Joi.ObjectSchema;

  // Determine which schema to use based on the endpoint
  if (req.path.includes('/bulk')) {
    schema = bulkEmailSchema;
  } else if (req.path.includes('/campaign')) {
    schema = campaignEmailSchema;
  } else {
    schema = singleEmailSchema;
  }

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new BadRequestError(`Validation error: ${errorMessages.join(', ')}`);
  }

  req.body = value;
  next();
};

export const validateCustomEmailRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let schema: Joi.ObjectSchema;
  
  if (req.path.includes('/custom/bulk')) {
    schema = customBulkEmailSchema;
  } else {
    schema = customEmailSchema;
  }

  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new BadRequestError(`Validation error: ${errorMessages.join(', ')}`);
  }

  req.body = value;
  next();
};

// Additional validation for query parameters
export const validateEmailJobsQuery = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const querySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled').optional(),
    type: Joi.string().valid('single', 'bulk', 'campaign').optional(),
  });

  const { error, value } = querySchema.validate(req.query);

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new BadRequestError(`Query validation error: ${errorMessages.join(', ')}`);
  }

  // Replace req.query with validated and defaulted values
  req.query = value;
  next();
};