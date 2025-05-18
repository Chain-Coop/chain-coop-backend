// routes/periodicSavingRoutes.ts
import express from 'express';
import { PeriodicSavingController } from '../../../controllers/web3/chaincoopSaving.2.0/periodicSavingController';
import { authorize, verifyPin } from '../../../middlewares/authorization'; // Your authentication middleware

const router = express.Router();

/**
 * @swagger
 * /web3/v2/periodicSaving/openPeriodicPool:
 *   post:
 *     summary: Create a new periodic saving pool
 *     tags: [Web3 Periodic Saving]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *               - initialSaveAmount
 *               - periodicAmount
 *               - reasonForSaving
 *               - lockedType
 *               - duration
 *               - interval
 *               - network
 *               - pin
 *             properties:
 *               tokenId:
 *                 type: string
 *                 description: The token ID (1 for USDC, 2 for Lisk Token, 3 for WUSDC)
 *               initialSaveAmount:
 *                 type: string
 *                 description: Initial amount to save when creating the pool
 *               periodicAmount:
 *                 type: string
 *                 description: Amount to save periodically according to the interval
 *               lockedType:
 *                 type: number
 *                 description: Type of lock (0-Flexible, 1-Lock, or 2-StrictLock)
 *               reasonForSaving:
 *                 type: string
 *                 description: Reason for saving
 *               duration:
 *                 type: number
 *                 description: Duration in seconds
 *               interval:
 *                 type: string
 *                 description: Saving interval (DAILY, WEEKLY, MONTHLY)
 *                 enum: [DAILY, WEEKLY, MONTHLY]
 *               network:
 *                 type: string
 *                 description: Blockchain network to use (e.g.LISK, BSC, ETHERLINK, GNOSIS)
 *               pin:
 *                 type: string
 *                 description: User's pin for authorization
 *     responses:
 *       201:
 *         description: Periodic saving pool created successfully
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
 *                   example: Periodic saving pool created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     txHash:
 *                       type: string
 *                       example: 0x123...abc
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Missing required fields
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to create periodic saving
 */
router.post(
  '/openPeriodicPool',
  authorize,
  verifyPin,
  PeriodicSavingController.createPeriodicSaving
);
/**
 * @swagger
 * /web3/v2/periodicSaving/withdraw:
 *   post:
 *     summary: withdraw from a periodic saving pool
 *     description: withdraw from a periodic saving pool
 *     tags: [Web3 Periodic Saving]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - poolId_bytes
 *               - pin
 *             properties:
 *               poolId_bytes:
 *                 type: string
 *                 description: The ID of the periodic saving pool to withdaw from
 *               pin:
 *                 type: string
 *                 description: User's pin for authorization
 *     responses:
 *       200:
 *         description: Periodic saving pool withdrawn from successfully
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
 *                   example: Periodic saving pool closed successfully
 */

router.post(
  '/withdraw',
  authorize,
  verifyPin,
  PeriodicSavingController.withdrawFromPoolByID
);
/**
 * @swagger
 * /web3/v2/periodicSaving/getPeriodicPool:
 *   get:
 *     summary: Get all user's periodic savings
 *     description: Retrieves all periodic savings for the authenticated user
 *     tags: [Web3 Periodic Saving]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user's periodic savings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 60d21b4667d0d8992e610c85
 *                       userId:
 *                         type: string
 *                         example: 60d21b4667d0d8992e610c86
 *                       tokenAddress:
 *                         type: string
 *                         example: 0x1234...5678
 *                       initialAmount:
 *                         type: string
 *                         example: 100
 *                       periodicAmount:
 *                         type: string
 *                         example: 50
 *                       reasonForSaving:
 *                         type: string
 *                         example: House Fund
 *                       lockedType:
 *                         type: number
 *                         example: 1
 *                       duration:
 *                         type: number
 *                         example: 31536000
 *                       interval:
 *                         type: string
 *                         example: MONTHLY
 *                       poolId:
 *                         type: string
 *                         example: 0xabcd...1234
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       nextExecutionTime:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-05-25T12:00:00Z
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to fetch periodic savings
 */
router.get(
  '/getPeriodicPool',
  authorize,
  PeriodicSavingController.getUserPeriodicSavings
);

/**
 * @swagger
 * /web3/v2/periodicSaving/getPeriodicPool/{id}:
 *   get:
 *     summary: Get a specific periodic saving by ID
 *     description: Retrieves details of a specific periodic saving by its ID
 *     tags: [Web3 Periodic Saving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The periodic saving ID
 *     responses:
 *       200:
 *         description: Successfully retrieved periodic saving
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60d21b4667d0d8992e610c85
 *                     userId:
 *                       type: string
 *                       example: 60d21b4667d0d8992e610c86
 *                     tokenAddress:
 *                       type: string
 *                       example: 0x1234...5678
 *                     initialAmount:
 *                       type: string
 *                       example: 100
 *                     periodicAmount:
 *                       type: string
 *                       example: 50
 *                     reasonForSaving:
 *                       type: string
 *                       example: House Fund
 *                     lockedType:
 *                       type: number
 *                       example: 1
 *                     duration:
 *                       type: number
 *                       example: 31536000
 *                     interval:
 *                       type: string
 *                       example: MONTHLY
 *                     poolId:
 *                       type: string
 *                       example: 0xabcd...1234
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     nextExecutionTime:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-05-25T12:00:00Z
 *       404:
 *         description: Periodic saving not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Periodic saving not found
 *       403:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Unauthorized access
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to fetch periodic saving
 */
router.get(
  '/getPeriodicPool/:id',
  authorize,
  PeriodicSavingController.getPeriodicSaving
);

