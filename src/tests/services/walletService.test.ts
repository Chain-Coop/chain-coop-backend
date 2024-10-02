import {
    createWalletService,
    createPin,
    findWalletService,
    updateWalletService,
    createWalletHistoryService,
    findWalletHistoryService,
    findSingleWalletHistoryService,
    verifyBankDetailsService,
    validateWalletPin,
  } from "../../services/walletService";
  import Wallet from "../../models/wallet";
  import WalletHistory from "../../models/walletHistory";
  import axios from "axios";
  import { BadRequestError } from "../../errors";
  import bcrypt from "bcryptjs";
  
  jest.mock("../../models/wallet"); // Mock the Wallet model
  jest.mock("../../models/walletHistory"); // Mock the WalletHistory model
  jest.mock("axios"); // Mock axios for bank verification
  jest.mock("bcryptjs"); // Mock bcrypt for pin validation
  
  describe("Wallet Service", () => {
    const userId = "user_12345";
    const walletId = "wallet_12345";
  
    // Create a mock function for the save method
    const mockSave = jest.fn();
  
    const mockWallet = {
      _id: walletId,
      user: userId,
      pin: "hashedPin",
      isPinCreated: false,
      save: mockSave, // Include the save method in the mock
    };
  
    const mockWalletHistory = {
      amount: 1000,
      label: "Deposit",
      type: "credit",
      ref: "ref_12345",
      user: userId,
    };
  
    afterEach(() => {
      jest.clearAllMocks(); // Clear mocks after each test
    });
  
    describe("createWalletService", () => {
      it("should create a wallet with given payload", async () => {
        (Wallet.create as jest.Mock).mockResolvedValueOnce(mockWallet);
  
        const result = await createWalletService({ user: userId });
  
        expect(result).toEqual(mockWallet); // Validate the created wallet
        expect(Wallet.create).toHaveBeenCalledWith({ user: userId }); // Check create call
      });
    });
  
    describe("createPin", () => {
      it("should create a pin for the wallet", async () => {
        const payload = { pin: "1234" };
        (Wallet.findOne as jest.Mock).mockResolvedValueOnce(mockWallet);
  
        await createPin(walletId, payload);
  
        expect(Wallet.findOne).toHaveBeenCalledWith({ _id: walletId }); // Check find call
        expect(mockWallet.pin).toBe(payload.pin); // Validate pin is set
        expect(mockWallet.isPinCreated).toBe(true); // Validate pin creation status
        expect(mockSave).toHaveBeenCalled(); // Ensure save was called
      });
  
      it("should throw an error if wallet not found", async () => {
        (Wallet.findOne as jest.Mock).mockResolvedValueOnce(null);
  
        await expect(createPin(walletId, { pin: "1234" })).rejects.toThrow(BadRequestError); // Check for error
      });
    });
  
    describe("findWalletService", () => {
      it("should find a wallet with the given payload", async () => {
        (Wallet.findOne as jest.Mock).mockResolvedValueOnce(mockWallet);
  
        const result = await findWalletService({ user: userId });
  
        expect(result).toEqual(mockWallet); // Validate the found wallet
        expect(Wallet.findOne).toHaveBeenCalledWith({ user: userId }); // Check find call
      });
    });
  
    describe("updateWalletService", () => {
      it("should update a wallet with given payload", async () => {
        const updatePayload = { balance: 500 };
        (Wallet.findOneAndUpdate as jest.Mock).mockResolvedValueOnce(mockWallet);
  
        const result = await updateWalletService(walletId, updatePayload);
  
        expect(result).toEqual(mockWallet); // Validate the updated wallet
        expect(Wallet.findOneAndUpdate).toHaveBeenCalledWith({ _id: walletId }, updatePayload, { new: true, runValidators: true }); // Check update call
      });
    });
  
    describe("createWalletHistoryService", () => {
      it("should create a wallet history entry", async () => {
        (WalletHistory.create as jest.Mock).mockResolvedValueOnce(mockWalletHistory);
  
        const result = await createWalletHistoryService(mockWalletHistory);
  
        expect(result).toEqual(mockWalletHistory); // Validate the created history
        expect(WalletHistory.create).toHaveBeenCalledWith(mockWalletHistory); // Check create call
      });
    });
  
    describe("findWalletHistoryService", () => {
      it("should find wallet history entries with the given payload", async () => {
        (WalletHistory.find as jest.Mock).mockResolvedValueOnce([mockWalletHistory]);
  
        const result = await findWalletHistoryService({ user: userId });
  
        expect(result).toEqual([mockWalletHistory]); // Validate the found history
        expect(WalletHistory.find).toHaveBeenCalledWith({ user: userId }); // Check find call
      });
    });
  
    describe("findSingleWalletHistoryService", () => {
      it("should find a single wallet history entry with the given payload", async () => {
        (WalletHistory.findOne as jest.Mock).mockResolvedValueOnce(mockWalletHistory);
  
        const result = await findSingleWalletHistoryService({ ref: "ref_12345" });
  
        expect(result).toEqual(mockWalletHistory); // Validate the found history entry
        expect(WalletHistory.findOne).toHaveBeenCalledWith({ ref: "ref_12345" }); // Check findOne call
      });
    });
  
    describe("verifyBankDetailsService", () => {
      it("should verify bank details", async () => {
        const accountNumber = "1234567890";
        const bankCode = "000001";
        const mockResponse = { data: { status: true } };
  
        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);
  
        const result = await verifyBankDetailsService(accountNumber, bankCode);
  
        expect(result).toEqual(mockResponse.data); // Validate the response
        expect(axios.get).toHaveBeenCalledWith("https://api.paystack.co/bank/resolve", {
          params: { account_number: accountNumber, bank_code: bankCode },
          headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        }); // Check axios get call
      });
  
      it("should throw an error if bank verification fails", async () => {
        (axios.get as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));
  
        await expect(verifyBankDetailsService("1234567890", "000001")).rejects.toThrow(BadRequestError); // Check for error
      });
    });
  
    describe("validateWalletPin", () => {
      it("should validate the wallet pin", async () => {
        const pin = "1234";
        (Wallet.findOne as jest.Mock).mockResolvedValueOnce(mockWallet);
        (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
  
        const result = await validateWalletPin(userId, pin);
  
        expect(result).toBe(true); // Validate pin match
        expect(Wallet.findOne).toHaveBeenCalledWith({ user: userId }); // Check find call
        expect(bcrypt.compare).toHaveBeenCalledWith(pin, mockWallet.pin); // Check bcrypt compare call
      });
  
      it("should throw an error if wallet not found", async () => {
        (Wallet.findOne as jest.Mock).mockResolvedValueOnce(null);
  
        await expect(validateWalletPin(userId, "1234")).rejects.toThrow(BadRequestError); // Check for error
      });
  
      it("should throw an error if pin is not set", async () => {
        (Wallet.findOne as jest.Mock).mockResolvedValueOnce({ user: userId, pin: null });
  
        await expect(validateWalletPin(userId, "1234")).rejects.toThrow(BadRequestError); // Check for error
      });
    });
  });
  