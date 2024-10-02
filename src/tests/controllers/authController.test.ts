import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
    register,
    verifyOtp,
    login,
    resendOtp,
    forgetPassword,
    resetPassword,
} from '../../controllers/authController';
import {
    createUser,
    findUser,
    updateUserByEmail,
    resetUserPassword,
} from '../../services/authService';
import { generateAndSendOtp } from '../../utils/sendOtp';
import { findOtp, deleteOtp, findOtpByEmail } from '../../services/otpService';
import { createWalletService } from '../../services/walletService';

// Mock all external services
jest.mock('../../services/authService');
jest.mock('../../services/otpService');
jest.mock('../../utils/sendOtp');
jest.mock('../../services/walletService');

describe('AuthController Unit Tests', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn(() => ({ json: jsonMock }));

        req = {};
        res = {
            status: statusMock,
            json: jsonMock,
        };
    });

    // Previous tests for register, login, and verifyOtp...

    describe('resendOtp', () => {
        it('should resend OTP and delete the old one if exists', async () => {
            req.body = { email: 'test@example.com' };
            (findOtpByEmail as jest.Mock).mockResolvedValue({ otp: '123456' });
            (deleteOtp as jest.Mock).mockResolvedValue({});
            (findUser as jest.Mock).mockResolvedValue({ _id: 'user123', email: 'test@example.com' });
            (generateAndSendOtp as jest.Mock).mockResolvedValue({});

            await resendOtp(req as Request, res as Response);

            expect(deleteOtp).toHaveBeenCalledWith('test@example.com');
            expect(generateAndSendOtp).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
            expect(statusMock).toHaveBeenCalledWith(StatusCodes.CREATED);
            expect(jsonMock).toHaveBeenCalledWith({ msg: 'OTP successfully sent to your email' });
        });

        it('should throw NotFoundError if user does not exist', async () => {
            req.body = { email: 'nonexistent@example.com' };
            (findUser as jest.Mock).mockResolvedValue(null);

            await expect(resendOtp(req as Request, res as Response)).rejects.toThrow('User with this email does not exist');
        });
    });

    describe('forgetPassword', () => {
        it('should send password reset OTP if user exists', async () => {
            req.body = { email: 'test@example.com' };
            (findUser as jest.Mock).mockResolvedValue({ _id: 'user123', email: 'test@example.com' });
            (generateAndSendOtp as jest.Mock).mockResolvedValue({});

            await forgetPassword(req as Request, res as Response);

            expect(findUser).toHaveBeenCalledWith('email', 'test@example.com');
            expect(generateAndSendOtp).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
            expect(statusMock).toHaveBeenCalledWith(StatusCodes.OK);
            expect(jsonMock).toHaveBeenCalledWith({ msg: 'Password reset OTP sent to your email' });
        });

        it('should throw NotFoundError if user does not exist', async () => {
            req.body = { email: 'nonexistent@example.com' };
            (findUser as jest.Mock).mockResolvedValue(null);

            await expect(forgetPassword(req as Request, res as Response)).rejects.toThrow('User not found');
        });
    });

    describe('resetPassword', () => {
        it('should reset password if OTP is valid and passwords match', async () => {
            req.body = { email: 'test@example.com', otp: '123456', password: 'newpass123', confirmPassword: 'newpass123' };
            (findUser as jest.Mock).mockResolvedValue({ _id: 'user123', email: 'test@example.com' });
            (findOtp as jest.Mock).mockResolvedValue({ otp: '123456' });
            (resetUserPassword as jest.Mock).mockResolvedValue({});
            (deleteOtp as jest.Mock).mockResolvedValue({});

            await resetPassword(req as Request, res as Response);

            expect(findOtp).toHaveBeenCalledWith('test@example.com', '123456');
            expect(resetUserPassword).toHaveBeenCalledWith(expect.any(Object), 'newpass123');
            expect(deleteOtp).toHaveBeenCalledWith('test@example.com');
            expect(statusMock).toHaveBeenCalledWith(StatusCodes.OK);
            expect(jsonMock).toHaveBeenCalledWith({ msg: 'Password reset successful' });
        });

        it('should throw BadRequestError if passwords do not match', async () => {
            req.body = { email: 'test@example.com', otp: '123456', password: 'newpass123', confirmPassword: 'wrongpass' };
            await expect(resetPassword(req as Request, res as Response)).rejects.toThrow('Password and confirm password do not match');
        });

        it('should throw BadRequestError if OTP is invalid', async () => {
            req.body = { email: 'test@example.com', otp: 'invalid_otp', password: 'newpass123', confirmPassword: 'newpass123' };
            (findOtp as jest.Mock).mockResolvedValue(null);

            await expect(resetPassword(req as Request, res as Response)).rejects.toThrow('Invalid otp provided');
        });
    });
});
