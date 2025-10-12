import { Router } from 'express';
import {
  sendEmail,
  sendBulkEmails,
  sendCampaignEmails,
  getEmailStats,
  getEmailJobs,
  getEmailJobDetails,
  cancelEmailJob,
  getUserSegments,
  testEmailConnection,
  getEmailTemplates,
  sendCustomEmail,
  sendCustomBulkEmails,
} from '../controllers/emailController';
import { authorize } from '../middlewares/authorization';
import { validateEmailRequest, validateEmailJobsQuery, validateCustomEmailRequest } from '../middlewares/emailValidation';
import { 
  emailRateLimiter, 
  bulkEmailRateLimiter, 
  campaignEmailRateLimiter, 
  generalEmailRateLimiter 
} from '../middlewares/rateLimiter';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailRequest:
 *       type: object
 *       required:
 *         - to
 *         - subject
 *         - template
 *       properties:
 *         to:
 *           type: string
 *           format: email
 *           description: Recipient email address
 *           example: "user@example.com"
 *         subject:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: Email subject line
 *           example: "Welcome to Chain Coop"
 *         template:
 *           type: string
 *           description: Email template identifier
 *           example: "welcome"
 *         variables:
 *           type: object
 *           description: Template variables for personalization
 *           example:
 *             name: "John Doe"
 *             companyName: "Chain Coop"
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           description: Schedule email for future delivery
 *           example: "2024-12-31T23:59:59Z"
 *     
 *     BulkEmailRequest:
 *       type: object
 *       required:
 *         - recipients
 *         - subject
 *         - template
 *       properties:
 *         recipients:
 *           type: array
 *           items:
 *             type: string
 *             format: email
 *           minItems: 1
 *           maxItems: 1000
 *           description: Array of recipient email addresses
 *           example: ["user1@example.com", "user2@example.com"]
 *         subject:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: Email subject line
 *           example: "Monthly Newsletter"
 *         template:
 *           type: string
 *           description: Email template identifier
 *           example: "newsletter"
 *         variables:
 *           type: object
 *           description: Template variables for personalization
 *           example:
 *             month: "December"
 *             year: "2024"
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           description: Schedule emails for future delivery
 *           example: "2024-12-31T09:00:00Z"
 *     
 *     CampaignEmailRequest:
 *       type: object
 *       required:
 *         - segmentIds
 *         - subject
 *         - template
 *       properties:
 *         segmentIds:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 1
 *           description: Array of user segment IDs to target
 *           example: ["new_users", "inactive_users"]
 *         subject:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: Email subject line
 *           example: "Special Offer for Our Valued Users"
 *         template:
 *           type: string
 *           description: Email template identifier
 *           example: "promotion"
 *         variables:
 *           type: object
 *           description: Template variables for personalization
 *           example:
 *             offerCode: "SAVE20"
 *             expiryDate: "2024-12-31"
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           description: Schedule campaign for future delivery
 *           example: "2024-12-25T10:00:00Z"
 *     
 *     EmailJob:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique job identifier
 *           example: "job_123456789"
 *         type:
 *           type: string
 *           enum: [single, bulk, campaign]
 *           description: Type of email job
 *           example: "bulk"
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled]
 *           description: Current job status
 *           example: "completed"
 *         subject:
 *           type: string
 *           description: Email subject
 *           example: "Welcome to Chain Coop"
 *         recipientCount:
 *           type: integer
 *           description: Number of recipients
 *           example: 150
 *         sentCount:
 *           type: integer
 *           description: Number of emails successfully sent
 *           example: 148
 *         failedCount:
 *           type: integer
 *           description: Number of failed email deliveries
 *           example: 2
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Job creation timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           description: Scheduled delivery time
 *           example: "2024-01-15T14:00:00Z"
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: Job completion timestamp
 *           example: "2024-01-15T14:05:00Z"
 *     
 *     EmailStats:
 *       type: object
 *       properties:
 *         totalSent:
 *           type: integer
 *           description: Total emails sent
 *           example: 10500
 *         totalDelivered:
 *           type: integer
 *           description: Total emails delivered
 *           example: 10245
 *         totalFailed:
 *           type: integer
 *           description: Total failed deliveries
 *           example: 255
 *         deliveryRate:
 *           type: number
 *           format: float
 *           description: Delivery success rate (0-1)
 *           example: 0.9757
 *         recentJobs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EmailJob'
 *           description: Recent email jobs
 *     
 *     UserSegment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Segment identifier
 *           example: "new_users"
 *         name:
 *           type: string
 *           description: Human-readable segment name
 *           example: "New Users"
 *         description:
 *           type: string
 *           description: Segment description
 *           example: "Users who joined in the last 30 days"
 *         userCount:
 *           type: integer
 *           description: Number of users in this segment
 *           example: 245
 *         criteria:
 *           type: object
 *           description: Segment criteria based on existing user model fields
 *           properties:
 *             membershipStatus:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: ["active", "pending", "inactive"]
 *               description: Filter by membership status
 *             membershipType:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: ["Explorer", "Pioneer", "Voyager"]
 *               description: Filter by membership tier
 *             Tier:
 *               type: array
 *               items:
 *                 type: integer
 *                 enum: [0, 1, 2]
 *               description: Filter by user tier
 *             isVerified:
 *               type: boolean
 *               description: Filter by email verification status
 *             isCrypto:
 *               type: boolean
 *               description: Filter by crypto interest
 *             membershipPaymentStatus:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: ["paid", "in-progress", "not_started"]
 *               description: Filter by payment status
 *             createdAt:
 *               type: object
 *               description: Filter by registration date
 *               properties:
 *                 $gte:
 *                   type: string
 *                   format: date-time
 *                   description: Users created after this date
 *                 $lt:
 *                   type: string
 *                   format: date-time
 *                   description: Users created before this date
 *             lastActiveAt:
 *               type: object
 *               description: Filter by last activity
 *               properties:
 *                 $gte:
 *                   type: string
 *                   format: date-time
 *                   description: Users active after this date
 *                 $lt:
 *                   type: string
 *                   format: date-time
 *                   description: Users active before this date
 *             emailPreferences:
 *               type: object
 *               description: Filter by email preferences
 *               properties:
 *                 marketing:
 *                   type: boolean
 *                 notifications:
 *                   type: boolean
 *                 updates:
 *                   type: boolean
 *     
 *     EmailTemplate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Template identifier
 *           example: "welcome"
 *         description:
 *           type: string
 *           description: Template description
 *           example: "Welcome email for new users"
 *         variables:
 *           type: array
 *           items:
 *             type: string
 *           description: Available template variables
 *           example: ["name", "email", "companyName"]
 *     
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the request was successful
 *         message:
 *           type: string
 *           description: Response message
 *         data:
 *           type: object
 *           description: Response data
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           description: Error message
 *           example: "Validation error: Invalid email address"
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *           description: Detailed error messages
 *     
 *     RateLimitResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Too many email requests from this IP, please try again later."
 *         retryAfter:
 *           type: string
 *           example: "15 minutes"
 *         limit:
 *           type: integer
 *           example: 10
 *         windowMs:
 *           type: integer
 *           example: 900000
 *   
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * tags:
 *   name: Email
 *   description: Comprehensive email service management including single emails, bulk operations, campaigns, and analytics
 */

