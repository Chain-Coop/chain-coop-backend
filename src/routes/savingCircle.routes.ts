import { Router } from "express";
import {
  createCircleController,
  joinCircleController,
  getUserCirclesController,
  getCircleController,
  updateCircleController,
  initializeCircleController,
  paymentCircleController,
  unpaidCircleController,
  recurringCircleController,
  verifyPaymentController,
} from "../controllers/savingCircleController";
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = Router();

/**
 * @swagger
 * /api/savingcircle/create:
 *   post:
 *     summary: Create a new saving circle
 *     description: Allows a user to create a new saving circle with specified attributes.
 *     tags:
 *       - Saving Circles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: The details of the saving circle to create.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               circleName:
 *                 type: string
 *                 example: "Monthly Savings Circle"
 *               description:
 *                 type: string
 *                 example: "A circle for monthly savings"
 *               targetAmount:
 *                 type: number
 *                 format: float
 *                 example: 5000
 *               currency:
 *                 type: string
 *                 example: "USD"
 *               duration:
 *                 type: integer
 *                 example: 90
 *               frequencyInDays:
 *                 type: integer
 *                 example: 30
 *               type:
 *                 type: string
 *                 example: "time"
 *               goalAmount:
 *                 type: number
 *                 format: float
 *                 example: 100000
 *               groupType:
 *                 type: string
 *                 example: "closed"
 *               userId:
 *                 type: string
 *                 example: "675cd8dc1ced747022d5f333"
 *     responses:
 *       200:
 *         description: Successfully created saving circle
 *       400:
 *         description: Invalid input
 */
router.post("/create", authorize, createCircleController);
/**
 * @swagger
 * /api//savingcircle/join:
 *   post:
 *     summary: Join an existing saving circle
 *     description: Allows a user to join an existing saving circle.
 *     tags:
 *       - Saving Circles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: The circle ID to join.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               circleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully joined the saving circle
 *       404:
 *         description: Circle not found
 */
router.post("/join", authorize, joinCircleController);

/**
 * @swagger
 * /api//savingcircle/user/{userId}:
 *   get:
 *     summary: Get all saving circles for a user
 *     description: Fetch all saving circles associated with a particular user.
 *     tags:
 *       - Saving Circles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: The user ID for fetching their circles.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully fetched circles for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   circleId:
 *                     type: string
 *                   circleName:
 *                     type: string
 *       404:
 *         description: User not found
 */
router.get("/user/:userId", authorize, getUserCirclesController);

/**
 * @swagger
 * /api//savingcircle/verify:
 *   get:
 *     summary: Verify payment
 *     description: Verifies a payment using a reference number.
 *     tags:
 *       - Saving Circles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reference
 *         required: true
 *         description: The reference of the payment to verify.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment successfully verified
 *       400:
 *         description: Missing or invalid reference
 */
router.get("/verify", authorize, verifyPaymentController);

/**
 * @swagger
 * /api//savingcircle/{circleId}:
 *   get:
 *     summary: Get a saving circle by its ID
 *     description: Retrieve a specific saving circle by its ID.
 *     tags:
 *       - Saving Circles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: circleId
 *         required: true
 *         description: The ID of the saving circle to fetch.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully fetched the saving circle
 *       404:
 *         description: Circle not found
 */
router.get("/:circleId", authorize, getCircleController);

/**
 * @swagger
 * /api//savingcircle/{circleId}:
 *   patch:
 *     summary: Update a saving circle by its ID
 *     description: Update the details of an existing saving circle.
 *     tags:
 *       - Saving Circles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: circleId
 *         required: true
 *         description: The ID of the saving circle to update.
 *         schema:
 *           type: string
 *     requestBody:
 *       description: The updated details of the saving circle.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               circleName:
 *                 type: string
 *               targetAmount:
 *                 type: number
 *                 format: float
 *               frequency:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully updated the saving circle
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Circle not found
 */
router.patch("/:circleId", authorize, updateCircleController);

/**
 * @swagger
 * /api//savingcircle/initialize:
 *   post:
 *     summary: Initialize a circle for payment
 *     description: Initializes a circle to be ready for accepting payments.
 *     tags:
 *       - Saving Circles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: The circle details to initialize for payment.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               circleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Circle successfully initialized for payments
 *       404:
 *         description: Circle not found
 */
router.post("/initialize", authorize, initializeCircleController);

/**
 * @swagger
 * /api//savingcircle/payment:
 *   post:
 *     summary: Make a payment in a saving circle
 *     description: Allows a user to make a payment into a saving circle.
 *     tags:
 *       - Saving Circles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Payment details to make a contribution.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               circleId:
 *                 type: string
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment successfully processed
 *       400:
 *         description: Invalid payment details
 */
router.post("/payment", authorize, paymentCircleController);

/**
 * @swagger
 * /api//savingcircle/unpaid/{circleId}/{userId}:
 *   get:
 *     summary: Get the unpaid amount for a user in a circle
 *     description: Fetch the unpaid balance of a user in a specific saving circle.
 *     tags:
 *       - Saving Circles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: circleId
 *         required: true
 *         description: The saving circle ID.
 *       - in: path
 *         name: userId
 *         required: true
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: Successfully fetched unpaid amount
 *       404:
 *         description: User or Circle not found
 */
router.get("/unpaid/:circleId/:userId", authorize, unpaidCircleController);

/**
 * @swagger
 * /api//savingcircle/recurring:
 *   post:
 *     summary: Trigger recurring contributions for circles
 *     description: Triggers recurring payments for saving circles.
 *     tags:
 *       - Saving Circles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: The recurring contribution details.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               frequency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recurring contributions successfully triggered
 *       400:
 *         description: Invalid input
 */
router.post("/recurring", authorize, recurringCircleController);

export default router;
