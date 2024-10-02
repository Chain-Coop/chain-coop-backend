import request from "supertest";
import express, { Request, Response } from "express";
import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { getAllBanks, verifyBankAccount } from "../../controllers/bankController";

// Mocking axios
jest.mock("axios");

// Create a test Express app
const app = express();
app.use(express.json());
app.get("/banks", getAllBanks);
app.post("/verify-account", verifyBankAccount);

// Mock Paystack secret key
process.env.PAYSTACK_KEY = "test_paystack_key";

// Tests for getAllBanks
describe("Paystack Controller - getAllBanks", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve all banks successfully", async () => {
    const mockBanks = [
      { name: "Bank A", code: "001" },
      { name: "Bank B", code: "002" },
    ];

    // Mock axios response
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        data: mockBanks,
      },
    });

    const response = await request(app).get("/banks");

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.message).toBe("Banks retrieved successfully");
    expect(response.body.banks).toEqual(mockBanks);
    expect(axios.get).toHaveBeenCalledWith("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer test_paystack_key`,
      },
    });
  });

  test("should return error if Paystack API fails", async () => {
    // Mock axios to throw an error
    (axios.get as jest.Mock).mockRejectedValue(new Error("Paystack error"));

    const response = await request(app).get("/banks");

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.message).toBe("Failed to retrieve banks");
    expect(response.body.error).toBe("Paystack error");
  });
});

// Tests for verifyBankAccount
describe("Paystack Controller - verifyBankAccount", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should verify bank account successfully", async () => {
    const mockAccountDetails = {
      account_name: "John Doe",
      account_number: "1234567890",
      bank_id: 1,
    };

    // Mock axios response
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        data: mockAccountDetails,
      },
    });

    const response = await request(app)
      .post("/verify-account")
      .send({ accountNumber: "1234567890", bankCode: "001" });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.message).toBe("Bank account verified successfully");
    expect(response.body.accountDetails).toEqual(mockAccountDetails);
    expect(axios.get).toHaveBeenCalledWith("https://api.paystack.co/bank/resolve", {
      params: {
        account_number: "1234567890",
        bank_code: "001",
      },
      headers: {
        Authorization: `Bearer test_paystack_key`,
      },
    });
  });

  test("should return error if accountNumber or bankCode is missing", async () => {
    const response = await request(app)
      .post("/verify-account")
      .send({ accountNumber: "", bankCode: "" });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body.message).toBe("Account number and bank code are required");
  });

  test("should return error if Paystack API fails", async () => {
    // Mock axios to throw an error
    (axios.get as jest.Mock).mockRejectedValue(new Error("Paystack error"));

    const response = await request(app)
      .post("/verify-account")
      .send({ accountNumber: "1234567890", bankCode: "001" });

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.message).toBe("Failed to verify bank account");
    expect(response.body.error).toBe("Paystack error");
  });

  test("should return error if Paystack API returns no account details", async () => {
    // Mock axios response with no account details
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        data: null,
      },
    });

    const response = await request(app)
      .post("/verify-account")
      .send({ accountNumber: "1234567890", bankCode: "001" });

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.message).toBe("Invalid bank details");
  });
});
