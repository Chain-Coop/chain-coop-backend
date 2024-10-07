import request from "supertest";
import express, { Request, Response } from "express";
import {
  createContribution,
  getContributionDetails,
  getContributionHistory,
} from "../../controllers/contributionController";
import {
  createContributionService,
  createContributionHistoryService,
  findContributionHistoryService,
  calculateNextContributionDate,
  findContributionService,
} from "../../services/contributionService";
import {
  findWalletService,
  updateWalletService,
} from "../../services/walletService";
import { StatusCodes } from "http-status-codes";

// Mock the services
jest.mock("../../services/contributionService");
jest.mock("../../services/walletService");

// Create a test Express app
const app = express();
app.use(express.json());
app.post("/contributions", createContribution);
app.get("/contributions", getContributionDetails);
app.get("/contributions/history", getContributionHistory);

// Mock user ID for the tests
const mockUserId = "mockUserId";

// Middleware to mock user ID
app.use((req: Request & { user?: { userId: string } }, res: Response, next) => {
  req.user = { userId: mockUserId }; // Assign mock userId
  next();
});

describe("Contribution Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createContribution", () => {
    test("should create a new contribution successfully", async () => {
      const mockWallet = { _id: "mockWalletId", balance: 500 };
      const mockContribution = { _id: "mockContributionId", balance: 200 };

      (findWalletService as jest.Mock).mockResolvedValue(mockWallet);
      (calculateNextContributionDate as jest.Mock).mockReturnValue(new Date());
      (findContributionService as jest.Mock).mockResolvedValue(mockContribution);
      (createContributionService as jest.Mock).mockResolvedValue(mockContribution);
      (updateWalletService as jest.Mock).mockResolvedValue({ balance: 300 });
      (createContributionHistoryService as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post("/contributions")
        .send({ contributionPlan: "Monthly", amount: 100 });

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body.message).toBe("Contribution created successfully");
      expect(findWalletService).toHaveBeenCalledWith({ user: mockUserId });
      expect(updateWalletService).toHaveBeenCalledWith(mockWallet._id, {
        balance: mockWallet.balance - 100,
      });
      expect(createContributionService).toHaveBeenCalled();
    });

    test("should return an error if wallet not found", async () => {
      (findWalletService as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post("/contributions")
        .send({ contributionPlan: "Monthly", amount: 100 });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe("Wallet not found");
    });

    test("should return an error if wallet balance is insufficient", async () => {
      const mockWallet = { _id: "mockWalletId", balance: 50 };

      (findWalletService as jest.Mock).mockResolvedValue(mockWallet);

      const response = await request(app)
        .post("/contributions")
        .send({ contributionPlan: "Monthly", amount: 100 });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe("Insufficient funds in the wallet");
    });

    test("should return an error if there's an internal server error", async () => {
      (findWalletService as jest.Mock).mockRejectedValue(new Error("Server error"));

      const response = await request(app)
        .post("/contributions")
        .send({ contributionPlan: "Monthly", amount: 100 });

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe("Server error");
    });
  });

  describe("getContributionDetails", () => {
    test("should return contribution details successfully", async () => {
      const mockContribution = {
        balance: 500,
        nextContributionDate: new Date(),
      };

      (findContributionService as jest.Mock).mockResolvedValue(mockContribution);

      const response = await request(app).get("/contributions");

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.balance).toBe(mockContribution.balance);
      expect(findContributionService).toHaveBeenCalledWith({ user: mockUserId });
    });

    test("should return default values if no contribution exists", async () => {
      (findContributionService as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get("/contributions");

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.balance).toBe(0);
      expect(response.body.nextContributionDate).toBeNull();
    });

    test("should return an internal server error if fetching contribution fails", async () => {
      (findContributionService as jest.Mock).mockRejectedValue(new Error("Server error"));

      const response = await request(app).get("/contributions");

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe(
        "An unexpected error occurred while fetching contribution details."
      );
    });
  });

  describe("getContributionHistory", () => {
    test("should return contribution history successfully", async () => {
      const mockHistory = [
        { amount: 100, status: "Completed" },
        { amount: 200, status: "Pending" },
      ];

      (findContributionHistoryService as jest.Mock).mockResolvedValue(mockHistory);

      const response = await request(app).get("/contributions/history");

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockHistory);
      expect(findContributionHistoryService).toHaveBeenCalledWith(mockUserId);
    });

    test("should return an empty array if no history is found", async () => {
      (findContributionHistoryService as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get("/contributions/history");

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual([]);
    });

    test("should return an internal server error if fetching history fails", async () => {
      (findContributionHistoryService as jest.Mock).mockRejectedValue(new Error("Server error"));

      const response = await request(app).get("/contributions/history");

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe("Server error");
    });
  });
});
