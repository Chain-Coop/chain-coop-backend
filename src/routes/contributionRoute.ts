import { Router } from "express";
import { createContribution, getContributionHistory, getContributionDetails } from "../controllers/contributionController";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.post("/contribute", authorize, createContribution);
router.get("/history", authorize, getContributionHistory);
router.get("/balance", authorize, getContributionDetails); 

export default router;
