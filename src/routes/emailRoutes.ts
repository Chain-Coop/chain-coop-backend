import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  sendIndividualEmail,
  sendBulkEmails,
  sendCampaignEmails,
  getEmailStats,
  getPendingJobs,
  retryFailedJobs,
  getUserSegments,
  testEmailService,
} from '../controllers/emailController';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     SendEmailRequest:
 *       type: object
 *       required: [recipient, template]
 *       properties:
 *         recipient:
 *           type: string
 *           format: email
 *         template:
 *           type: string
 *           enum: [kyc_reminder, activation_reminder, reengagement]
 *         variables:
 *           type: object
 *           additionalProperties: true
 *     BulkEmailRequest:
 *       type: object
 *       required: [recipients, template]
 *       properties:
 *         recipients:
 *           type: array
 *           items:
 *             type: string
 *             format: email
 *         template:
 *           type: string
 *           enum: [kyc_reminder, activation_reminder, reengagement]
 *         variables:
 *           type: object
 *           additionalProperties: true
 *     CampaignEmailRequest:
 *       type: object
 *       required: [segment, template]
 *       properties:
 *         segment:
 *           type: string
 *         template:
 *           type: string
 *           enum: [kyc_reminder, activation_reminder, reengagement]
 *         variables:
 *           type: object
 *           additionalProperties: true
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           additionalProperties: true
 */

// Base API limiter
const apiLimiter = rateLimit({
  windowMs: Number(process.env.EMAIL_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.EMAIL_RATE_LIMIT_MAX_REQUESTS || 100),
  standardHeaders: true,
  legacyHeaders: false,
});

// Email-specific limiter
const emailLimiter = rateLimit({
  windowMs: Number(process.env.EMAIL_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.EMAIL_RATE_LIMIT_MAX_REQUESTS || 10),
  standardHeaders: true,
  legacyHeaders: false,
});

const bulkLimiter = rateLimit({
  windowMs: Number(process.env.EMAIL_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.BULK_EMAIL_RATE_LIMIT_MAX_REQUESTS || 5),
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(apiLimiter);

/**
 * @openapi
 * /email/send:
 *   post:
 *     summary: Send an individual templated email
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendEmailRequest'
 *     responses:
 *       '200':
 *         description: Email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       '400':
 *         description: Validation error
 */
router.post('/send', emailLimiter, sendIndividualEmail);

/**
 * @openapi
 * /email/send/bulk:
 *   post:
 *     summary: Send bulk templated emails
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkEmailRequest'
 *     responses:
 *       '200':
 *         description: Bulk emails queued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       '400':
 *         description: Validation error
 */
router.post('/send/bulk', bulkLimiter, sendBulkEmails);

/**
 * @openapi
 * /email/send/campaign:
 *   post:
 *     summary: Send campaign emails based on a user segment
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignEmailRequest'
 *     responses:
 *       '200':
 *         description: Campaign emails queued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       '503':
 *         description: Service unavailable when DB interactions are disabled
 */
router.post('/send/campaign', bulkLimiter, sendCampaignEmails);

/**
 * @openapi
 * /email/stats:
 *   get:
 *     summary: Get email sending statistics
 *     tags: [Email]
 *     responses:
 *       '200':
 *         description: Aggregated statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/stats', getEmailStats);

/**
 * @openapi
 * /email/jobs/pending:
 *   get:
 *     summary: List pending email jobs
 *     tags: [Email]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Pending jobs list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/jobs/pending', getPendingJobs);

/**
 * @openapi
 * /email/jobs/retry:
 *   post:
 *     summary: Mark failed jobs to retry
 *     tags: [Email]
 *     responses:
 *       '200':
 *         description: Retry marking result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/jobs/retry', retryFailedJobs);

/**
 * @openapi
 * /email/segments:
 *   get:
 *     summary: Get predefined user segments for emailing
 *     tags: [Email]
 *     responses:
 *       '200':
 *         description: Segment list with counts (when available)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/segments', getUserSegments);

/**
 * @openapi
 * /email/test:
 *   get:
 *     summary: Test email service configuration
 *     tags: [Email]
 *     responses:
 *       '200':
 *         description: Service status including provider and dry-run flag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/test', testEmailService);

export default router;