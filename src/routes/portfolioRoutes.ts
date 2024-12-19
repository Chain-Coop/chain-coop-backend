import { Router } from "express";
import { createPortfolio, getUserPortfolios } from "../controllers/portfolioController";
import { authorize } from "../middlewares/authorization";

const router = Router();

router.post("/create", authorize, createPortfolio);
router.get("/user", authorize, getUserPortfolios);

export default router;
