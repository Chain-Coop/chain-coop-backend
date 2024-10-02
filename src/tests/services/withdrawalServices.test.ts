import {
    createWithdrawalRequest,
    findWithdrawalById,
    updateWithdrawalStatus,
    getAllWithdrawals,
    findWithdrawalRequests
} from '../../services/withdrawalService';
import Withdrawal from '../../models/withdrawal';
import { BadRequestError } from '../../errors';

jest.mock('../../models/withdrawal'); // Mock the Withdrawal model

describe('Withdrawal Service', () => {
    const userId = 'user_12345';
    const withdrawalId = 'withdrawal_12345';
    const bankDetails = { accountNumber: '1234567890', bankCode: '000001' };

    const mockWithdrawal = {
        _id: withdrawalId,
        user: userId,
        amount: 1000,
        bankDetails,
        status: 'pending',
    };

    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    describe('createWithdrawalRequest', () => {
        it('should create a withdrawal request with valid data', async () => {
            (Withdrawal.create as jest.Mock).mockResolvedValueOnce(mockWithdrawal);

            const result = await createWithdrawalRequest(userId, 1000, bankDetails);

            expect(result).toEqual(mockWithdrawal); // Validate the created withdrawal
            expect(Withdrawal.create).toHaveBeenCalledWith({ user: userId, amount: 1000, bankDetails }); // Check create call
        });

        it('should throw an error if the amount is less than or equal to zero', async () => {
            await expect(createWithdrawalRequest(userId, 0, bankDetails)).rejects.toThrow(BadRequestError); // Check for error
            await expect(createWithdrawalRequest(userId, -100, bankDetails)).rejects.toThrow(BadRequestError); // Check for error
        });
    });

    describe('findWithdrawalById', () => {
        it('should find a withdrawal by ID', async () => {
            (Withdrawal.findById as jest.Mock).mockResolvedValueOnce(mockWithdrawal);

            const result = await findWithdrawalById(withdrawalId);

            expect(result).toEqual(mockWithdrawal); // Validate the found withdrawal
            expect(Withdrawal.findById).toHaveBeenCalledWith(withdrawalId); // Check findById call
        });
    });

    describe('updateWithdrawalStatus', () => {
        it('should update the withdrawal status', async () => {
            const newStatus = 'completed';
            (Withdrawal.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce({ ...mockWithdrawal, status: newStatus });

            const result = await updateWithdrawalStatus(withdrawalId, newStatus);

            expect(result).toEqual({ ...mockWithdrawal, status: newStatus }); // Validate the updated withdrawal
            expect(Withdrawal.findByIdAndUpdate).toHaveBeenCalledWith(
                withdrawalId,
                { status: newStatus },
                { new: true }
            ); // Check update call
        });
    });

    describe('getAllWithdrawals', () => {
        it('should return all withdrawals sorted by createdAt', async () => {
            (Withdrawal.find as jest.Mock).mockResolvedValueOnce([mockWithdrawal]);

            const result = await getAllWithdrawals();

            expect(result).toEqual([mockWithdrawal]); // Validate the returned withdrawals
            expect(Withdrawal.find).toHaveBeenCalledWith(); // Check find call
            expect(Withdrawal.find).toHaveBeenCalledTimes(1); // Ensure find is called once
        });
    });

    describe('findWithdrawalRequests', () => {
        it('should find withdrawal requests for a specific user', async () => {
            (Withdrawal.find as jest.Mock).mockResolvedValueOnce([mockWithdrawal]);

            const result = await findWithdrawalRequests(userId);

            expect(result).toEqual([mockWithdrawal]); // Validate the found withdrawals
            expect(Withdrawal.find).toHaveBeenCalledWith({ user: userId }); // Check find call
        });
    });
});
