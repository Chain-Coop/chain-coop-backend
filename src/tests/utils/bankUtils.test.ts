import {
    collectBankDetails,
    verifyBankDetails
} from '../../utils/bankUtils';
import {
    createWalletService,
    findWalletService,
    updateWalletService,
    verifyBankDetailsService
} from '../../services/walletService';
import { BadRequestError } from '../../errors';

jest.mock('../../services/walletService'); // Mock the wallet service

describe('Bank Utils', () => {
    const userId = 'testUserId';
    const accountNumber = '1234567890';
    const bankCode = '000001';

    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    describe('collectBankDetails', () => {
        it('should create a new wallet if it does not exist', async () => {
            (findWalletService as jest.Mock).mockResolvedValueOnce(null);
            (createWalletService as jest.Mock).mockResolvedValueOnce({ user: userId, balance: 0 });

            const result = await collectBankDetails(userId, accountNumber, bankCode);

            expect(findWalletService).toHaveBeenCalledWith({ user: userId });
            expect(createWalletService).toHaveBeenCalledWith({
                user: userId,
                balance: 0,
                isPinCreated: false,
                bankDetails: {
                    accountNumber,
                    bankCode
                }
            });
            expect(result).toEqual({ user: userId, balance: 0 });
        });

        it('should update existing wallet with new bank details', async () => {
            const mockWallet = { _id: 'walletId', user: userId, balance: 0 };
            (findWalletService as jest.Mock).mockResolvedValueOnce(mockWallet);
            (updateWalletService as jest.Mock).mockResolvedValueOnce(mockWallet);

            const result = await collectBankDetails(userId, accountNumber, bankCode);

            expect(findWalletService).toHaveBeenCalledWith({ user: userId });
            expect(updateWalletService).toHaveBeenCalledWith(mockWallet._id, { bankDetails: { accountNumber, bankCode } });
            expect(result).toEqual(mockWallet);
        });

        it('should throw BadRequestError if an error occurs', async () => {
            (findWalletService as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

            await expect(collectBankDetails(userId, accountNumber, bankCode)).rejects.toThrow(BadRequestError);
        });
    });

    describe('verifyBankDetails', () => {
        it('should verify bank details successfully', async () => {
            const mockVerificationResult = { success: true };
            (verifyBankDetailsService as jest.Mock).mockResolvedValueOnce(mockVerificationResult);

            const result = await verifyBankDetails(accountNumber, bankCode);

            expect(verifyBankDetailsService).toHaveBeenCalledWith(accountNumber, bankCode);
            expect(result).toEqual(mockVerificationResult);
        });

        it('should throw BadRequestError if an error occurs', async () => {
            (verifyBankDetailsService as jest.Mock).mockRejectedValueOnce(new Error('Verification error'));

            await expect(verifyBankDetails(accountNumber, bankCode)).rejects.toThrow(BadRequestError);
        });
    });
});
