import { findUser } from "../services/authService";
import {
  sendSMSOTP,
  setBVN,
  verifyBVN,
  verifyOTP,
  createKycSession,
  processKycWebhook,
} from "../services/kycservice";
import { Request, Response } from "express";
import { findWalletService } from "../services/walletService";
import { decrypt } from "../services/encryption";
import { generateAndSendOtpWA } from "../utils/sendOtp";
import { findOtpPhone } from "../services/otpService";
import User from '../models/user';
import { EmailOptions, sendEmail } from "../utils/sendEmail";

interface CustomRequest extends Request {
  user: {
    id: string;
    email: string;
    userId: string;
    role: string;
  };
}

const sendOTP = async (req: Request, res: Response) => {
  //@ts-ignore
  const user = await findUser("id", req.user.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const result = await sendSMSOTP(user.phoneNumber);

  if (result === "failed") {
    return res.status(500).json({ message: "Failed to send OTP" });
  }
  return res.status(200).json({
    message: "OTP sent successfully",
    //@ts-ignore
    reference: result.data.reference,
  });
};

const sendWhatsappOTPController = async (req: Request, res: Response) => {
  //@ts-ignore
  const user = await findUser("id", req.user.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const result = (await generateAndSendOtpWA(user.phoneNumber)) as {
    status: string;
  };

  if (result.status !== "success") {
    return res.status(500).json({ message: "Failed to send OTP" });
  }
  return res.status(200).json({ message: "OTP sent successfully" });
};

const verifyWhatsappOTPController = async (req: Request, res: Response) => {
  //@ts-ignore
  const user = await findUser("id", req.user.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const result = await findOtpPhone(user.phoneNumber, req.body.code);

  if (!result) {
    return res.status(500).json({ message: "Failed to verify OTP" });
  }

  user.isVerified = true;
  await user.save();
  return res.status(200).json({ message: "OTP verified successfully" });
};

const verifyOTPController = async (req: Request, res: Response) => {
  //@ts-ignore
  const user = await findUser("id", req.user.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const result = await verifyOTP(req.body.code, req.body.reference);

  if (result === "failed") {
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
  user.isVerified = true;
  await user.save();
  return res.status(200).json({ message: "OTP verified successfully" });
};

const setBVNController = async (req: Request, res: Response) => {
  //@ts-ignore
  const isSet = await setBVN(req.body.bvn, req.user.userId);
  if (!isSet) {
    return res.status(500).json({ message: "Failed to set BVN" });
  }
  return res.status(200).json({ message: "BVN set successfully" });
};

const verifyBVNController = async (req: Request, res: Response) => {
  //@ts-ignore
  const user = await findWalletService({ user: req.user.userId });
  //@ts-ignore
  const mainuser = await findUser("id", req.user.userId);

  if (!mainuser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!mainuser.isVerified) {
    return res.status(404).json({ message: "User not verified" });
  }

  if (!user || !user.bvn) {
    return res.status(404).json({ message: "BVN not set" });
  }
  //@ts-ignore
  const isSet = await verifyBVN({
    countryCode: req.body.countryCode,
    bvn: (await decrypt(user.bvn)) as string,
    accountNumber: req.body.accountNumber,
    type: req.body.type,
    bankcode: req.body.bankcode,
    firstName: mainuser.firstName,
    lastName: mainuser.lastName,
    customer_code: mainuser.email,
  });

  const emailOptions:EmailOptions = {
    to: mainuser.email,
    subject: "Congratulations, You’re Now Verified on Chain Co-op",
    html: `
    <p>Hi ${mainuser.firstName},</p>
      <p>Congratulations, your account has been successfully verified on <strong>Chain Co-op</strong>. You’re now ready to start saving, earning, and building financial discipline with Bitcoin, USDT, and USDC.</p>

      <p>Here’s what you can do with your Chain Co-op account:</p>
      <ul>
        <li>Save in BTC, USDT, or USDC and earn up to 9% annual returns</li>
        <li>Lock your savings to grow long-term wealth and avoid emotional selling</li>
        <li>Track your performance and monitor every deposit, yield, and payout</li>
        <li>Request loans using your locked savings with no paperwork or delay</li>
        <li>Join our community savings cycles (coming soon) and grow together with others</li>
      </ul>

      <p>Your dashboard is ready. Log in today and make your first savings deposit to start earning rewards and building your financial freedom.</p>

      <p>Welcome to Chain Co-op.<br>
      <strong>Save better. Earn smarter. Stay disciplined.</strong></p>

      <p>Best regards,<br>
      The Chain Co-op Team</p>`
  }

    // 5. Send email
    await sendEmail(emailOptions);
  return res.status(200).json(isSet);
};

export const initiateTier2Kyc = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        status: 404,
        message: "User not found" 
      });
    }
    // Ensure the user is Tier 2 before Tier 3 KYC can be initiated.
    if (user.Tier !== 2) {
      return res.status(400).json({ 
        status: 400,
        message: "User must be a Tier 2 user to initiate Tier 3 KYC" 
      });
    }

    // Create the KYC session using the Didit API.
    const sessionData = await createKycSession(userId);

    // Success response with the verification URL
    return res.status(200).json({
      status: 200,
      message: "KYC Tier 2 session created successfully",
      //@ts-ignore
      verificationUrl: sessionData?.url, // URL for the user to complete the verification
    });
  } catch (error: any) {
    // Handle any internal server errors
    return res.status(500).json({ 
      status: 500,
      message: "Error initiating Tier 2 KYC",
      error: error.message 
    });
  }
};

export const handleKycCallback = async (req: Request, res: Response) => {
  try {
    const result = await processKycWebhook(req.body);
    return res.status(200).json({ message: result.message });
  } catch (error: any) {
    console.error("Webhook processing failed:", error.message);
    return res.status(500).json({ message: "Webhook error", error: error.message });
  }
};

export {
  sendOTP,
  verifyOTPController,
  setBVNController,
  verifyBVNController,
  sendWhatsappOTPController,
  verifyWhatsappOTPController,
};