/**
 * @swagger
 * /api/email/send:
 *   post:
 *     summary: Send a single email
 *     description: |
 *       Send a personalized email to a single recipient using a predefined template.
 *       This endpoint supports immediate delivery or scheduled sending.
 *       
 *       **Rate Limit:** 10 requests per 15 minutes per IP/user
 *       
 *       **Features:**
 *       - Template-based email composition
 *       - Variable substitution for personalization
 *       - Scheduled delivery support
 *       - Delivery tracking and status updates
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailRequest'
 *           examples:
 *             welcome_email:
 *               summary: Welcome email for new user
 *               value:
 *                 to: "newuser@example.com"
 *                 subject: "Welcome to Chain Coop!"
 *                 template: "welcome"
 *                 variables:
 *                   name: "John Doe"
 *                   companyName: "Chain Coop"
 *                   loginUrl: "https://app.chaincoop.com/login"
 *             password_reset:
 *               summary: Password reset email
 *               value:
 *                 to: "user@example.com"
 *                 subject: "Reset Your Password"
 *                 template: "password_reset"
 *                 variables:
 *                   name: "Jane Smith"
 *                   resetUrl: "https://app.chaincoop.com/reset?token=abc123"
 *                   expiryTime: "24 hours"
 *     responses:
 *       200:
 *         description: Email sent successfully or scheduled for delivery
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         jobId:
 *                           type: string
 *                           description: Unique identifier for tracking the email job
 *                           example: "job_1234567890"
 *                         status:
 *                           type: string
 *                           enum: [sent, scheduled, queued]
 *                           description: Current status of the email
 *                           example: "sent"
 *                         messageId:
 *                           type: string
 *                           description: Provider-specific message identifier
 *                           example: "msg_abc123def456"
 *       400:
 *         description: Invalid request data or validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/send', emailRateLimiter, authorize, validateEmailRequest, sendEmail);

/**
 * @swagger
 * /api/email/bulk:
 *   post:
 *     summary: Send bulk emails
 *     description: |
 *       Send the same email to multiple recipients efficiently. This endpoint is optimized
 *       for sending newsletters, announcements, or notifications to large groups.
 *       
 *       **Rate Limit:** 3 requests per hour per IP/user
 *       **Maximum Recipients:** 1000 per request
 *       
 *       **Features:**
 *       - Batch processing for optimal performance
 *       - Automatic retry mechanism for failed deliveries
 *       - Progress tracking and detailed reporting
 *       - Scheduled delivery support
 *       - Duplicate email detection and removal
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkEmailRequest'
 *           examples:
 *             newsletter:
 *               summary: Monthly newsletter
 *               value:
 *                 recipients: 
 *                   - "subscriber1@example.com"
 *                   - "subscriber2@example.com"
 *                   - "subscriber3@example.com"
 *                 subject: "Chain Coop Monthly Newsletter - December 2024"
 *                 template: "newsletter"
 *                 variables:
 *                   month: "December"
 *                   year: "2024"
 *                   unsubscribeUrl: "https://app.chaincoop.com/unsubscribe"
 *             announcement:
 *               summary: Product announcement
 *               value:
 *                 recipients: 
 *                   - "user1@example.com"
 *                   - "user2@example.com"
 *                 subject: "Exciting New Features Available Now!"
 *                 template: "product_announcement"
 *                 variables:
 *                   featureName: "Advanced Analytics Dashboard"
 *                   releaseDate: "2024-01-15"
 *                 scheduledAt: "2024-01-15T10:00:00Z"
 *     responses:
 *       200:
 *         description: Bulk emails queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         jobId:
 *                           type: string
 *                           description: Unique identifier for tracking the bulk email job
 *                           example: "bulk_job_1234567890"
 *                         status:
 *                           type: string
 *                           enum: [queued, scheduled, processing]
 *                           description: Current status of the bulk email job
 *                           example: "queued"
 *                         recipientCount:
 *                           type: integer
 *                           description: Total number of recipients
 *                           example: 150
 *                         estimatedDeliveryTime:
 *                           type: string
 *                           description: Estimated completion time
 *                           example: "5-10 minutes"
 *       400:
 *         description: Invalid request data or validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/bulk', bulkEmailRateLimiter, authorize, validateEmailRequest, sendBulkEmails);

/**
 * @swagger
 * /api/email/campaign:
 *   post:
 *     summary: Send campaign emails to user segments
 *     description: |
 *       Send targeted email campaigns to specific user segments. This endpoint allows
 *       for sophisticated audience targeting based on user behavior, demographics, or
 *       custom criteria defined in user segments.
 *       
 *       **Rate Limit:** 2 requests per day per IP/user
 *       **Segment Targeting:** Multiple segments can be combined
 *       
 *       **Features:**
 *       - Advanced user segmentation targeting
 *       - Real-time segment size calculation
 *       - Campaign performance tracking
 *       - A/B testing support (future)
 *       - Automated follow-up sequences
 *       - Compliance with unsubscribe preferences
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignEmailRequest'
 *           examples:
 *             re_engagement:
 *               summary: Re-engagement campaign for inactive users
 *               value:
 *                 segmentIds: ["inactive_users", "unverified_users"]
 *                 subject: "We Miss You! Come Back and Get 20% Off"
 *                 template: "re_engagement"
 *                 variables:
 *                   offerCode: "COMEBACK20"
 *                   expiryDate: "2024-02-15"
 *                   supportEmail: "support@chaincoop.com"
 *             new_feature:
 *               summary: New feature announcement to active users
 *               value:
 *                 segmentIds: ["pioneer_members", "voyager_members"]
 *                 subject: "Exclusive Early Access: New Trading Features"
 *                 template: "feature_announcement"
 *                 variables:
 *                   featureName: "Advanced Portfolio Analytics"
 *                   betaUrl: "https://beta.chaincoop.com"
 *                   feedbackEmail: "feedback@chaincoop.com"
 *                 scheduledAt: "2024-01-20T09:00:00Z"
 *             promotional:
 *               summary: Promotional campaign for crypto interested users
 *               value:
 *                 segmentIds: ["crypto_interested_users"]
 *                 subject: "Limited Time: Zero Trading Fees This Week!"
 *                 template: "promotion"
 *                 variables:
 *                   promotionName: "Zero Fee Week"
 *                   startDate: "2024-01-15"
 *                   endDate: "2024-01-22"
 *                   termsUrl: "https://chaincoop.com/terms"
 *     responses:
 *       200:
 *         description: Campaign emails queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         campaignId:
 *                           type: string
 *                           description: Unique identifier for tracking the campaign
 *                           example: "campaign_1234567890"
 *                         status:
 *                           type: string
 *                           enum: [queued, scheduled, processing]
 *                           description: Current status of the campaign
 *                           example: "queued"
 *                         targetedSegments:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               segmentId:
 *                                 type: string
 *                                 example: "inactive_users"
 *                               segmentName:
 *                                 type: string
 *                                 example: "Inactive Users"
 *                               userCount:
 *                                 type: integer
 *                                 example: 245
 *                           description: Details of targeted segments
 *                         totalRecipients:
 *                           type: integer
 *                           description: Total number of unique recipients across all segments
 *                           example: 1250
 *                         estimatedDeliveryTime:
 *                           type: string
 *                           description: Estimated campaign completion time
 *                           example: "15-30 minutes"
 *       400:
 *         description: Invalid request data or validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/campaign', campaignEmailRateLimiter, authorize, validateEmailRequest, sendCampaignEmails);

/**
 * @swagger
 * /api/email/stats:
 *   get:
 *     summary: Get comprehensive email statistics
 *     description: |
 *       Retrieve detailed email delivery statistics and performance metrics.
 *       This endpoint provides insights into email campaign effectiveness,
 *       delivery rates, and recent activity.
 *       
 *       **Rate Limit:** 30 requests per 5 minutes per IP/user
 *       
 *       **Metrics Included:**
 *       - Total emails sent and delivered
 *       - Delivery success rates
 *       - Recent job activity
 *       - Performance trends
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/EmailStats'
 *             example:
 *               success: true
 *               message: "Email statistics retrieved successfully"
 *               data:
 *                 totalSent: 10500
 *                 totalDelivered: 10245
 *                 totalFailed: 255
 *                 deliveryRate: 0.9757
 *                 recentJobs:
 *                   - id: "job_123456789"
 *                     type: "campaign"
 *                     status: "completed"
 *                     subject: "Monthly Newsletter"
 *                     recipientCount: 150
 *                     sentCount: 148
 *                     failedCount: 2
 *                     createdAt: "2024-01-15T10:30:00Z"
 *                     completedAt: "2024-01-15T10:35:00Z"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', generalEmailRateLimiter, authorize, getEmailStats);

/**
 * @swagger
 * /api/email/jobs:
 *   get:
 *     summary: Get email jobs with pagination and filtering
 *     description: |
 *       Retrieve a paginated list of email jobs with optional filtering by status and type.
 *       This endpoint allows monitoring of email delivery progress and troubleshooting
 *       failed deliveries.
 *       
 *       **Rate Limit:** 30 requests per 5 minutes per IP/user
 *       
 *       **Features:**
 *       - Pagination support for large job lists
 *       - Status and type filtering
 *       - Detailed job information including progress
 *       - Sorting by creation date (newest first)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of jobs per page (max 100)
 *         example: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled]
 *         description: Filter jobs by their current status
 *         example: completed
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [single, bulk, campaign]
 *         description: Filter jobs by their type
 *         example: campaign
 *     responses:
 *       200:
 *         description: Email jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         jobs:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/EmailJob'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             currentPage:
 *                               type: integer
 *                               example: 1
 *                             totalPages:
 *                               type: integer
 *                               example: 5
 *                             totalJobs:
 *                               type: integer
 *                               example: 47
 *                             hasNextPage:
 *                               type: boolean
 *                               example: true
 *                             hasPrevPage:
 *                               type: boolean
 *                               example: false
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/jobs', generalEmailRateLimiter, authorize, validateEmailJobsQuery, getEmailJobs);

/**
 * @swagger
 * /api/email/jobs/{jobId}:
 *   get:
 *     summary: Get email job details
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Email job ID
 *     responses:
 *       200:
 *         description: Email job details retrieved successfully
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/jobs/:jobId', generalEmailRateLimiter, authorize, getEmailJobDetails);

/**
 * @swagger
 * /api/email/jobs/{jobId}/cancel:
 *   post:
 *     summary: Cancel an email job
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Email job ID
 *     responses:
 *       200:
 *         description: Email job cancelled successfully
 *       404:
 *         description: Job not found
 *       400:
 *         description: Job cannot be cancelled
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/jobs/:jobId/cancel', generalEmailRateLimiter, authorize, cancelEmailJob);

/**
 * @swagger
 * /api/email/segments:
 *   get:
 *     summary: Get user segments for targeted campaigns
 *     description: |
 *       Retrieve all available user segments with their current user counts.
 *       These segments can be used for targeted email campaigns to reach
 *       specific user groups based on behavior, demographics, or engagement.
 *       
 *       **Rate Limit:** 30 requests per 5 minutes per IP/user
 *       
 *       **Available Segments:**
 *       - New Users (joined in last 30 days)
 *       - Inactive Users (no activity in 90+ days)
 *       - Unverified Users (isVerified: false)
 *       - Pioneer/Voyager/Explorer Members (by membershipType)
 *       - Crypto Interested Users (isCrypto: true)
 *       - Active Members (membershipStatus: active)
 *       - Paid Members (membershipPaymentStatus: "paid")
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User segments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserSegment'
 *             example:
 *               success: true
 *               message: "User segments retrieved successfully"
 *               data:
 *                 - id: "new_users"
 *                   name: "New Users"
 *                   description: "Users who joined in the last 30 days"
 *                   userCount: 245
 *                   criteria:
 *                     createdAt: { $gte: "2024-01-01T00:00:00Z" }
 *                 - id: "unverified_users"
 *                   name: "Unverified Users"
 *                   description: "Users who haven't verified their email"
 *                   userCount: 156
 *                   criteria:
 *                     isVerified: false
 *                 - id: "pioneer_members"
 *                   name: "Pioneer Members"
 *                   description: "Users with Pioneer membership tier"
 *                   userCount: 89
 *                   criteria:
 *                     membershipType: ["Pioneer"]
 *                 - id: "crypto_interested"
 *                   name: "Crypto Interested Users"
 *                   description: "Users interested in cryptocurrency features"
 *                   userCount: 342
 *                   criteria:
 *                     isCrypto: true
 *                 - id: "active_paid_members"
 *                   name: "Active Paid Members"
 *                   description: "Users with active and paid membership"
 *                   userCount: 567
 *                   criteria:
 *                     membershipStatus: ["active"]
 *                     membershipPaymentStatus: ["paid"]
 *                 - id: "tier_1_users"
 *                   name: "Tier 1 Users"
 *                   description: "Users with Tier 1 access level"
 *                   userCount: 123
 *                   criteria:
 *                     Tier: [1]
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/segments', generalEmailRateLimiter, authorize, getUserSegments);

/**
 * @swagger
 * /api/email/test-connection:
 *   get:
 *     summary: Test email service connection health
 *     description: |
 *       Verify that the email service is properly configured and can establish
 *       a connection. This endpoint tests the SMTP configuration, authentication,
 *       and basic connectivity to ensure emails can be sent successfully.
 *       
 *       **Rate Limit:** 30 requests per 5 minutes per IP/user
 *       
 *       **What is tested:**
 *       - SMTP server connectivity
 *       - Authentication credentials
 *       - SSL/TLS configuration
 *       - Service availability
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email service connection is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [healthy]
 *                         provider:
 *                           type: string
 *                           description: Email service provider name
 *                         lastChecked:
 *                           type: string
 *                           format: date-time
 *                         responseTime:
 *                           type: number
 *                           description: Connection response time in milliseconds
 *             example:
 *               success: true
 *               message: "Email service connection is healthy"
 *               data:
 *                 status: "healthy"
 *                 provider: "SendGrid"
 *                 lastChecked: "2024-01-15T10:30:00Z"
 *                 responseTime: 245
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitResponse'
 *       500:
 *         description: Email service connection failed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [failed]
 *                         error:
 *                           type: string
 *                           description: Connection error details
 *                         lastAttempt:
 *                           type: string
 *                           format: date-time
 *             example:
 *               success: false
 *               message: "Email service connection failed"
 *               error: "SMTP authentication failed"
 *               data:
 *                 status: "failed"
 *                 error: "Invalid credentials"
 *                 lastAttempt: "2024-01-15T10:30:00Z"
 */
