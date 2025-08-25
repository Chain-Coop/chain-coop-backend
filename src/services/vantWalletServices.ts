import axios from 'axios';
import mongoose, { ObjectId } from 'mongoose';
import { BadRequestError, NotFoundError } from '../errors';
import { VantConfig } from '../../config/vant';
import { VantWallet, IVantWallet, VantTransaction } from '../models/vantWalletModel';
import { BANK_LIST } from '../utils/bankList';
import Contribution from "../models/contribution";
import { createContributionHistoryService } from './contributionService';
import Wallet from "../models/wallet"
import { logFailedTransaction } from './logs';

interface VerifyAccountResponse {
    status: string,
    message: string,
    data: {
        name: string,
        clientId: string,
        bvn: string,
        account: {
            id: string,
            number: string
        },
        status: string,
        currency: string,
        bank: string
    }
}

export interface TransferRequest {
    reference: string;
    amount: number;
    account_number: string;
    name: string;
    bank_code: string;
    bank: string;
    toSession?: string;
    toClient?: string;
    toBvn?: string;
    email: string;
    remark?: string;
}

interface TransferResponse {
    message: string;
    status: boolean;
    session_id: string;
    reference: string;
    amount: number;
}

// Add this interface for inward transfer data
interface InwardTransferData {
    reference: string;
    amount: number;
    account_number: string;
    originator_account_number: string;
    originator_account_name: string;
    originator_bank: string;
    originator_narration: string;
    status: string;
    meta: any,
    timestamp: string;
    sessionId: string;
}

// Add this interface for transaction logging
interface TransactionLog {
    reference: string;
    amount: number;
    type: 'inward' | 'outward';
    status: 'successful' | 'failed' | 'pending';
    account_number: string;
    originator_account_number?: string;
    originator_account_name?: string;
    originator_bank?: string;
    narration?: string;
    timestamp: Date;
    sessionId?: string;
}

