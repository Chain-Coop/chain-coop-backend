import request from "supertest";
import express, { Request, Response } from "express";
import {
  activateMembership,
  getMembershipDetails,
} from "../../controllers/membershipController";
import {
  createMembershipService,
  findMembershipService,
} from "../../services/membershipService";
import {
  createPaystackSubscription,
  getPlanIdForMembershipType,
} from "../../services/paystackService";
import { StatusCodes } from "http-status-codes";
import uploadImageFile from "../../utils/imageUploader";

// Mock services
jest.mock("../../services/membershipService");
jest.mock("../../services/paystackService");
jest.mock("../../utils/imageUploader");

// Test express app
const app = express();
app.use(express.json());

// Mock routes
app.post("/membership/activate", activateMembership);
app.get("/membership/details", getMembershipDetails);

// Mock user ID middleware
const mockUserId = "mockUserId";
app.use((req: Request & { user?: { userId: string } }, res: Response, next) => {
  req.user = { userId: mockUserId };
  next();
});

describe("Membership Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("activateMembership", () => {
    test("should activate membership with bank transfer", async () => {
      const mockUploadedImage = { secure_url: "http://mock-url.com/receipt.png" };

      (uploadImageFile as jest.Mock).mockResolvedValue(mockUploadedImage);
      (createMembershipService as jest.Mock).mockResolvedValue({
        user: mockUserId,
        membershipType: "Explorer",
        paymentMethod: "BankTransfer",
        amount: 50000,
        status: "Pending",
        bankReceiptUrl: mockUploadedImage.secure_url,
        subscriptionUrl: null,
      });

      const response = await request(app)
        .post("/membership/activate")
        .send({
          membershipType: "Explorer",
          paymentMethod: "BankTransfer",
        })
        .attach("bankReceipt", Buffer.from("dummy"), "receipt.png");

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body.message).toBe("Membership activated successfully");
      expect(response.body.membership.bankReceiptUrl).toBe(mockUploadedImage.secure_url);
      expect(createMembershipService).toHaveBeenCalledWith(expect.objectContaining({
        user: mockUserId,
        membershipType: "Explorer",
        paymentMethod: "BankTransfer",
      }));
    });

    test("should activate membership with Paystack subscription", async () => {
      const mockSubscriptionUrl = "http://mock-url.com/subscription";

      (getPlanIdForMembershipType as jest.Mock).mockReturnValue("plan123");
      (createPaystackSubscription as jest.Mock).mockResolvedValue(mockSubscriptionUrl);
      (createMembershipService as jest.Mock).mockResolvedValue({
        user: mockUserId,
        membershipType: "Voyager",
        paymentMethod: "PaystackSubscription",
        amount: 250000,
        status: "Pending",
        bankReceiptUrl: null,
        subscriptionUrl: mockSubscriptionUrl,
      });

      const response = await request(app)
        .post("/membership/activate")
        .send({
          membershipType: "Voyager",
          paymentMethod: "PaystackSubscription",
        });

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body.message).toBe("Membership activated successfully");
      expect(response.body.membership.subscriptionUrl).toBe(mockSubscriptionUrl);
      expect(createMembershipService).toHaveBeenCalledWith(expect.objectContaining({
        user: mockUserId,
        membershipType: "Voyager",
        paymentMethod: "PaystackSubscription",
      }));
    });

    test("should return an error for invalid membership type", async () => {
      const response = await request(app).post("/membership/activate").send({
        membershipType: "InvalidType",
        paymentMethod: "BankTransfer",
      });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe("Invalid membership type.");
    });

    test("should return an error for missing bank receipt", async () => {
      const response = await request(app)
        .post("/membership/activate")
        .send({
          membershipType: "Explorer",
          paymentMethod: "BankTransfer",
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe("Please upload a bank receipt for verification.");
    });

    test("should return an error if user already has active membership", async () => {
      (findMembershipService as jest.Mock).mockResolvedValue({
        user: mockUserId,
        status: "Active",
      });

      const response = await request(app)
        .post("/membership/activate")
        .send({
          membershipType: "Pioneer",
          paymentMethod: "BankTransfer",
        });

      expect(response.status).toBe(StatusCodes.CONFLICT);
      expect(response.body.error).toBe("You already have an active membership.");
    });
  });

  describe("getMembershipDetails", () => {
    test("should return membership details successfully", async () => {
      const mockMembership = {
        membershipType: "Explorer",
        status: "Active",
        paymentMethod: "BankTransfer",
        bankReceiptUrl: "http://mock-url.com/receipt.png",
        activationDate: new Date(),
        amount: 50000,
        subscriptionUrl: null,
      };

      (findMembershipService as jest.Mock).mockResolvedValue(mockMembership);

      const response = await request(app).get("/membership/details");

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.membershipType).toBe(mockMembership.membershipType);
      expect(response.body.bankReceiptUrl).toBe(mockMembership.bankReceiptUrl);
      expect(findMembershipService).toHaveBeenCalledWith(mockUserId);
    });

    test("should return an error if no membership is found", async () => {
      (findMembershipService as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get("/membership/details");

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body.error).toBe("No membership found for this user.");
    });

    test("should return an internal server error", async () => {
      (findMembershipService as jest.Mock).mockRejectedValue(new Error("Server error"));

      const response = await request(app).get("/membership/details");

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toBe("An error occurred while fetching membership details");
    });
  });
});