router.get('/test-connection', generalEmailRateLimiter, authorize, testEmailConnection);

/**
 * @swagger
 * /api/email/templates:
 *   get:
 *     summary: Get available email templates
 *     description: |
 *       Retrieve all available email templates with their metadata, including
 *       required variables and descriptions. These templates can be used for
 *       sending consistent, branded emails across different use cases.
 *       
 *       **Rate Limit:** 30 requests per 5 minutes per IP/user
 *       
 *       **Available Templates:**
 *       - Welcome emails for new users
 *       - Password reset notifications
 *       - Email verification
 *       - KYC status updates
 *       - Newsletter templates
 *       - Promotional campaigns
 *       - Transaction notifications
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/EmailTemplate'
 *             example:
 *               success: true
 *               message: "Email templates retrieved successfully"
 *               data:
 *                 - name: "welcome"
 *                   description: "Welcome email for new users"
 *                   category: "onboarding"
 *                   variables:
 *                     - "firstName"
 *                     - "lastName"
 *                     - "verificationLink"
 *                   preview: "Welcome to ChainCoop, {{firstName}}!"
 *                   lastModified: "2024-01-15T10:30:00Z"
 *                 - name: "password_reset"
 *                   description: "Password reset notification"
 *                   category: "security"
 *                   variables:
 *                     - "firstName"
 *                     - "resetLink"
 *                     - "expiryTime"
 *                   preview: "Reset your password, {{firstName}}"
 *                   lastModified: "2024-01-10T14:20:00Z"
 *                 - name: "newsletter"
 *                   description: "Monthly newsletter template"
 *                   category: "marketing"
 *                   variables:
 *                     - "firstName"
 *                     - "monthlyHighlights"
 *                     - "unsubscribeLink"
 *                   preview: "Your monthly ChainCoop update"
 *                   lastModified: "2024-01-12T09:15:00Z"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/templates', generalEmailRateLimiter, authorize, getEmailTemplates);

/**
 * @swagger
 * /api/v1/email/custom/send:
 *   post:
 *     summary: Send a custom email with custom subject and content
 *     description: Send a single custom email with user-defined subject and content to a specific recipient
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - subject
 *               - content
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address
 *                 example: "user@example.com"
 *               subject:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 description: Email subject line
 *                 example: "Welcome to Chain Coop"
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50000
 *                 description: Email content (text or HTML)
 *                 example: "Hello! Welcome to our platform."
 *               isHtml:
 *                 type: boolean
 *                 description: Whether the content is HTML formatted
 *                 default: false
 *                 example: false
 *     responses:
 *       200:
 *         description: Email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Custom email sent successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     messageId:
 *                       type: string
 *                       example: "msg_abc123"
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/custom/send', emailRateLimiter, authorize, validateCustomEmailRequest, sendCustomEmail);

/**
 * @swagger
 * /api/v1/email/custom/bulk:
 *   post:
 *     summary: Send custom bulk emails with custom subject and content
 *     description: Send custom emails with user-defined subject and content to multiple recipients
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipients
 *               - subject
 *               - content
 *             properties:
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 minItems: 1
 *                 maxItems: 1000
 *                 description: Array of recipient email addresses
 *                 example: ["user1@example.com", "user2@example.com"]
 *               subject:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 description: Email subject line
 *                 example: "Important Update from Chain Coop"
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50000
 *                 description: Email content (text or HTML)
 *                 example: "Hello! We have an important update for you."
 *               isHtml:
 *                 type: boolean
 *                 description: Whether the content is HTML formatted
 *                 default: false
 *                 example: false
 *     responses:
 *       200:
 *         description: Bulk email job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Custom bulk email job created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                       example: "job_abc123"
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/custom/bulk', bulkEmailRateLimiter, authorize, validateCustomEmailRequest, sendCustomBulkEmails);

export default router;