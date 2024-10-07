import request from 'supertest';
import express, { Request, Response } from 'express';
import {
  requestWithdrawal,
  updateWithdrawalStatusController,
  listAllWithdrawals,
} from '../../controllers/withdrawalController';
import {
  createWithdrawalRequest,
  updateWithdrawalStatus,
  findWithdrawalById,
  getAllWithdrawals,
} from '../../services/withdrawalService';
import {
  findWalletService,
  validateWalletPin,
} from '../../services/walletService';
import { findUser } from '../../services/authService';
import { sendEmail } from '../../utils/sendEmail';
import axios from 'axios';
import { BadRequestError, ForbiddenError } from '../../errors';
import { StatusCodes } from 'http-status-codes';

// Mock all external services
jest.mock('../../services/withdrawalService');
jest.mock('../../services/walletService');
jest.mock('../../services/authService');
jest.mock('../../utils/sendEmail');
jest.mock('axios');

// Create a test Express app
const app = express();
app.use(express.json());

// Middleware to mock authenticated user
app.use((req: Request, res: Response, next) => {
  // @ts-ignore
  req.user = { userId: 'mockUserId', email: 'user@example.com', isAdmin: false };
  next();
});

// Define routes for testing
app.post('/wallet/withdrawal', requestWithdrawal);
app.patch('/wallet/withdrawal/:withdrawalId/status', updateWithdrawalStatusController);
app.get('/wallet/withdrawals', listAllWithdrawals);

