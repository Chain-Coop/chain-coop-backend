import { Request, Response } from "express";
import { createPortfolioService, getUserPortfoliosService } from "../services/portfolioService";
import { portfolioCreateValidator } from "../utils/requestValidator";

export const createPortfolio = async (req: Request, res: Response) => {
  portfolioCreateValidator(req);
  const { netWorthAsset, assetType } = req.body;
  // @ts-ignore - extract the userId from the authenticated user
  const userId = req.user.userId;

  const portfolio = await createPortfolioService({ netWorthAsset, assetType, author: userId });
  res.status(201).json({ msg: "Portfolio created successfully", portfolio });
};

export const getUserPortfolios = async (req: Request, res: Response) => {
    // @ts-ignore 
  const userId = req.user.userId;
  const portfolios = await getUserPortfoliosService(userId);
  res.status(200).json(portfolios);
};