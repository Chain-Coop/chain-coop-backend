

import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, NotFoundError } from '../errors';
import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';
import { getUserDetails } from '../services/authService';
import VantServices, { TransferRequest } from '../services/vantWalletServices';

class VantController {
    /**
     * Create a reserved wallet
     * @route POST /api/vant/reserved-wallet
     */
    async createReservedWallet(req: Request, res: Response) {
        try {
            const { bvn, dob } = req.body;
            // @ts-ignore
            const userId = req.user.userId;

            if (!bvn || !dob) {
                throw new BadRequestError('All fields are required: bvn, dob');
            }

            if (!/^\d{11}$/.test(bvn)) {
                throw new BadRequestError('BVN must be 11 digits');
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
                throw new BadRequestError('Date of birth must be in YYYY-MM-DD format');
            }

            const user = await getUserDetails(userId);
            // const bvn_result = await VantServices.verifyBvn(bvn);

            // if (user!.firstName.toLowerCase() != bvn_result!.first_name.toLowerCase() ||
            //     user!.lastName.toLowerCase() != bvn_result!.last_name.toLowerCase()) {
            //     throw new BadRequestError('Your first name and last name does not match the one on bvn!');
            // }

            // if (bvn_result!.date_of_birth != dob) {
            //     throw new BadRequestError('Your date of match does not match the one on bvn!');
            // }

            const existingWallet = await VantServices.getUserReservedWallet(userId);
            if (existingWallet) {
                throw new BadRequestError('User already has a reserved wallet');
            }

            console.log({email: user!.email,
                phoneNumber: user!.phoneNumber,
                bvn,
                dob})
            // Generate new virtual account
            const { data } = await VantServices.generateReservedWallet(
                user!.email,
                user!.phoneNumber,
                bvn,
                dob
            );

            console.log("DATA: ", data);
            

            console.log({userId,
                wallet_balance: data!.wallet_balance,});
            
            
            const wallet = await VantServices.createReservedWallet(
                userId,
                data!.wallet_balance,
            );
            console.log("WALLET: ", wallet);

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Wallet account has been successfully created',
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
            const userId = req.user.userId;

            const wallet = await VantServices.getUserReservedWallet(userId);

            if (!wallet) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'No reserved wallet found for this user'
                });
            }

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Reserved wallet retrieved successfully',
                data: wallet
            });
        } catch (error: any) {
            return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to retrieve reserved wallet'
            });
        }
    }

    /**
     * Get wallet balance
     * @route GET /api/vant/reserved-wallet/balance
     */
    async getWalletBalance(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId;

            const wallet = await VantServices.getUserReservedWallet(userId);

            if (!wallet || wallet!.status !== 'active') {
                throw new NotFoundError('No active reserved wallet found');
            }

            const balance = await VantServices.getWalletBalance(userId);

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Wallet balance retrieved successfully',
                data: balance || wallet!.walletBalance
            });

        } catch (error: any) {
            return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to retrieve wallet balance'
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
        try {
            const { email, amount, account_number, bank_code, narration } = req.body;
            // @ts-ignore
            const userId = req.user.userId;

            if (!amount || !account_number || !bank_code) {
                throw new BadRequestError('Amount, account number, and bank code are required');
            }

            if (amount <= 0) {
                throw new BadRequestError('Amount must be greater than zero');
            }

            const wallet = await VantServices.getUserReservedWallet(userId);

            if (!wallet || wallet.status !== 'active') {
                throw new BadRequestError('No active wallet found');
            }

            const currentBalance = await VantServices.getWalletBalance(userId);

            if (currentBalance < amount) {
                throw new BadRequestError('Insufficient wallet balance');
            }

            // First verify the account
            const accountDetails = await VantServices.verifyAccount(account_number, bank_code);
            const reference = uuidv4();

            // const bankCode = await VantServices.getBankCode()

            let payload: TransferRequest = {
                reference: `PAY_${Date.now()}_${reference.slice(2, 12)}`,
                amount,
                account_number,
                name: accountDetails!.data!.name,
                bank_code,
                bank: accountDetails!.data!.bank,
                toSession: accountDetails!.data!.account!.id,
                toClient: accountDetails!.data!.clientId,
                toBvn: accountDetails!.data!.bvn,
                email,
                remark: narration || `Transfer to ${accountDetails!.data!.name}`,
            };

            // Process transfer
            const transferResult = await VantServices.transferFunds(userId, payload);

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Transfer completed successfully',
                data: {
                    ...transferResult,
                    recipient_details: accountDetails
                }
            });
        } catch (error: any) {
            return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to process transfer'
            });
        }
    }

    /**
     * Get transfer history
     * @route GET /api/vant/transfer-history
     */
    async getAllTransactions(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            const { limit = 10, page = 1 } = req.query;

            const history = await VantServices.getAllTransactions(
                userId,
                parseInt(limit as string),
                parseInt(page as string)
            );

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Transfer history retrieved successfully',
                data: history
            });
        } catch (error: any) {
            return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to retrieve transfer history'
            });
        }
    }

    /**
     * Get supported banks
     * @route GET /api/vant/banks
     */
    async getBanks(req: Request, res: Response) {
        try {
            const banks = await VantServices.getBanks();

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Banks retrieved successfully',
                data: banks
            });
        } catch (error: any) {
            return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to retrieve banks'
            });
        }
    }

}

export default new VantController();