describe('Withdrawal Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test for requesting a withdrawal
  // This test ensures that a withdrawal request is created successfully with valid inputs.
  describe('requestWithdrawal', () => {
    test('should create a new withdrawal request successfully', async () => {
      (findWalletService as jest.Mock).mockResolvedValue({
        _id: 'walletId',
        balance: 10000,
        isPinCreated: true,
      });
      (validateWalletPin as jest.Mock).mockResolvedValue(true);
      (findUser as jest.Mock).mockResolvedValue({
        id: 'mockUserId',
        email: 'user@example.com',
      });
      (axios.get as jest.Mock).mockResolvedValue({
        data: { data: { account_number: '1234567890', bank_code: '001' } },
      });
      (createWithdrawalRequest as jest.Mock).mockResolvedValue({
        id: 'withdrawalId',
        userId: 'mockUserId',
        amount: 5000,
        accountNumber: '1234567890',
        bankCode: '001',
        status: 'Pending',
      });
      (sendEmail as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/wallet/withdrawal')
        .send({
          amount: 5000,
          accountNumber: '1234567890',
          bankCode: '001',
          pin: '1234',
        });

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body.message).toBe('Withdrawal request created successfully');
      expect(response.body.withdrawal).toEqual({
        id: 'withdrawalId',
        userId: 'mockUserId',
        amount: 5000,
        accountNumber: '1234567890',
        bankCode: '001',
        status: 'Pending',
      });
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(validateWalletPin).toHaveBeenCalledWith('mockUserId', '1234');
      expect(findUser).toHaveBeenCalledWith('email', 'user@example.com');
      expect(axios.get).toHaveBeenCalledWith('https://api.paystack.co/bank/resolve', {
        params: { account_number: '1234567890', bank_code: '001' },
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      });
      expect(createWithdrawalRequest).toHaveBeenCalledWith('mockUserId', 5000, {
        accountNumber: '1234567890',
        bankCode: '001',
      });
      expect(sendEmail).toHaveBeenCalled();
    });

    // Test for missing required fields
    // This test checks if the controller returns an error when required fields are missing.
    test('should return error if required fields are missing', async () => {
      const response = await request(app)
        .post('/wallet/withdrawal')
        .send({
          amount: 5000,
          accountNumber: '1234567890',
          // Missing bankCode and pin
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Amount, account number, bank code, and pin are required');
      expect(findWalletService).not.toHaveBeenCalled();
      expect(validateWalletPin).not.toHaveBeenCalled();
      expect(findUser).not.toHaveBeenCalled();
      expect(axios.get).not.toHaveBeenCalled();
      expect(createWithdrawalRequest).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    // Test for wallet not found
    // This test ensures that the controller returns an error when the user's wallet is not found.
    test('should return error if wallet is not found', async () => {
      (findWalletService as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/wallet/withdrawal')
        .send({
          amount: 5000,
          accountNumber: '1234567890',
          bankCode: '001',
          pin: '1234',
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Wallet not found.');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(validateWalletPin).not.toHaveBeenCalled();
      expect(findUser).not.toHaveBeenCalled();
      expect(axios.get).not.toHaveBeenCalled();
      expect(createWithdrawalRequest).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    // Test for PIN not set
    // This test checks if the controller returns an error when the wallet PIN is not set.
    test('should return error if wallet PIN is not set', async () => {
      (findWalletService as jest.Mock).mockResolvedValue({
        _id: 'walletId',
        balance: 10000,
        isPinCreated: false,
      });

      const response = await request(app)
        .post('/wallet/withdrawal')
        .send({
          amount: 5000,
          accountNumber: '1234567890',
          bankCode: '001',
          pin: '1234',
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Pin not set for the wallet.');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(validateWalletPin).not.toHaveBeenCalled();
      expect(findUser).not.toHaveBeenCalled();
      expect(axios.get).not.toHaveBeenCalled();
      expect(createWithdrawalRequest).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    // Test for invalid PIN
    // This test ensures that the controller returns an error when the provided PIN is invalid.
    test('should return error if wallet PIN is invalid', async () => {
      (findWalletService as jest.Mock).mockResolvedValue({
        _id: 'walletId',
        balance: 10000,
        isPinCreated: true,
      });
      (validateWalletPin as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/wallet/withdrawal')
        .send({
          amount: 5000,
          accountNumber: '1234567890',
          bankCode: '001',
          pin: 'wrongPin',
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Invalid wallet pin');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(validateWalletPin).toHaveBeenCalledWith('mockUserId', 'wrongPin');
      expect(findUser).not.toHaveBeenCalled();
      expect(axios.get).not.toHaveBeenCalled();
      expect(createWithdrawalRequest).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    // Test for invalid bank account details
    // This test checks if the controller returns an error when the bank account details are invalid.
    test('should return error if bank account details are invalid', async () => {
      (findWalletService as jest.Mock).mockResolvedValue({
        _id: 'walletId',
        balance: 10000,
        isPinCreated: true,
      });
      (validateWalletPin as jest.Mock).mockResolvedValue(true);
      (axios.get as jest.Mock).mockResolvedValue({
        data: { data: null }, // Invalid bank details
      });

      const response = await request(app)
        .post('/wallet/withdrawal')
        .send({
          amount: 5000,
          accountNumber: 'invalidAccount',
          bankCode: 'invalidCode',
          pin: '1234',
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Invalid bank account details');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(validateWalletPin).toHaveBeenCalledWith('mockUserId', '1234');
      expect(findUser).not.toHaveBeenCalled();
      expect(axios.get).toHaveBeenCalledWith('https://api.paystack.co/bank/resolve', {
        params: { account_number: 'invalidAccount', bank_code: 'invalidCode' },
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      });
      expect(createWithdrawalRequest).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    // Test for Paystack API failure
    // This test ensures that the controller handles Paystack API failures gracefully.
    test('should handle Paystack API failure', async () => {
      (findWalletService as jest.Mock).mockResolvedValue({
        _id: 'walletId',
        balance: 10000,
        isPinCreated: true,
      });
      (validateWalletPin as jest.Mock).mockResolvedValue(true);
      (axios.get as jest.Mock).mockRejectedValue(new Error('Paystack API error'));

      const response = await request(app)
        .post('/wallet/withdrawal')
        .send({
          amount: 5000,
          accountNumber: '1234567890',
          bankCode: '001',
          pin: '1234',
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Paystack API error');
      expect(findWalletService).toHaveBeenCalledWith({ user: 'mockUserId' });
      expect(validateWalletPin).toHaveBeenCalledWith('mockUserId', '1234');
      expect(findUser).not.toHaveBeenCalled();
      expect(axios.get).toHaveBeenCalledWith('https://api.paystack.co/bank/resolve', {
        params: { account_number: '1234567890', bank_code: '001' },
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      });
      expect(createWithdrawalRequest).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  // Test for updating withdrawal status
  // This test ensures that an admin can update the withdrawal status successfully.
  describe('updateWithdrawalStatusController', () => {
    test('should update withdrawal status successfully by admin', async () => {
      // Mock admin user
      (app.use as jest.Mock).mockImplementationOnce((req, res, next) => {
        // @ts-ignore
        req.user = { userId: 'adminUserId', isAdmin: true };
        next();
      });

      (findWithdrawalById as jest.Mock).mockResolvedValue({
        id: 'withdrawalId',
        status: 'Pending',
      });
      (updateWithdrawalStatus as jest.Mock).mockResolvedValue({
        id: 'withdrawalId',
        status: 'Completed',
      });

      const response = await request(app)
        .patch('/wallet/withdrawal/withdrawalId/status')
        .send({ status: 'completed' });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.message).toBe('Withdrawal status updated successfully');
      expect(response.body.updatedWithdrawal).toEqual({
        id: 'withdrawalId',
        status: 'Completed',
      });
      expect(findWithdrawalById).toHaveBeenCalledWith('withdrawalId');
      expect(updateWithdrawalStatus).toHaveBeenCalledWith('withdrawalId', 'completed');
    });

    // Test for unauthorized access
    // This test checks if the controller returns an error when a non-admin user attempts to update the withdrawal status.
    test('should return error if user is not admin', async () => {
      // Mock non-admin user
      (app.use as jest.Mock).mockImplementationOnce((req, res, next) => {
        // @ts-ignore
        req.user = { userId: 'regularUserId', isAdmin: false };
        next();
      });

      const response = await request(app)
        .patch('/wallet/withdrawal/withdrawalId/status')
        .send({ status: 'completed' });

      expect(response.status).toBe(StatusCodes.FORBIDDEN);
      expect(response.body.error).toBe('You are not authorized to perform this action');
      expect(findWithdrawalById).not.toHaveBeenCalled();
      expect(updateWithdrawalStatus).not.toHaveBeenCalled();
    });

    // Test for invalid status
    // This test ensures that the controller returns an error when an invalid status is provided.
    test('should return error for invalid status', async () => {
      // Mock admin user
      (app.use as jest.Mock).mockImplementationOnce((req, res, next) => {
        // @ts-ignore
        req.user = { userId: 'adminUserId', isAdmin: true };
        next();
      });

      const response = await request(app)
        .patch('/wallet/withdrawal/withdrawalId/status')
        .send({ status: 'invalidStatus' });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toBe('Invalid status. Status must be one of: pending, completed, failed');
      expect(findWithdrawalById).not.toHaveBeenCalled();
      expect(updateWithdrawalStatus).not.toHaveBeenCalled();
    });

    // Test for withdrawal not found
    // This test checks if the controller returns an error when the withdrawal request is not found.
    test('should return error if withdrawal not found', async () => {
      // Mock admin user
      (app.use as jest.Mock).mockImplementationOnce((req, res, next) => {
        // @ts-ignore
        req.user = { userId: 'adminUserId', isAdmin: true };
        next();
      });

      (findWithdrawalById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .patch('/wallet/withdrawal/nonexistentId/status')
        .send({ status: 'completed' });

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body.message).toBe('Withdrawal request not found');
      expect(findWithdrawalById).toHaveBeenCalledWith('nonexistentId');
      expect(updateWithdrawalStatus).not.toHaveBeenCalled();
    });
  });

  // Test for listing all withdrawals
  // This test ensures that all withdrawal requests are retrieved successfully.
  describe('listAllWithdrawals', () => {
    test('should list all withdrawals successfully', async () => {
      const mockWithdrawals = [
        { id: '1', userId: 'user1', amount: 5000, status: 'Pending' },
        { id: '2', userId: 'user2', amount: 10000, status: 'Completed' },
      ];
      (getAllWithdrawals as jest.Mock).mockResolvedValue(mockWithdrawals);

      const response = await request(app).get('/wallet/withdrawals');

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.message).toBe('Withdrawals retrieved successfully');
      expect(response.body.withdrawals).toEqual(mockWithdrawals);
      expect(getAllWithdrawals).toHaveBeenCalled();
    });

    // Test for internal server error
    // This test checks if the controller handles internal server errors gracefully.
    test('should handle internal server error', async () => {
      (getAllWithdrawals as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/wallet/withdrawals');

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toBe('Internal Server Error');
      expect(getAllWithdrawals).toHaveBeenCalled();
    });
  });
});
