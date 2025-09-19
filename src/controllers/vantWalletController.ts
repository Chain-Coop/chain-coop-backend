

import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, NotFoundError } from '../errors';
import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';
import { getUserDetails } from '../services/authService';
import VantServices, { TransferRequest } from '../services/vantWalletServices';
import { IVantWallet, VantTransaction } from '../models/vantWalletModel';
import mongoose from 'mongoose';
import Contribution from "../models/contribution";
import { findContributionService } from '../services/contributionService';
import { logFailedTransaction } from '../services/logs';

class VantController {
    /**
     * Create a reserved wallet
     * @route POST /api/vant/create-wallet
     */

    async createReservedWallet(req: Request, res: Response) {
        try {
            const { bvn, dob } = req.body;
            // @ts-ignore
            const userId = req.user.userId;

            if (!bvn || !dob) {
                throw new BadRequestError('All fields are required: bvn and dob');
            }

            if (!/^\d{11}$/.test(bvn)) {
                throw new BadRequestError('BVN must be 11 digits');
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
                throw new BadRequestError('Date of birth must be in YYYY-MM-DD format');
            }
            const user = await getUserDetails(userId);

            if (!user) {
            throw new NotFoundError('User not found');
            }
            if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
            throw new BadRequestError('Invalid email format');
            }
            if (!user.phoneNumber || !/^\+?\d{10,14}$/.test(user.phoneNumber)) {
            throw new BadRequestError('Invalid phone number format: Phone number must be in +234xxxxxxxxx format');
            };

            const existingWallet = await VantServices.getUserReservedWallet(userId);

            if (existingWallet) {
                throw new BadRequestError('User already has a reserved wallet');
            }

            // Generate new virtual account
            const data = await VantServices.generateReservedWallet(
                user!.email,
                user!.phoneNumber,
                bvn,
                dob
            );

            const wallet = await VantServices.createReservedWallet(
                userId,
                user!.email,
            );

            return res.status(StatusCodes.OK).json({
                success: true,
                message: data!.message,
                data: wallet,
            });
        } catch (error: any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to create wallet',
            });
        }
    }

    /**
     * Get user's reserved wallet
     * @route GET /api/vant/reserved-wallet
     */
    async getUserReservedWallet(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { userId, contributionId } = req.user.userId;

            const wallet = await VantServices.getUserReservedWallet(userId);
            const contribution = await Contribution.find({ user: userId });

            if (!wallet) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'No reserved wallet found for this user'
                });
            }

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Reserved wallet retrieved successfully',
                data: {
                    // @ts-ignore
                    contributionId: contribution._id,
                    walletName: wallet.walletName,
                    status: wallet.status,
                    accountName: wallet.accountNumbers[0].account_name,
                    accountNumber: wallet.accountNumbers[0].account_number,
                    bank: wallet.accountNumbers[0].bank,
                    walletBalance: wallet.walletBalance,
                    totalInwardTransfers: wallet.totalInwardTransfers,
                    totalOutwardTransfers: wallet.totalOutwardTransfers,
                    transactionCount: wallet.transactionCount,
                    lastTransactionDate: wallet.lastTransactionDate
                }
            });
        } catch (error: any) {
            return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to retrieve reserved wallet'
            });
        }
    }

    async getUserTransactions(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            const { page = 1, limit = 20, type } = req.query;

            const result = await VantServices.getWalletTransactions(
                userId,
                Number(page),
                Number(limit),
                type as 'inward' | 'outward'
            );

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Transactions retrieved successfully',
                data: result
            });
        } catch (error: any) {
            return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to retrieve transactions'
            });
        }
    }

    // Add method to get single transaction details
    async getTransactionDetailsByReference(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            const { reference } = req.params;

            const transaction = await VantTransaction.findOne({
                reference,
                userId: new mongoose.Types.ObjectId(userId)
            }).populate('walletId', 'walletName accountNumbers');

            if (!transaction) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Transaction details retrieved successfully',
                data: transaction
            });
        } catch (error: any) {
            return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to retrieve transaction details'
            });
        }
    }

    /**
     * Verify beneficiary account
     * @route POST /api/vant/verify-account
     */
    async verifyAccount(req: Request, res: Response) {
        try {
            const { account_number, bank_code } = req.body;

            if (!account_number || !bank_code) {
                throw new BadRequestError('Account number and bank code are required');
            }

            const accountDetails = await VantServices.verifyAccount(account_number, bank_code);

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Account verified successfully',
                data: accountDetails
            });
        } catch (error: any) {
            return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to verify account'
            });
        }
    }

    /**
     * Transfer funds
     * @route POST /api/vant/transfer
     */
    async transferFunds(req: Request, res: Response) {
        // @ts-ignore
        const userId = req.user.userId;
        let wallet: IVantWallet | null = null;
        let payload: TransferRequest | null = null;

        try {
            const { email, amount, account_number, bank_code, narration } = req.body;

            if (!amount || !account_number || !bank_code) {
                throw new BadRequestError('Amount, account number, and bank code are required');
            }

            if (amount <= 0) {
                throw new BadRequestError('Amount must be greater than zero');
            }

            wallet = await VantServices.getUserReservedWallet(userId);
            if (!wallet || wallet.status !== 'active') {
                throw new NotFoundError('No active wallet found');
            }

            const currentBalance = wallet.walletBalance;
            const user = await getUserDetails(userId);

            if (currentBalance < amount) {
                throw new BadRequestError('Insufficient wallet balance');
            }

            // First verify the account
            const accountDetails = await VantServices.verifyAccount(account_number, bank_code);
            const reference = uuidv4();

            payload = {
                reference: `PAY_${Date.now()}_${reference.slice(2, 12)}`,
                amount,
                account_number,
                name: `${user!.firstName} ${user!.lastName}`,
                bank_code,
                bank: accountDetails!.data!.bank,
                toSession: accountDetails!.data!.account!.id,
                toClient: accountDetails!.data!.clientId,
                toBvn: accountDetails!.data!.bvn,
                email,
                remark: narration || `Transfer to ${wallet!.walletName}`,
            };

            // Process transfer
            const transferResult = await VantServices.transferFunds(userId, payload, wallet);

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Transfer completed successfully',
                data: {
                    ...transferResult,
                    recipient_details: accountDetails
                }
            });
        } catch (error: any) {
            if (payload) {
                await logFailedTransaction({
                    type: 'withdrawal',
                    reference: payload.reference,
                    reason: error.message,
                    data: payload,
                    userId,
                    walletId: wallet?._id
                });
            }

            return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to process transfer'
            });
        }
    }
}

export default new VantController();
