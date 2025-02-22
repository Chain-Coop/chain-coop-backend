import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  createUser,
  findExistingUser,
  findUser,
  getUserDetails,
  resetUserPassword,
  updateUserByEmail,
  updateUserById,
  updateUserByPhone,
  updateUserByWhatsApp,
} from "../services/authService";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthenticatedError,
  ForbiddenError,
} from "../errors";
import { deleteOtp, deleteOtpPhone, deleteOtpWhatsApp, findOtp, findOtpByEmail, findOtpPhone, findOtpWhatsApp } from "../services/otpService";
import { generateAndSendOtp, generateAndSendOtpWA, generateAndSendOtpSMS } from "../utils/sendOtp";
import {
  createWalletService,
  findWalletService,
  iWallet,
} from "../services/walletService";
import { verifyPayment } from "../services/paystackService";

// Updated register method to include membership statusimport { LogModel } from "../models/logModel";
import { logUserOperation } from "../middlewares/logging";
import { createPaystackCustomer } from "../services/kycservice";
import Web3Wallet from "../models/web3Wallet";

const register = async (req: Request, res: Response) => {
  let user: any = null;
  try {
    //registerValidator(req);
    const { email, whatsappNumber, phoneNumber } = req.body;
    const legacyUser = await findUser("email", email!);
    if (legacyUser) {
      throw new ConflictError("User with this email already exists");
    }
    user = await createUser(req.body);
    const token = await user.createJWT();

    await createPaystackCustomer(
      email,
      req.body.phoneNumber,
      req.body.firstName,
      req.body.lastName
    );

    // email otp generator
    await generateAndSendOtp({
      email: email!,
      message: "Your OTP to verify your account is",
      subject: "Email verification",
    });

    // whatsapp otp generator
    await generateAndSendOtpWA(whatsappNumber)
      .then((response) => {
        console.log("OTP sent successfully to WhatsApp:", response);
      })
      .catch((error) => {
        console.error("Error sending OTP to WhatsApp:", error);
      });

    // phone-number otp generator
    await generateAndSendOtpSMS(phoneNumber)
      .then((response) => {
        console.log("OTP sent successfully to SMS:", response);
      })
      .catch((error) => {
        console.error("Error sending OTP to SMS:", error);
      });


    const walletPayload: iWallet = {
      balance: 0,
      pin: "0000",
      totalEarned: 0,
      totalWithdrawn: 0,
      user: user._id as string,
    };

    await createWalletService(walletPayload);
    await logUserOperation(user?.id, req, "REGISTER", "Success");
    res.status(StatusCodes.CREATED).json({
      msg: "Registration successful, proceed to OTP verification", // enter the OTP sent to your email
      user: { _id: user._id, email: user.email, token },
    });
  } catch (error) {
    await logUserOperation(user?.id, req, "REGISTER", "Failure");
    throw error;
  }
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
  res
    .status(StatusCodes.OK)
    .json({ msg: "Your account has been activated", newUser });
};

// Verify OTP through sms
const verifyPhoneOtp = async (req: Request, res: Response) => {
  const { phoneNumber, phoneNumberOtp } = req.body;

  if (!phoneNumber || !phoneNumberOtp) {
    throw new BadRequestError("Phone number and OTP are required");
  }

  const validOtp = await findOtpPhone(phoneNumber, phoneNumberOtp);
  if (!validOtp) {
    throw new UnauthenticatedError("Failed to validate phone OTP");
  }

  await deleteOtpPhone(phoneNumber);

  const newUser = await updateUserByPhone(phoneNumber, { isVerified: true });
  if (!newUser) {
    throw new NotFoundError("User not found");
  }

  res.status(StatusCodes.OK).json({
    msg: "Phone number verified successfully",
    newUser,
  });
};

// Verify OTP through whatsApp
const verifyWhatsAppOtp = async (req: Request, res: Response) => {
  const { whatsappNumber, whatsappOtp } = req.body;

  if (!whatsappNumber || !whatsappOtp) {
    throw new BadRequestError("WhatsApp number and OTP are required");
  }

  const validOtp = await findOtpWhatsApp(whatsappNumber, whatsappOtp);
  if (!validOtp) {
    throw new UnauthenticatedError("Failed to validate WhatsApp OTP");
  }

  await deleteOtpWhatsApp(whatsappNumber);

  const newUser = await updateUserByWhatsApp(whatsappNumber, { isVerified: true });
  if (!newUser) {
    throw new NotFoundError("User not found");
  }

  res.status(StatusCodes.OK).json({
    msg: "WhatsApp number verified successfully",
    newUser,
  });
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
  let user: any = null;

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError("Email and password are required");
    }

    user = await findUser("email", email!);
    if (!user) {
      throw new UnauthenticatedError("Invalid credentials");
    }

    const validPassword = await user.comparePasswords(password!);
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

    await logUserOperation(user?.id, req, "LOGIN", "Success");

    res.status(StatusCodes.OK).json({
      _id: user._id,
      email: user.email,

      token,
      role: user.role,
      //@ts-ignore
      membershipStatus: user.membershipStatus,
      //@ts-ignore
      membershipPaymentStatus: user.membershipPaymentStatus,
    });
  } catch (error) {
    await logUserOperation(user?.id, req, "LOGIN", "Failure");
    throw error;
  }
};

// Get user details and wallet information
const getUser = async (req: Request, res: Response) => {
  //@ts-ignore
  const id = req.user.userId;
  const user = await getUserDetails(id);
  const wallet = await findWalletService({ user: id });
  const isPinCreated = wallet?.isPinCreated;

  const web3wallet = await Web3Wallet.findOne({ user: id });
  const isWalletActivated = web3wallet ? true : false;

  res
    .status(StatusCodes.OK)
    .json({ ...user?.toObject(), isPinCreated, isWalletActivated });
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
  res
    .status(StatusCodes.OK)
    .json({ msg: "Password reset OTP sent to your email" });
};

// Reset password after OTP validation
const resetPassword = async (req: Request, res: Response) => {
  let user: any = null;

  try {
    const { otp, password, confirmPassword, email } = req.body;

    user = await findUser("email", email);
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
    await logUserOperation(user?.id, req, "RESET_PASSWORD", "Success");
    res.status(StatusCodes.OK).json({ msg: "Password reset successful" });
  } catch (error) {
    await logUserOperation(user?.id, req, "RESET_PASSWORD", "Failure");
    throw error;
  }
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
