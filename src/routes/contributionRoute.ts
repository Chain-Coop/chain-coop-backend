import { Router } from "express";
import { createContribution, getContributionHistory } from "../controllers/contributionController";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.post("/contribute", authorize, createContribution);
router.get("/history", authorize, getContributionHistory);

export default router;
