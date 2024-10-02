import axios from "axios";
import { createPaystackSubscription, getPlanIdForMembershipType } from "../../services/paystackService";
import { BadRequestError, InternalServerError } from "../../errors";

jest.mock("axios"); // Mock axios

describe("Paystack Service", () => {
  const mockEmail = "test@example.com";
  const mockPlanId = "plan_12345";
  const mockAuthorizationUrl = "https://paystack.com/authorize";

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  describe("createPaystackSubscription", () => {
    it("should create a subscription and return the authorization URL", async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          data: {
            authorization_url: mockAuthorizationUrl,
          },
        },
      });

      const result = await createPaystackSubscription(mockEmail, mockPlanId);

      expect(result).toBe(mockAuthorizationUrl); // Validate the returned URL
      expect(axios.post).toHaveBeenCalledWith(
        "https://api.paystack.co/subscription",
        {
          email: mockEmail,
          plan: mockPlanId,
        },
        {
          headers: {
            Authorization: expect.stringContaining("Bearer"),
            "Content-Type": "application/json",
          },
        }
      ); // Ensure axios.post was called with correct parameters
    });

    it("should throw an InternalServerError if Paystack secret key is not defined", async () => {
      process.env.PAYSTACK_KEY = ""; // Clear the secret key

      await expect(createPaystackSubscription(mockEmail, mockPlanId)).rejects.toThrow(InternalServerError);
      await expect(createPaystackSubscription(mockEmail, mockPlanId)).rejects.toThrow("Paystack secret key is not defined."); // Validate error message
    });

    it("should throw a BadRequestError if the response is invalid", async () => {
      (axios.post as jest.Mock).mockResolvedValue({ data: {} }); // Mock an invalid response

      await expect(createPaystackSubscription(mockEmail, mockPlanId)).rejects.toThrow(BadRequestError);
      await expect(createPaystackSubscription(mockEmail, mockPlanId)).rejects.toThrow("Failed to create Paystack subscription due to an unexpected response."); // Validate error message
    });

    it("should throw a BadRequestError if Paystack returns an error", async () => {
      (axios.post as jest.Mock).mockRejectedValue({
        response: {
          data: {
            message: "Plan not found",
          },
        },
      });

      await expect(createPaystackSubscription(mockEmail, mockPlanId)).rejects.toThrow(BadRequestError);
      await expect(createPaystackSubscription(mockEmail, mockPlanId)).rejects.toThrow("Paystack error: Plan not found"); // Validate error message
    });

    it("should throw an InternalServerError if no response is received", async () => {
      (axios.post as jest.Mock).mockRejectedValue({ request: {} }); // Mock no response case

      await expect(createPaystackSubscription(mockEmail, mockPlanId)).rejects.toThrow(InternalServerError);
      await expect(createPaystackSubscription(mockEmail, mockPlanId)).rejects.toThrow("No response received from Paystack."); // Validate error message
    });

    it("should throw an InternalServerError for any other error", async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error("Network Error")); // Mock network error

      await expect(createPaystackSubscription(mockEmail, mockPlanId)).rejects.toThrow(InternalServerError);
      await expect(createPaystackSubscription(mockEmail, mockPlanId)).rejects.toThrow("Error creating Paystack subscription: Network Error"); // Validate error message
    });
  });

  describe("getPlanIdForMembershipType", () => {
    it("should return the correct plan ID for a valid membership type", () => {
      process.env.PAYSTACK_EXPLORER_PLAN_ID = "explorer_plan_id";
      const result = getPlanIdForMembershipType("Explorer");
      expect(result).toBe("explorer_plan_id"); // Validate the returned plan ID
    });

    it("should return undefined for an invalid membership type", () => {
      const result = getPlanIdForMembershipType("InvalidType" as any);
      expect(result).toBeUndefined(); // Validate that it returns undefined
    });
  });
});
