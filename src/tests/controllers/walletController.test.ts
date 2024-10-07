import request from 'supertest';
import express, { Request, Response } from 'express';
import {
  initiatePayment,
  verifyPayment,
  getWalletBalance,
  getWalletHistory,
  setWalletPin,
  uploadReceipt,
  collectBankDetails,
  verifyBankDetails,
  fundWallet,
} from '../../controllers/walletController';
import {
  findWalletService,
  updateWalletService,
  createWalletService,
  createWalletHistoryService,
  verifyBankDetailsService,
  findWalletHistoryService,
  findSingleWalletHistoryService,
  createPin,
} from '../../services/walletService';
import { findUser } from '../../services/authService';
import { sendEmail } from '../../utils/sendEmail';
import uploadImageFile from '../../utils/imageUploader';
import { BadRequestError } from '../../errors';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcryptjs';
import axios from 'axios';

// Mock all external services
jest.mock('../../services/walletService');
jest.mock('../../services/authService');
jest.mock('../../utils/imageUploader');
jest.mock('bcryptjs');
jest.mock('axios');

// Create a test Express app
const app = express();
app.use(express.json());

// Middleware to mock authenticated user
app.use((req: Request, res: Response, next) => {
  // Extend the Request interface to include 'user'
  (req as any).user = { userId: 'mockUserId', email: 'test@example.com' };
  next();
});

// Define routes for testing
app.post('/wallet/initiate-payment', initiatePayment);
app.post('/wallet/verify-payment', verifyPayment);
app.get('/wallet/balance', getWalletBalance);
app.get('/wallet/history', getWalletHistory);
app.post('/wallet/set-pin', setWalletPin);
app.post('/wallet/upload-receipt', uploadReceipt);
app.post('/wallet/collect-bank-details', collectBankDetails);
app.post('/wallet/verify-bank-details', verifyBankDetails);
app.post('/wallet/fund', fundWallet);