class VantService {
    private axiosInstance: Axios.AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: VantConfig.baseURL,
            headers: {
                'X-VANT-KEY': VantConfig.secretKey,
                'Content-Type': 'application/json'
            },
        });
    }

    /**
     * Create a reserved wallet via Vant API
     * This is an asynchronous operation that will send a webhook notification
     */
    async generateReservedWallet(
        email: string,
        phone: string,
        bvn: string,
        dateOfBirth: string
    ) {
        try {
            const payload = {
                email,
                phone,
                bvn,
                date_of_birth: dateOfBirth
            };
            const { data }: any = await this.axiosInstance.post(
                '/client/create',
                payload
            );

            if (!data) {
                throw new NotFoundError('Failed to create reserved wallet!');
            }

            return data;
        } catch (error: any) {
            console.error(error.message);
            throw new Error(error.message);
        }
    }

    async createReservedWallet(
        userId: string, email: string,
    ): Promise<IVantWallet> {
        const account = new VantWallet({
            userId: new mongoose.Types.ObjectId(userId),
            email: email,
            walletBalance: 0,
            accountNumbers: [],
            status: 'pending',
        });

        return await account.save();
    }

    /**
     * Get reserved wallets for a user
     */
    async getUserReservedWallet(userId: string): Promise<IVantWallet | null> {
        return await VantWallet.findOne({
            userId: new mongoose.Types.ObjectId(userId)
        }).select('-accountNumbers._id');
    }

    /**
     * Get wallet balance and details
     */
    async getWalletBalance(accounNumber: string): Promise<any> {
        try {
            const { data }: any = await this.axiosInstance.post(
                '/client/enquire-wallet',
                accounNumber
            );

            if (!data) {
                throw new NotFoundError('Failed to enquire wallet!');
            }

            return data!.wallet_balance;
        } catch (error: any) {
            console.error('Error fetching wallet balance:', error.message);
            throw new Error('Failed to fetch wallet balance');
        }
    }

    /**
     * Update reserved wallet status after webhook notification
     */
    async updateReservedWalletFromWebhook(webhookData: any) {
        const { data, statusCode, error } = webhookData;

        let updateData;

        if (statusCode === 200) {
            updateData = {
                status: 'active',
                walletName: data!.name,
                walletBalance: data!.wallet_balance || 0,
                accountNumbers: data!.account_numbers || [],
                $unset: {
                    errorMessage: "",
                }
            }
        } else {
            updateData = {
                status: 'failed',
                errorMessage: error
            };
        }

        const wallet = await VantWallet.findOneAndUpdate(
            { email: data!.email },
            { $set: updateData },
            { new: true }
        );

        if (!wallet) {
            throw new NotFoundError('Reserved wallet not found for webhook update');
        }

        const BANK_MAP = BANK_LIST.reduce((acc, bank) => {
            acc[bank.name.toLowerCase()] = { bankCode: bank.code, bankId: bank.id };
            return acc;
        }, {} as Record<string, { bankCode: string; bankId: number }>);


        const bankAccounts = (data.account_numbers || []).map((acc: any) => {
            const bankInfo = BANK_MAP[acc.bank.toLowerCase()] || {
                bankCode: '',
                bankId: 0,
            };

            return {

                accountNumber: acc.account_number,
                bankCode: bankInfo.bankCode,
                accountName: acc.account_name,
                bankId: bankInfo.bankId,
                bankName: acc.bank,
            }
        });

        await Wallet.findOneAndUpdate(
            { user: wallet.userId },
            { $set: { bankAccounts } },
            { new: true }
        );

        return wallet;
    }

    async getWalletTransactions(
        userId: string,
        page: number = 1,
        limit: number = 20,
        type?: 'inward' | 'outward'
    ) {
        const skip = (page - 1) * limit;

        const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
        if (type) filter.type = type;

        const transactions = await VantTransaction.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate('walletId', 'walletName accountNumbers');

        const total = await VantTransaction.countDocuments(filter);

        return {
            transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Verify beneficiary account details
     */
    async verifyAccount(accountNumber: string, bankCode: string): Promise<VerifyAccountResponse> {
        try {
            if (!/^\d{10}$/.test(accountNumber)) {
                throw new BadRequestError('Account number must be 10 digits');
            }

            const payload = {
                account_bank: bankCode,
                account_number: accountNumber,
            };

            const { data }: any = await this.axiosInstance.post(
                '/transfer/verify-account',
                payload
            );

            if (!data || data!.status !== "success") {
                throw new NotFoundError('Failed to verify account!');
            }

            return data;
        } catch (error: any) {
            console.error('Error verifying account:', error.message);
            throw new Error('Failed to verify account details');
        }
    }

    /**
     * Transfer funds to another account
     */
    async transferFunds(
        userId: string,
        transferRequest: TransferRequest,
        walletDetails: any,
        totalDeduction?: number,
    ): Promise<TransferResponse> {
        try {
            // Create transaction record first with pending status
            const transaction = new VantTransaction({
                walletId: walletDetails._id,
                userId: walletDetails.userId,
                reference: transferRequest.reference,
                amount: transferRequest.amount,
                type: 'outward',
                status: 'pending',
                accountNumber: walletDetails.accountNumbers[0]?.account_number || '',
                destinationAccountNumber: transferRequest.account_number,
                destinationAccountName: transferRequest.name,
                destinationBank: transferRequest.bank_code,
                destinationBankName: transferRequest.bank,
                narration: transferRequest.remark,
                meta: {
                    toSession: transferRequest.toSession,
                    toClient: transferRequest.toClient,
                    toBvn: transferRequest.toBvn,
                    email: transferRequest.email
                },
                timestamp: new Date(),
            });
            await transaction.save();

            // Make transfer request
            const { data }: any = await this.axiosInstance.post(
                '/transfer/initiate',
                transferRequest
            );

            if (!data || data.status !== true) {
                await VantTransaction.findByIdAndUpdate(
                    transaction._id,
                    {
                        status: 'failed',
                        meta: {
                            ...transaction.meta,
                            error: 'API call failed',
                            apiResponse: data
                        }
                    }
                );
                throw new NotFoundError('Transfer failed!');
            }

            // Deduct the total amount including charges from wallet
            const actualDeduction = totalDeduction || transferRequest.amount;

            await VantWallet.findOneAndUpdate(
                { userId: new mongoose.Types.ObjectId(userId) },
                {
                    $inc: {
                        walletBalance: -actualDeduction,
                        totalOutwardTransfers: transferRequest.amount,
                        transactionCount: 1
                    },
                    $set: {
                        lastTransactionDate: new Date()
                    }
                },
            );

            await VantTransaction.findByIdAndUpdate(
                transaction._id,
                {
                    status: data?.status ? 'successful' : 'failed',
                    meta: {
                        ...transaction.meta,
                        apiResponse: data
                    }
                },
            );

            const updatedWallet = await Wallet.findOneAndUpdate(
                {
                    user: userId,
                    balance: { $gte: actualDeduction },
                },
                {
                    $inc: { balance: -actualDeduction },
                },
                {
                    new: true,
                }
            );

            if (!updatedWallet) {
                throw new Error("Insufficient funds");
            }

            return data;
        } catch (error: any) {
            console.error('Error processing transfer:', error.message);
            throw new Error(error.message || 'Failed to process transfer');
        }
    }

    /**
     * Process inward transfer notification from webhook
     */
    async processInwardTransfer(transferData: InwardTransferData): Promise<void> {
        const {
            reference,
            amount,
            account_number,
            originator_account_number,
            originator_account_name,
            originator_bank,
            originator_narration,
            status,
            meta,
            timestamp,
            sessionId
        } = transferData;

        // Find wallet by account number
        const wallet = await VantWallet.findOne({
            'accountNumbers.account_number': account_number,
            status: 'active'
        });

        if (!wallet) {
            console.error(`Wallet not found for account number: ${account_number}`);
            return;
        }

        // Check if transaction already exists (prevent duplicates)
        const existingTransaction = await VantTransaction.findOne({ reference });
        if (existingTransaction) {
            console.log(`Transaction ${reference} already processed`);
            return;
        }

        try {
            const matchedBank = BANK_LIST.find((b: any) => b.code === originator_bank);
            const bankName = matchedBank?.name || originator_bank || 'Unknown Bank';

            const transaction = new VantTransaction({
                walletId: wallet._id,
                userId: wallet.userId,
                reference,
                amount,
                type: 'inward',
                status,
                accountNumber: account_number,
                originatorAccountNumber: originator_account_number,
                originatorAccountName: originator_account_name,
                originatorBank: originator_bank,
                originatorBankName: bankName,
                narration: originator_narration,
                meta: meta || {},
                timestamp: new Date(timestamp),
                sessionId
            });
            await transaction.save();

            if (status === 'successful') {
                const updateData = {
                    $inc: {
                        walletBalance: amount,
                        totalInwardTransfers: amount,
                        transactionCount: 1
                    },
                    $set: {
                        lastTransactionDate: new Date(timestamp)
                    }
                };

                await VantWallet.findByIdAndUpdate(wallet._id, updateData);

                const contribution = await Contribution.findOne({ user: wallet.userId });
                if (!contribution) {
                    throw new BadRequestError("Contribution not found");
                }

                await createContributionHistoryService({
                    contribution: contribution._id as ObjectId,
                    // @ts-ignore
                    user: contribution.user._id as ObjectId || user._id as any,
                    amount: contribution.amount,
                    currency: contribution.currency || "naira",
                    type: "Credit",
                    balance: contribution.balance,
                    status: "Paid",
                    Date: new Date(),
                    reference: contribution.paymentReference,
                    savingsType: contribution.savingsType,
                });


                await Wallet.findOneAndUpdate(
                    { user: wallet.userId },
                    { $inc: { balance: amount } },
                    { new: true }
                );
            } else {
                await logFailedTransaction({
                    type: 'deposit',
                    reference,
                    reason: `Deposit failed with status: ${status}`,
                    data: transferData,
                    userId: wallet?.userId,
                    walletId: wallet?._id,
                });
            }
        } catch (error: any) {
            await logFailedTransaction({
                type: 'deposit',
                reference,
                reason: error.message,
                data: transferData,
                userId: wallet?.userId,
                walletId: wallet?._id,
            });

            console.error('Error processing inward transfer:', error.message);
            throw error;
        }
    }

}

const VantServices = new VantService();
export default VantServices;