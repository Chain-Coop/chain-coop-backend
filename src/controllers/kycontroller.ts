import { findUser } from "../services/authService";
import {
  sendSMSOTP,
  setBVN,
  verifyBVN,
  verifyOTP,
} from "../services/kycservice";
import { Request, Response } from "express";
import { findWalletService } from "../services/walletService";
import { decrypt } from "../services/encryption";
import { generateAndSendOtpWA } from "../utils/sendOtp";
import { findOtpPhone } from "../services/otpService";
interface CustomRequest extends Request {
  user: {
    id: string;
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
  return res.status(200).json(isSet);
};

const initiateKyc = async (req, res) => {
  const userId = req.params.userId;
  const callbackUrl = `${process.env.BASE_URL}/kyc/callback`;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.Tier !== 2) {
      return res.status(400).json({ message: 'KYC is only required for Tier 2 users' });
    }

    const kycSession = await createKycSession(callbackUrl, user.id);
    user.kycSessionId = kycSession.session_id;
    await user.save();

    res.json({ verificationUrl: kycSession.url });
  } catch (error) {
    res.status(500).json({ message: 'Error initiating KYC process', error: error.message });
  }
};

const handleKycCallback = async (req, res) => {
  const { session_id, status } = req.body;

  try {
    const user = await User.findOne({ kycSessionId: session_id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (status === 'verified') {
      user.isVerified = true;
      await user.save();
    }

    res.status(200).json({ message: 'KYC callback processed' });
  } catch (error) {
    res.status(500).json({ message: 'Error processing KYC callback', error: error.message });
  }
};



export {
  sendOTP,
  verifyOTPController,
  setBVNController,
  verifyBVNController,
  sendWhatsappOTPController,
  verifyWhatsappOTPController,
  initiateKyc,
  handleKycCallback
};
