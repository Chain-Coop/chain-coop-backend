import axios from 'axios';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../errors';
import { VantConfig } from '../../config/vant';
import VantWallet, { IVantWallet } from '../models/vantWalletModel';


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

            console.log("PAYLOAD IN SERVICE: ", payload);

            const { data }: any = await this.axiosInstance.post(
                '/client/create',
                payload
            );

            // const data: any = await axios.post(`${process.env.VANT_BASE_URL_TEST}/client/create`, payload,
            //     {
            //         headers: {
            //           'Content-Type': 'application/json',
            //           'Authorization': `Bearer ${process.env.X_VANT_KEY}`, // if needed
            //         },
            //     }
            // );

            console.log("DATA IN SERVICE: ", data);

            if (!data) {
                throw new NotFoundError('Failed to create reserved wallet!');
            }
            console.log("DATA IN SERVICE AFTER CHECKING ERROR: ", data);

            return data;
        } catch (error: any) {
            console.error(error.message);
            throw new Error(error.message);
        }
    }

    async createReservedWallet(
        userId: string, email: string
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
        const wallet = await VantWallet.findOne({
            userId: new mongoose.Types.ObjectId(userId)
        });

        console.log({ wallet });


        // if (!wallet) {
        //     throw new NotFoundError(
        //         "Failed to fetch reserved wallet!"
        //     );
        // }

        return wallet;
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
        const { email, data, statusCode } = webhookData;

        if (statusCode === 200) {
            // Success - update wallet with account details
            console.log("IN THE 200 STATUS CODE");

            const wallet = await VantWallet.findOneAndUpdate(
                { email: email },
                {
                    $set: {
                        status: 'active',
                        walletName: data!.name,
                        walletBalance: data!.wallet_balance || 0,
                        accountNumbers: data!.account_numbers || []
                    }
                },
                { new: true }
            );
            console.log("IN THE 200 STATUS CODE, WITH MY WALLET", wallet);


            if (!wallet) {
                throw new NotFoundError('Reserved wallet not found for webhook update');
            }

            return wallet;
        } else {
            // Failure - mark as failed
            console.log("IN THE FAILED STATUS CODE");

            const wallet = await VantWallet.findOneAndUpdate(
                { email: email },
                {
                    $set: {
                        status: 'failed'
                    }
                },
                { new: true }
            );
            console.log("IN THE 200 STATUS CODE, WITH MY WALLET", wallet);


            if (!wallet) {
                throw new NotFoundError('Reserved wallet not found for webhook update');
            }

            return wallet;
        }
    }

    /**
     * Get wallet balance and details
     */
    async verifyBvn(bvn: string): Promise<any> {
        try {
            const { data } = await this.axiosInstance.post(
                '/verify-bvn',
                bvn
            );

            if (!data) {
                throw new NotFoundError('Failed to verify bvn!');
            }

            return data;
        } catch (error: any) {
            console.error('Error verifying bvn:', error.message);
            throw new Error('Failed to verify bvn!');
        }
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
                account_number: accountNumber,
                bank_code: bankCode
            };

            const response: any = await this.axiosInstance.post(
                '/verify-account',
                payload
            );

            if (!response?.data || response!.status !== "success") {
                throw new NotFoundError('Failed to verify account!');
            }

            return response!.data;
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
        transferRequest: TransferRequest
    ): Promise<TransferResponse> {
        try {

            // Make transfer request
            const response: any = await this.axiosInstance.post(
                '/transfer/initiate',
                transferRequest
            );

            if (!response?.data) {
                throw new NotFoundError('Transfer failed!');
            }

            await VantWallet.findOneAndUpdate(
                { userId: new mongoose.Types.ObjectId(userId) },
                { $inc: { walletBalance: -(transferRequest!.amount) } }
            );

            return response.data;
        } catch (error: any) {
            console.error('Error processing transfer:', error.message);
            throw new Error(error.message || 'Failed to process transfer');
        }
    }

    /**
     * Get transfer history for a user
     */
    async getAllTransactions(userId: string, limit: number = 10, page: number = 1): Promise<any> {
        try {
            const wallet = await this.getUserReservedWallet(userId);

            if (!wallet || wallet.status !== 'active') {
                throw new BadRequestError('No active wallet found');
            }

            const accountNumber = wallet.accountNumbers[0].accountNumber;

            const response: any = await this.axiosInstance.get(
                `/transaction/all?account_number=${accountNumber}&limit=${limit}&page=${page}`
            );

            if (!response?.data) {
                throw new NotFoundError('Failed to fetch transaction history!');
            }

            return response!.data;
        } catch (error: any) {
            console.error('Error fetching transfer history:', error.message);
            throw new Error('Failed to fetch transfer history');
        }
    }

    /**
     * Get list of supported banks
     */
    async getBanks(): Promise<any> {
        try {
            const response: any = await this.axiosInstance.get('/transfer/banks');

            if (!response?.data) {
                throw new NotFoundError('Failed to fetch banks!');
            }

            return response!.data;
        } catch (error: any) {
            console.error('Error fetching banks:', error.message);
            throw new Error('Failed to fetch banks');
        }
    }

    /**
     * Process inward transfer notification from webhook
     */
    async processInwardTransfer(transferData: InwardTransferData): Promise<void> {
        try {
            // Find wallet by account number
            const wallet = await VantWallet.findOne({
                'accountNumbers.accountNumber': transferData.account_number
            });

            if (!wallet) {
                console.error(`Wallet not found for account number: ${transferData.account_number}`);
                return;
            }

            // Check if transaction already processed to avoid duplicates
            // const existingTransaction = await this.findTransactionByReference(transferData.reference);
            // if (existingTransaction) {
            //     console.log(`Transaction already processed: ${transferData.reference}`);
            //     return;
            // }

            // Only process successful transfers
            if (transferData.status === 'successful') {
                // Update wallet balance
                await VantWallet.findOneAndUpdate(
                    { 'accountNumbers.accountNumber': transferData.account_number },
                    {
                        $inc: { walletBalance: transferData.amount }
                    }
                );

                // // Log the transaction
                // await this.logTransaction({
                //     reference: transferData.reference,
                //     amount: transferData.amount,
                //     type: 'inward',
                //     status: 'successful',
                //     account_number: transferData.account_number,
                //     originator_account_number: transferData.originator_account_number,
                //     originator_account_name: transferData.originator_account_name,
                //     originator_bank: transferData.originator_bank,
                //     narration: transferData.originator_narration,
                //     timestamp: new Date(transferData.timestamp),
                //     sessionId: transferData.sessionId
                // });

                console.log(`Wallet balance updated for account ${transferData.account_number}. Amount: ${transferData.amount}`);

                // Optionally send notification to user
                // await this.notifyUserOfInwardTransfer(wallet, transferData);
            } else {
                // Log failed transaction
                // await this.logTransaction({
                //     reference: transferData.reference,
                //     amount: transferData.amount,
                //     type: 'inward',
                //     status: 'failed',
                //     account_number: transferData.account_number,
                //     originator_account_number: transferData.originator_account_number,
                //     originator_account_name: transferData.originator_account_name,
                //     originator_bank: transferData.originator_bank,
                //     narration: transferData.originator_narration,
                //     timestamp: new Date(transferData.timestamp),
                //     sessionId: transferData.sessionId
                // });
            }
        } catch (error: any) {
            console.error('Error processing inward transfer:', error.message);
            throw error;
        }
    }

}

const VantServices = new VantService();
export default VantServices;