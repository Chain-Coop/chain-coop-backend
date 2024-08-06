import Portfolio, { PortfolioDocument } from "../models/portfolioModel";

export const createPortfolioService = async (payload: any): Promise<PortfolioDocument> => {
  return await Portfolio.create(payload);
};

export const getUserPortfoliosService = async (userId: string): Promise<PortfolioDocument[]> => {
  return await Portfolio.find({ author: userId }).populate("author", "username email");
};
