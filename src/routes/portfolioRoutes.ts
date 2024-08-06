import { Router } from "express";
import { createPortfolio, getUserPortfolios } from "../controllers/portfolioController";

const router = Router();

router.post("/create", createPortfolio);
router.get("/user", getUserPortfolios);

export default router;