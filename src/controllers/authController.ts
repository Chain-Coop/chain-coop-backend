import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  createUser,
  findExistingUser,
  findUser,
  getUserDetails,
  resetUserPassword,
  updateUserByEmail,
  updateUserByWhatsApp,
  updateUserById,
} from "../services/authService";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthenticatedError,
  ForbiddenError,
} from "../errors";
import { deleteOtp, deleteOtpPhone, findOtp, findOtpByEmail, findOtpByPhone, findOtpPhone } from "../services/otpService";
import { generateAndSendOtp, generateAndSendOtpWA } from "../utils/sendOtp";
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
import User from "../models/user";

const register = async (req: Request, res: Response) => {
  let user: any = null;
  try {
    //registerValidator(req);
    const { email, phoneNumber } = req.body;
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

    await generateAndSendOtp({
      email: email!,
      message: "Your OTP to verify your account is",
      subject: "Email verification",
    });

    // await generateAndSendOtpWA(req.body.phoneNumber); 

    // sends WhatsApp OTP on user registering
    await generateAndSendOtpWA(phoneNumber)
      .then((response) => {
        console.log("OTP sent successfully to WhatsApp:", response);
      })
      .catch((error) => {
        console.error("Error sending OTP to WhatsApp:", error);
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
      msg: "Registration successful, proceed to OTP verification",
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

  // Activate user and not verify it
  const newUser = await updateUserByEmail(email, { status: "active" });
  if (!newUser) {
    throw new NotFoundError("User not found");
  }
  await deleteOtp(email);
  res
    .status(StatusCodes.OK)
    .json({ msg: "Your account has been activated", newUser });
};

// Verify OTP through whatsApp
const verifyOtpWA = async (req: Request, res: Response) => {
  const { userId, phoneNumber, otp } = req.body;

  // Ensure all required fields are provided
  if (!userId || !phoneNumber || !otp) {
    throw new BadRequestError("User ID, phone number, and OTP are required");
  }

  // Find the OTP tied to the phone number
  const validOtp = await findOtpPhone(phoneNumber, otp);
  if (!validOtp) {
    throw new UnauthenticatedError("Failed to validate WhatsApp OTP");
  }

  // Delete OTP to prevent reuse
  await deleteOtpPhone(phoneNumber);

  // Update isVerified only if userId and phoneNumber both match
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, phoneNumber }, // double check: both user ID and phone must match
    { isVerified: true, Tier: 1 }, // Set Tier to 1 on successful verification
    { new: true }
  );

  if (!updatedUser) {
    throw new NotFoundError("User not found or phone number does not match user");
  }

  res.status(StatusCodes.OK).json({
    msg: "Phone number verified successfully through WhatsApp",
    user: updatedUser,
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

// Resend OTP for phone number verification through WhatsApp
const resendOtpWhatsApp = async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    throw new BadRequestError("Phone number is required");
  }

  const isOtp = await findOtpByPhone(phoneNumber);
  if (isOtp) {
    await deleteOtpPhone(phoneNumber);
  }

  const user = await findUser("phoneNumber", phoneNumber);
  if (!user) {
    throw new NotFoundError("User with this phone number does not exist");
  }

  try {
    await generateAndSendOtpWA(phoneNumber);
    console.log("OTP sent successfully to WhatsApp:", phoneNumber);
    res.status(StatusCodes.CREATED).json({
      msg: "OTP successfully sent to your WhatsApp",
    });
  } catch (error) {
    console.error("Error sending OTP to WhatsApp:", error);
    throw new BadRequestError(
      "Failed to send OTP via WhatsApp. Please try again."
    );
  }
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

    console.log(user)
    res.status(StatusCodes.OK).json({
      _id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isVerified: user.isVerified,
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
    const { 
      // otp, 
      password, 
      confirmPassword, 
      email 
    } = req.body;

    user = await findUser("email", email);
    if (!user) {
      throw new NotFoundError("User with this email not found");
    }

     // const isVerified = await findOtp(email, otp);
    // if (!isVerified) {
    //   throw new BadRequestError("Invalid otp provided");
    // }

    if (password !== confirmPassword) {
      throw new BadRequestError("Password and confirm password do not match");
    }

    await resetUserPassword(user, password);
    // await deleteOtp(email);
    await logUserOperation(user?.id, req, "RESET_PASSWORD", "Success");
    res.status(StatusCodes.OK).json({ msg: "Password reset successful" });
  } catch (error) {
    await logUserOperation(user?.id, req, "RESET_PASSWORD", "Failure");
    throw error;
  }
};

// Change user's phone number
const changePhoneNumber = async (req: Request, res: Response) => {
  let user: InstanceType<typeof User> | null = null;

  try {
    const { 
      userId, 
      // otp, 
      newPhoneNumber 
    } = req.body;

    user = await findUser("id", userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // const isVerified = await findOtp(user.email, otp);
    // if (!isVerified) {
    //   throw new BadRequestError("Invalid OTP provided");
    // }

    user.phoneNumber = newPhoneNumber;
    await user.save();

    // await deleteOtp(user.email);
    await logUserOperation(user.id, req, "CHANGE_PHONE_NUMBER", "Success");

    res.status(StatusCodes.OK).json({
      msg: "Phone number successfully updated",
    });
  } catch (error) {
    await logUserOperation(user?.id, req, "CHANGE_PHONE_NUMBER", "Failure");
    throw error;
  }
};

export {
  register,
  verifyOtp,
  verifyOtpWA,
  resendOtp,
  resendOtpWhatsApp,
  login,
  forgetPassword,
  resetPassword,
  changePhoneNumber,
  getUser,
};
