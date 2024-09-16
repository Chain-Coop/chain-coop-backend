import {
    createWalletService,
    findWalletService,
    updateWalletService,
    verifyBankDetailsService,
} from '../services/walletService';
import { BadRequestError } from '../errors';
import { StatusCodes } from 'http-status-codes';

// Interface for payload with specified fund type
interface BankDetailsPayload {
    accountNumber: string;
    bankCode: string;
    fundType: 'wallet' | 'contribution';
    userId: string;
}

export const collectBankDetails = async (payload: BankDetailsPayload) => {
    const { accountNumber, bankCode, fundType, userId } = payload;

    try {
        let wallet = await findWalletService({ user: userId });
        if (!wallet) {
            console.log('Wallet not found, creating a new one.');

            // Create a new wallet or contribution fund for the user
            wallet = await createWalletService({
                user: userId,
                balance: 0, 
                isPinCreated: false,
                bankDetails: {
                    accountNumber,
                    bankCode
                }
            });
            console.log('New wallet or contribution fund created:', wallet);
        } else {
            // Update existing wallet or contribution fund with new bank details
            await updateWalletService(wallet._id, { bankDetails: { accountNumber, bankCode } });
        }

        return { status: StatusCodes.OK, message: 'Bank details updated successfully' };
    } catch (error) {
        // Type guard to check if error is an instance of Error
        if (error instanceof Error) {
            throw new BadRequestError(error.message);
        } else {
            throw new BadRequestError('An unexpected error occurred');
        }
    }
};

export const verifyBankDetails = async (accountNumber: string, bankCode: string) => {
    try {
        const verificationResult = await verifyBankDetailsService(accountNumber, bankCode);
        return { status: StatusCodes.OK, message: 'Bank details verified', result: verificationResult };
    } catch (error) {
        // Type guard to check if error is an instance of Error
        if (error instanceof Error) {
            throw new BadRequestError(error.message);
        } else {
            throw new BadRequestError('An unexpected error occurred');
        }
    }
};
