import { createPortfolioService, getUserPortfoliosService } from "../services/portfolioService";
import Portfolio from "../models/portfolioModel";

jest.mock("../models/portfolioModel"); // Mock the Portfolio model

describe("Portfolio Service", () => {
  const mockPayload = {
    title: "My Portfolio",
    description: "This is my portfolio description",
    author: "user_12345",
  };
  
  const mockUserId = "user_12345";
  const mockPortfolioDocument = {
    _id: "portfolio_123",
    title: "My Portfolio",
    description: "This is my portfolio description",
    author: mockUserId,
  };

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  describe("createPortfolioService", () => {
    it("should create a portfolio and return the portfolio document", async () => {
      (Portfolio.create as jest.Mock).mockResolvedValue(mockPortfolioDocument); // Mocking the create method

      const result = await createPortfolioService(mockPayload);

      expect(result).toEqual(mockPortfolioDocument); // Validate the returned document
      expect(Portfolio.create).toHaveBeenCalledWith(mockPayload); // Ensure create was called with the correct payload
    });
  });

  describe("getUserPortfoliosService", () => {
    it("should return user portfolios", async () => {
      const mockPortfolios = [mockPortfolioDocument];
      (Portfolio.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPortfolios), // Mock the find method with populate
      });

      const result = await getUserPortfoliosService(mockUserId);

      expect(result).toEqual(mockPortfolios); // Validate the returned portfolios
      expect(Portfolio.find).toHaveBeenCalledWith({ author: mockUserId }); // Ensure find was called with the correct user ID
    });
  });
});