describe('Wallet Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test for initiating a payment
  // This test ensures that a payment is initiated successfully with valid inputs.
  describe('initiatePayment', () => {
    test('should initiate payment successfully', async () => {
      const mockPaymentUrl = 'https://paystack.com/pay/mock-payment';
      (axios.post as jest.Mock).mockResolvedValue({
        data: { data: { authorization_url: mockPaymentUrl } },
      });

      const response = await request(app)
        .post('/wallet/initiate-payment')
        .send({ amount: 5000 });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.message).toBe('Payment initiated successfully');
      expect(response.body.paymentUrl).toBe(mockPaymentUrl);
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.paystack.co/transaction/initialize',
        {
          email: 'test@example.com',
          amount: 5000,
          callback_url: 'http://localhost:5173/dashboard/wallet/fund_wallet/verify_transaction',
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );
    });

    // Test for missing amount or email
    // This test checks if the controller returns an error when amount or email is missing.
    test('should return error if amount or email is missing', async () => {
      const response = await request(app)
        .post('/wallet/initiate-payment')
        .send({ amount: 5000 }); // Missing email handled by middleware

      // Since email is mocked, we focus on amount
      // If amount is missing
      const responseMissingAmount = await request(app)
        .post('/wallet/initiate-payment')
        .send({});

      expect(responseMissingAmount.status).toBe(StatusCodes.BAD_REQUEST);
      expect(responseMissingAmount.body.error).toBe('Amount and email are required');
    });

    // Test for Paystack API failure
    // This test ensures that the controller handles Paystack API failures gracefully.
    test('should handle Paystack API failure', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('Paystack API error'));

      const response = await request(app)
        .post('/wallet/initiate-payment')
        .send({ amount: 5000 });

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toBe('Failed to initiate payment');
      expect(response.body.error).toBe('Paystack API error');
    });
  });

  // Test for verifying a payment
  // This test ensures that a payment is verified successfully with a valid reference.
  describe('verifyPayment', () => {
    test('should verify payment successfully and credit wallet', async () => {
      const mockReference = 'mockRef123';
      const mockPaymentData = {
        status: 'success',
        amount: 5000,
        customer: { email: 'test@example.com' },
      };

      (findSingleWalletHistoryService as jest.Mock).mockResolvedValue(null);
      (axios.get as jest.Mock).mockResolvedValue({ data: { data: mockPaymentData } });
      (findUser as jest.Mock).mockResolvedValue({ id: 'mockUserId', email: 'test@example.com' });
      (findWalletService as jest.Mock).mockResolvedValue({ _id: 'walletId', balance: 1000 });
      (updateWalletService as jest.Mock).mockResolvedValue({ balance: 6000 });
      (createWalletHistoryService as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/wallet/verify-payment')
        .send({ reference: mockReference });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.message).toBe('Payment verified and wallet topped up successfully');
      expect(response.body.updatedBalance).toBe(6000);
      expect(findSingleWalletHistoryService).toHaveBeenCalledWith({ ref: mockReference });
      expect(axios.get).toHaveBeenCalledWith(
        `https://api.paystack.co/transaction/verify/${mockReference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );
      expect(findUser).toHaveBeenCalledWith('email', 'test@example.com');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(updateWalletService).toHaveBeenCalledWith('walletId', { balance: 6000 });
      expect(createWalletHistoryService).toHaveBeenCalledWith({
        amount: 5000,
        label: 'Wallet top up via Paystack',
        ref: mockReference,
        type: 'credit',
        user: 'mockUserId',
      });
    });

    // Test for already verified payment
    // This test checks if the controller returns an error when a payment has already been verified.
    test('should return error if payment is already verified', async () => {
      const mockReference = 'mockRef123';
      (findSingleWalletHistoryService as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/wallet/verify-payment')
        .send({ reference: mockReference });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Payment already verified');
      expect(findSingleWalletHistoryService).toHaveBeenCalledWith({ ref: mockReference });
      expect(axios.get).not.toHaveBeenCalled();
    });

    // Test for missing reference
    // This test ensures that the controller returns an error when the payment reference is missing.
    test('should return error if payment reference is missing', async () => {
      const response = await request(app)
        .post('/wallet/verify-payment')
        .send({});

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Payment reference is required');
    });

    // Test for Paystack API failure during verification
    // This test ensures that the controller handles Paystack API failures during payment verification.
    test('should handle Paystack API failure during verification', async () => {
      const mockReference = 'mockRef123';
      (findSingleWalletHistoryService as jest.Mock).mockResolvedValue(null);
      (axios.get as jest.Mock).mockRejectedValue(new Error('Paystack API error'));

      const response = await request(app)
        .post('/wallet/verify-payment')
        .send({ reference: mockReference });

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toBe('Failed to verify payment');
      expect(response.body.error).toBe('Paystack API error');
    });

    // Test for user not found during verification
    // This test checks if the controller returns an error when the user associated with the payment is not found.
    test('should return error if user not found during verification', async () => {
      const mockReference = 'mockRef123';
      const mockPaymentData = {
        status: 'success',
        amount: 5000,
        customer: { email: 'nonexistent@example.com' },
      };

      (findSingleWalletHistoryService as jest.Mock).mockResolvedValue(null);
      (axios.get as jest.Mock).mockResolvedValue({ data: { data: mockPaymentData } });
      (findUser as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/wallet/verify-payment')
        .send({ reference: mockReference });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('user not found');
      expect(findUser).toHaveBeenCalledWith('email', 'nonexistent@example.com');
    });
  });

  // Test for getting wallet balance
  // This test ensures that the user's wallet balance is retrieved successfully.
  describe('getWalletBalance', () => {
    test('should return wallet balance successfully', async () => {
      const mockWallet = { balance: 5000 };
      (findWalletService as jest.Mock).mockResolvedValue(mockWallet);

      const response = await request(app).get('/wallet/balance');

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockWallet);
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
    });

    // Test for invalid token (wallet not found)
    // This test checks if the controller returns an error when the wallet is not found.
    test('should return error if wallet not found', async () => {
      (findWalletService as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/wallet/balance');

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Invalid token');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
    });
  });

  // Test for getting wallet history
  // This test ensures that the user's wallet transaction history is retrieved successfully.
  describe('getWalletHistory', () => {
    test('should return wallet history successfully', async () => {
      const mockHistory = [
        { amount: 5000, label: 'Wallet top up via Paystack', ref: 'ref123', type: 'credit', user: 'mockUserId' },
        { amount: 2000, label: 'Purchase', ref: 'ref124', type: 'debit', user: 'mockUserId' },
      ];
      (findWalletHistoryService as jest.Mock).mockResolvedValue(mockHistory);

      const response = await request(app).get('/wallet/history');

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual(mockHistory);
      expect(findWalletHistoryService).toHaveBeenCalledWith({ user: 'mockUserId' });
    });
  });

  // Test for setting wallet PIN
  // This test ensures that a wallet PIN is set successfully.
  describe('setWalletPin', () => {
    test('should set wallet PIN successfully', async () => {
      const mockWallet = { _id: 'walletId', isPinCreated: false };
      (findWalletService as jest.Mock).mockResolvedValue(mockWallet);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPin');
      (createPin as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post('/wallet/set-pin').send({ pin: '1234' });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.msg).toBe('Pin created successfully');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('1234', 'salt');
      expect(createPin).toHaveBeenCalledWith('walletId', { pin: '1234' });
    });

    // Test for wallet not existing
    // This test checks if the controller returns an error when the wallet does not exist.
    test('should return error if wallet does not exist', async () => {
      (findWalletService as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post('/wallet/set-pin').send({ pin: '1234' });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Wallet does not exist');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(createPin).not.toHaveBeenCalled();
    });

    // Test for already created PIN
    // This test ensures that the controller returns an error if the user has already created a PIN.
    test('should return error if PIN is already created', async () => {
      const mockWallet = { _id: 'walletId', isPinCreated: true };
      (findWalletService as jest.Mock).mockResolvedValue(mockWallet);

      const response = await request(app).post('/wallet/set-pin').send({ pin: '1234' });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('You have created a pin already');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(createPin).not.toHaveBeenCalled();
    });
  });

  // Test for uploading a receipt
  // This test ensures that a receipt is uploaded successfully.
  describe('uploadReceipt', () => {
    test('should upload receipt successfully', async () => {
      const mockUploadedFile = { secure_url: 'http://mock-url.com/receipt.png' };
      (uploadImageFile as jest.Mock).mockResolvedValue(mockUploadedFile);

      const response = await request(app)
        .post('/wallet/upload-receipt')
        .attach('receipt', Buffer.from('dummy'), 'receipt.png');

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body.msg).toBe('Receipt uploaded successfully');
      expect(response.body.file).toEqual(mockUploadedFile);
      expect(uploadImageFile).toHaveBeenCalledWith(expect.anything(), 'receipt', 'image');
    });

    // Test for upload failure
    // This test checks if the controller handles upload failures gracefully.
    test('should handle upload failure', async () => {
      (uploadImageFile as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      const response = await request(app)
        .post('/wallet/upload-receipt')
        .attach('receipt', Buffer.from('dummy'), 'receipt.png');

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Upload failed');
      expect(uploadImageFile).toHaveBeenCalledWith(expect.anything(), 'receipt', 'image');
    });
  });

  // Test for collecting bank details
  // This test ensures that bank details are collected or updated successfully.
  describe('collectBankDetails', () => {
    test('should collect or update bank details successfully', async () => {
      (findWalletService as jest.Mock).mockResolvedValue(null);
      (createWalletService as jest.Mock).mockResolvedValue(null);
      (updateWalletService as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/wallet/collect-bank-details')
        .send({ accountNumber: '1234567890', bankCode: '001' });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.msg).toBe('Bank details updated successfully');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(createWalletService).toHaveBeenCalledWith({
        user: 'mockUserId',
        balance: 0,
        isPinCreated: false,
        bankDetails: { accountNumber: '1234567890', bankCode: '001' },
      });
    });

    // Test for updating existing bank details
    // This test checks if existing bank details are updated successfully.
    test('should update existing bank details successfully', async () => {
      const mockWallet = { _id: 'walletId', bankDetails: { accountNumber: '0987654321', bankCode: '002' } };
      (findWalletService as jest.Mock).mockResolvedValue(mockWallet);
      (updateWalletService as jest.Mock).mockResolvedValue(mockWallet);

      const response = await request(app)
        .post('/wallet/collect-bank-details')
        .send({ accountNumber: '1234567890', bankCode: '001' });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.msg).toBe('Bank details updated successfully');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(updateWalletService).toHaveBeenCalledWith('walletId', {
        bankDetails: { accountNumber: '1234567890', bankCode: '001' },
      });
    });
  });

  // Test for verifying bank details
  // This test ensures that bank details are verified successfully.
  describe('verifyBankDetails', () => {
    test('should verify bank details successfully', async () => {
      const mockVerificationResult = { verified: true };
      (verifyBankDetailsService as jest.Mock).mockResolvedValue(mockVerificationResult);

      const response = await request(app)
        .post('/wallet/verify-bank-details')
        .send({ accountNumber: '1234567890', bankCode: '001' });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.msg).toBe('Bank details verified');
      expect(response.body.result).toEqual(mockVerificationResult);
      expect(verifyBankDetailsService).toHaveBeenCalledWith('1234567890', '001');
    });

    // Test for verification failure
    // This test checks if the controller handles verification failures appropriately.
    test('should handle verification failure', async () => {
      (verifyBankDetailsService as jest.Mock).mockRejectedValue(new Error('Verification failed'));

      const response = await request(app)
        .post('/wallet/verify-bank-details')
        .send({ accountNumber: '1234567890', bankCode: '001' });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Verification failed');
      expect(verifyBankDetailsService).toHaveBeenCalledWith('1234567890', '001');
    });
  });

  // Test for funding the wallet
  // This test ensures that the wallet is funded successfully with a valid amount.
  describe('fundWallet', () => {
    test('should fund wallet successfully', async () => {
      const mockWallet = { _id: 'walletId', balance: 1000 };
      (findWalletService as jest.Mock).mockResolvedValue(mockWallet);
      (updateWalletService as jest.Mock).mockResolvedValue({ balance: 6000 });

      const response = await request(app)
        .post('/wallet/fund')
        .send({ amount: 5000 });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.message).toBe('Wallet funded successfully');
      expect(response.body.newBalance).toBe(6000);
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(updateWalletService).toHaveBeenCalledWith('walletId', { balance: 6000 });
    });

    // Test for invalid amount
    // This test checks if the controller returns an error when the funding amount is invalid.
    test('should return error if amount is less than or equal to zero', async () => {
      const response = await request(app)
        .post('/wallet/fund')
        .send({ amount: 0 });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Amount must be greater than zero');
      expect(findWalletService).not.toHaveBeenCalled();
      expect(updateWalletService).not.toHaveBeenCalled();
    });

    // Test for wallet not found
    // This test ensures that the controller returns an error when the wallet is not found.
    test('should return error if wallet not found', async () => {
      (findWalletService as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/wallet/fund')
        .send({ amount: 5000 });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Wallet not found');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(updateWalletService).not.toHaveBeenCalled();
    });

    // Test for internal server error
    // This test checks if the controller handles internal server errors gracefully.
    test('should handle internal server error', async () => {
      (findWalletService as jest.Mock).mockRejectedValue(new Error('Server error'));

      const response = await request(app)
        .post('/wallet/fund')
        .send({ amount: 5000 });

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body.error).toBe('Server error');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
    });
  });
});
