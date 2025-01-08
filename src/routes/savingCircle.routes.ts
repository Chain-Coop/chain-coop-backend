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
} from "../controllers/savingCircleController";
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = Router();

/**
 * @route   POST /api/savingCircles
 * @desc    Create a new saving circle
 * @access  Private
 */
router.post("/create", authorize, createCircleController);

/**
 * @route   POST /api/savingCircles/join
 * @desc    Join an existing saving circle
 * @access  Private
 */
router.post("/join", authorize, joinCircleController);

/**
 * @route   GET /api/savingCircles/user/:userId
 * @desc    Get all saving circles for a user
 * @access  Private
 */
router.get("/user/:userId", authorize, getUserCirclesController);

/**
 * @route   GET /api/savingCircles/:circleId
 * @desc    Get a saving circle by its ID
 * @access  Private
 */
router.get("/:circleId", authorize, getCircleController);

/**
 * @route   PATCH /api/savingCircles/:circleId
 * @desc    Update a saving circle by its ID
 * @access  Private
 */
router.patch("/:circleId", authorize, updateCircleController);

/**
 * @route   POST /api/savingCircles/initialize
 * @desc    Initialize a circle for payment
 * @access  Private
 */
router.post("/initialize", authorize, initializeCircleController);

/**
 * @route   POST /api/savingCircles/payment
 * @desc    Make a payment in a saving circle
 * @access  Private
 */
router.post("/payment", authorize, paymentCircleController);

/**
 * @route   GET /api/savingCircles/unpaid
 * @desc    Get the unpaid amount for a user in a circle
 * @access  Private
 */
router.get("/unpaid/:circleId/:userId", authorize, unpaidCircleController);

/**
 * @route   POST /api/savingCircles/recurring
 * @desc    Trigger recurring contributions for circles
 * @access  Private
 */
router.post("/recurring", authorize, recurringCircleController);

export default router;
