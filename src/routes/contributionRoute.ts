import { Router, Request, Response } from 'express';
import { createContribution, getContributionHistory, getContributionDetails, withdrawContribution, verifyContribution} from "../controllers/contributionController";
import { authorize } from "../middlewares/authorization";
import ContributionModel from '../models/contribution'; 
import HistoryModel from '../models/contributionHistory';

const router = Router();

router.post("/contribute", authorize, createContribution);
router.get("/history", authorize, getContributionHistory);
router.get("/balance", authorize, getContributionDetails);
router.post("/withdraw", authorize, withdrawContribution);
router.get("/verify-contribution", verifyContribution);

router.delete('/delete', async (req: Request, res: Response) => {
    try {

      await ContributionModel.deleteMany({});
      
      await HistoryModel.deleteMany({});
  
      return res.status(200).json({
        message: 'All contributions and history records have been successfully deleted.',
      });
    } catch (error) {
      console.error('Error deleting contributions or history:', error);
      return res.status(500).json({
        error: 'An unexpected error occurred while deleting contributions and history.',
      });
    }
  });

export default router;
