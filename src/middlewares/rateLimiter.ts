import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiter for email endpoints to prevent abuse
 */
export const emailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 email requests per windowMs
  message: {
    success: false,
    message: 'Too many email requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req: Request) => {
    // Use IP address and user ID (if authenticated) for more granular limiting
    const userId = (req as any).user?.id || 'anonymous';
    return `${req.ip}-${userId}`;
  },
  skip: (req: Request) => {
    // Skip rate limiting for admin users or in development
    const isAdmin = (req as any).user?.role === 'admin';
    const isDevelopment = process.env.NODE_ENV === 'development';
    return isAdmin || isDevelopment;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many email requests from this IP, please try again later.',
      retryAfter: '15 minutes',
      limit: 10,
      windowMs: 15 * 60 * 1000
    });
  }
});

/**
 * Stricter rate limiter for bulk email operations
 */
export const bulkEmailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 bulk email requests per hour
  message: {
    success: false,
    message: 'Too many bulk email requests from this IP, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'anonymous';
    return `bulk-${req.ip}-${userId}`;
  },
  skip: (req: Request) => {
    const isAdmin = (req as any).user?.role === 'admin';
    const isDevelopment = process.env.NODE_ENV === 'development';
    return isAdmin || isDevelopment;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many bulk email requests from this IP, please try again later.',
      retryAfter: '1 hour',
      limit: 3,
      windowMs: 60 * 60 * 1000
    });
  }
});

/**
 * Even stricter rate limiter for campaign email operations
 */
export const campaignEmailRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 2, // Limit each IP to 2 campaign email requests per day
  message: {
    success: false,
    message: 'Too many campaign email requests from this IP, please try again later.',
    retryAfter: '24 hours'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'anonymous';
    return `campaign-${req.ip}-${userId}`;
  },
  skip: (req: Request) => {
    const isAdmin = (req as any).user?.role === 'admin';
    const isDevelopment = process.env.NODE_ENV === 'development';
    return isAdmin || isDevelopment;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many campaign email requests from this IP, please try again later.',
      retryAfter: '24 hours',
      limit: 2,
      windowMs: 24 * 60 * 60 * 1000
    });
  }
});

/**
 * General rate limiter for other email operations (stats, templates, etc.)
 */
export const generalEmailRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit each IP to 30 requests per 5 minutes
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'anonymous';
    return `general-${req.ip}-${userId}`;
  },
  skip: (req: Request) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return isDevelopment;
  }
});