/**
 * @swagger
 * /web3/v2/periodicSaving/periodicPool/{id}/stop:
 *   post:
 *     summary: Stop a periodic saving
 *     description: Stops the execution of a specific periodic saving
 *     tags: [Web3 Periodic Saving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The periodic saving ID
 *     responses:
 *       200:
 *         description: Periodic saving stopped successfully
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
 *                   example: Periodic saving stopped successfully
 *       404:
 *         description: Periodic saving not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Periodic saving not found
 *       403:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Unauthorized access
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to stop periodic saving
 */
router.post(
  '/periodicPool/:id/stop',
  authorize,
  PeriodicSavingController.stopPeriodicSaving
);

/**
 * @swagger
 * /web3/v2/periodicSaving/periodicPool/{id}/resume:
 *   post:
 *     summary: Resume a periodic saving
 *     description: Resumes the execution of a previously stopped periodic saving
 *     tags: [Web3 Periodic Saving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           description: The periodic saving ID
 *     responses:
 *       200:
 *         description: Periodic saving resumed successfully
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
 *                   example: Periodic saving resumed successfully
 *       404:
 *         description: Periodic saving not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Periodic saving not found
 *       403:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Unauthorized access
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to resume periodic saving
 */
router.post(
  '/periodicPool/:id/resume',
  authorize,
  PeriodicSavingController.resumePeriodicSaving
);

/**
 * @swagger
 * /web3/v2/periodicSaving/periodicPool/{id}/amount:
 *   put:
 *     summary: Update periodic saving amount
 *     description: Updates the periodic amount for future executions
 *     tags: [Web3 Periodic Saving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The periodic saving ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: string
 *                 description: New periodic amount to save
 *     responses:
 *       200:
 *         description: Periodic saving amount updated successfully
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
 *                   example: Periodic saving amount updated successfully
 *                 data:
 *                   type: object
 *       404:
 *         description: Periodic saving not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Periodic saving not found
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Amount is required
 *       403:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Unauthorized access
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to update periodic saving amount
 */
router.put(
  '/periodicPool/:id/amount',
  authorize,
  PeriodicSavingController.updateSavingAmount
);

/**
 * @swagger
 * /web3/v2/periodicSaving/periodicPool/{id}/execute:
 *   post:
 *     summary: Execute a periodic saving manually
 *     description: Manually triggers the execution of a periodic saving without waiting for the scheduled time
 *     tags: [Web3 Periodic Saving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           description: The periodic saving ID
 *     responses:
 *       200:
 *         description: Manual execution initiated
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
 *                   example: Manual execution initiated. Transaction will be processed shortly.
 *       404:
 *         description: Periodic saving not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Periodic saving not found
 *       400:
 *         description: Cannot execute inactive saving
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Cannot execute inactive saving
 *       403:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Unauthorized access
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to execute periodic saving
 */
router.post(
  '/periodicPool/:id/execute',
  authorize,
  PeriodicSavingController.executePeriodicSaving
);

/**
 * @swagger
 * /web3/v2/periodicSaving/periodicPool/initialize/{network}:
 *   post:
 *     summary: Initialize periodic saving service
 *     description: Initializes the periodic saving service that manages scheduled executions
 *     tags: [Web3 Periodic Saving]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: network
 *         required: true
 *         schema:
 *           type: string
 *         description: Blockchain network to use (e.g., LISK, BSC, ETHERLINK, GNOSIS)
 *     responses:
 *       200:
 *         description: Service initialized successfully
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
 *                   example: Periodic saving service initialized successfully
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to initialize periodic saving service
 */
router.post(
  '/periodicPool/initialize/:network',
  authorize,
  PeriodicSavingController.intializePeriodicSaving
);

/**
 * @swagger
 * /web3/v2/periodicSaving/totalAmountSaved:
 *   get:
 *     summary: Get total amount saved by user
 *     description: Retrieves the sum of all amounts saved across all periodic saving pools for the authenticated user
 *     tags: [Web3 Periodic Saving]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved total amount saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: number
 *                   example: 1050.75
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to fetch total amount saved by user
 */
router.get(
  '/totalAmountSaved',
  authorize,
  PeriodicSavingController.getTotalAmountSavedByUser
);

/**
 * @swagger
 * /web3/v2/periodicSaving/getPoolByReason:
 *   post:
 *     summary: Get periodic savings by reason
 *     description: Retrieves all periodic savings that match the provided reason (case insensitive)
 *     tags: [Web3 Periodic Saving]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: The reason for saving to search for
 *                 example: House
 *     responses:
 *       200:
 *         description: Successfully retrieved matching periodic savings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 60d21b4667d0d8992e610c85
 *                       userId:
 *                         type: string
 *                         example: 60d21b4667d0d8992e610c86
 *                       tokenAddress:
 *                         type: string
 *                         example: 0x1234...5678
 *                       initialAmount:
 *                         type: string
 *                         example: 100
 *                       periodicAmount:
 *                         type: string
 *                         example: 50
 *                       reasonForSaving:
 *                         type: string
 *                         example: House Fund
 *                       lockedType:
 *                         type: number
 *                         example: 1
 *                       duration:
 *                         type: number
 *                         example: 31536000
 *                       interval:
 *                         type: string
 *                         example: MONTHLY
 *                       totalAmount:
 *                         type: string
 *                         example: 250
 *                       poolId:
 *                         type: string
 *                         example: 0xabcd...1234
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Provide all required values reason
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: internal server error
 */
router.post(
  '/getPoolByReason',
  authorize,
  PeriodicSavingController.getUserPoolbyReason
);

export default router;
