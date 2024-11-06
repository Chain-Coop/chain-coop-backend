import { Router, Request, Response } from "express";
import {
  createContribution,
  withdrawContribution,
  deleteAllContributions,
  getTotalBalance,
  verifyContribution,
  getContributionsById,
  chargeCardforContribution,
  newgetContributionHistory,
  getUserContributions
} from "../controllers/contributionController";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.post("/contribute", authorize, createContribution);
router.get("/contribute", authorize, getUserContributions);
router.get("/history", authorize, newgetContributionHistory);
router.get("/balance", authorize, getTotalBalance);
router.post("/withdraw", authorize, withdrawContribution);
router.get("/verify-contribution", verifyContribution);
router.get("/category/:id", authorize, getContributionsById);
router.delete("/delete", deleteAllContributions);
router.route("/pay-contribution").post(authorize, chargeCardforContribution);
export default router;
