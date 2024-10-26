import { Router, Request, Response } from 'express';
import { createContribution, getContributionHistory, withdrawContribution, deleteAllContributions, getTotalBalance, verifyContribution, getContributionsByCategory} from "../controllers/contributionController";
import { authorize } from "../middlewares/authorization";
import ContributionModel from '../models/contribution'; 
import HistoryModel from '../models/contributionHistory';

const router = Router();

router.post("/contribute", authorize, createContribution);
router.get("/history", authorize, getContributionHistory);
router.get("/balance", authorize, getTotalBalance);
router.post("/withdraw", authorize, withdrawContribution);
router.get("/verify-contribution", verifyContribution);
router.get('/category/:category', authorize, getContributionsByCategory);

router.delete('/delete', deleteAllContributions);

export default router;
