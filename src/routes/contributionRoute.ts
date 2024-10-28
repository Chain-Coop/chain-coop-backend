import { Router, Request, Response } from 'express';
import { createContribution, getContributionHistory, withdrawContribution, deleteAllContributions, getTotalBalance, verifyContribution, getContributionsById } from "../controllers/contributionController";
import { authorize } from "../middlewares/authorization";
import ContributionModel from '../models/contribution'; 
import HistoryModel from '../models/contributionHistory';

const router = Router();

router.post("/contribute", authorize, createContribution);
router.get("/history", authorize, getContributionHistory);
router.get("/balance", authorize, getTotalBalance);
router.post("/withdraw", authorize, withdrawContribution);
router.get("/verify-contribution", verifyContribution);
router.get('/category/:id', authorize, getContributionsById );

router.delete('/delete', deleteAllContributions);

export default router;
