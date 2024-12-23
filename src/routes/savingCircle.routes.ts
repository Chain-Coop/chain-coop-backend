import { Router } from "express";
import {
  createCircleController,
  joinCircleController,
  getUserCirclesController,
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
router.post("/join", joinCircleController);

/**
 * @route   GET /api/savingCircles/user/:userId
 * @desc    Get all saving circles for a user
 * @access  Private
 */
router.get("/user/:userId", getUserCirclesController);

export default router;
