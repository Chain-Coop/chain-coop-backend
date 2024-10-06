import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
    createUser,
    findUser,
    getUserDetails,
    resetUserPassword,
    updateUserByEmail,
    updateUserById,
} from "../services/authService";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
    UnauthenticatedError,
    ForbiddenError,
} from "../errors";
import { deleteOtp, findOtp, findOtpByEmail } from "../services/otpService";
import { generateAndSendOtp } from "../utils/sendOtp";
import {
    createWalletService,
    findWalletService,
    iWallet,
} from "../services/walletService";
import { verifyPayment } from "../services/paystackService";

// Updated register method to include membership status
const register = async (req: Request, res: Response) => {
    const { email } = req.body;
    const legacyUser = await findUser("email", email!);
    if (legacyUser) {
        throw new ConflictError("Email already exists");
    }

    const user = await createUser(req.body);
    const token = await user.createJWT();

    // Send OTP for email verification
    await generateAndSendOtp({
        email: email!,
        message: "Your OTP to verify your account is",
        subject: "Email verification",
    });

    // Create wallet for the user
    const walletPayload: iWallet = {
        balance: 0,
        pin: "0000",
        totalEarned: 0,
        totalWithdrawn: 0,
        user: user._id as string,
    };

    await createWalletService(walletPayload);

    res.status(StatusCodes.CREATED).json({
        msg: "Registration successful, enter the OTP sent to your email",
        user: { _id: user._id, email: user.email, token },
    });
};

// Verify OTP and activate account
const verifyOtp = async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        throw new BadRequestError("Email and otp is required");
    }
    const validOtp = await findOtp(email, otp);
    if (!validOtp) {
        throw new UnauthenticatedError("Failed to validate OTP");
    }
    const newUser = await updateUserByEmail(email, { status: "active" });
    if (!newUser) {
        throw new NotFoundError("User not found");
    }
    await deleteOtp(email);
    res.status(StatusCodes.OK).json({ msg: "Your account has been activated", newUser });
};

// Resend OTP for email verification
const resendOtp = async (req: Request, res: Response) => {
    const { email } = req.body;
    const isOtp = await findOtpByEmail(email);
    if (isOtp) {
        await deleteOtp(email);
    }
    const user = await findUser("email", email);

    if (!user) {
        throw new NotFoundError("User with this email does not exist");
    }

    await generateAndSendOtp({
        email: email!,
        message: "Your OTP to verify your account is",
        subject: "Email verification",
    });

    res.status(StatusCodes.CREATED).json({
        msg: "OTP successfully sent to your email",
    });
};

// Updated login method to include membership payment and status check
const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new BadRequestError("Email and password are required");
    }

    const user = await findUser("email", email!);
    if (!user) {
        throw new UnauthenticatedError("Invalid credentials");
    }

    const validPassword =  user.comparePasswords(password!);
    if (!validPassword) {
        throw new UnauthenticatedError("Invalid credentials");
    }

    // Check membership payment status
	//@ts-ignore
   // if (user.membershipPaymentStatus === 'not_started') {
   //     return res.status(403).json({
   //         message: "Membership payment required",
   //         redirectUrl: "/api/v1/membership/activate",
   //     });
   // }

    // Check membership status
	//@ts-ignore
   // if (user.membershipStatus === 'inactive') {
   //     return res.status(403).json({
   //         message: "Your membership is inactive. Please activate your membership.",
   //     });
  //  }

    const token = await user.createJWT();

    res.status(StatusCodes.OK).json({
        _id: user._id,
        email: user.email,
        token,
		//@ts-ignore
        membershipStatus: user.membershipStatus,
		//@ts-ignore
        membershipPaymentStatus: user.membershipPaymentStatus,
    });
};

// Get user details and wallet information
const getUser = async (req: Request, res: Response) => {
    //@ts-ignore
    const id = req.user.userId;
    const user = await getUserDetails(id);
    const wallet = await findWalletService({ user: id });
    const isPinCreated = wallet?.isPinCreated;
    res.status(StatusCodes.OK).json({ ...user?.toObject(), isPinCreated });
};

// Send OTP for password reset
const forgetPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        throw new BadRequestError("Email is required");
    }
    const user = await findUser("email", email);
    if (!user) {
        throw new NotFoundError("User not found");
    }
    await generateAndSendOtp({
        email,
        message: "Your OTP to reset password is",
        subject: "Password Reset",
    });
    res.status(StatusCodes.OK).json({ msg: "Password reset OTP sent to your email" });
};

// Reset password after OTP validation
const resetPassword = async (req: Request, res: Response) => {
    const { otp, password, confirmPassword, email } = req.body;

    const user = await findUser("email", email);
    if (!user) {
        throw new NotFoundError("User with this email not found");
    }

    const isVerified = await findOtp(email, otp);
    if (!isVerified) {
        throw new BadRequestError("Invalid otp provided");
    }

    if (password !== confirmPassword) {
        throw new BadRequestError("Password and confirm password do not match");
    }

    await resetUserPassword(user, password);
    await deleteOtp(email);
    res.status(StatusCodes.OK).json({ msg: "Password reset successful" });
};

export {
    register,
    verifyOtp,
    resendOtp,
    login,
    forgetPassword,
    resetPassword,
    getUser,
};
