import { findUser } from "../services/authService";
import { sendSMSOTP, setBVN, verifyOTP } from "../services/kycservice";
import { Request, Response } from "express";
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
  return res.status(200).json({ message: "OTP sent successfully" });
};

const verifyOTPController = async (req: Request, res: Response) => {
  //@ts-ignore
  const user = await findUser("id", req.user.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const result = await verifyOTP(user.phoneNumber, req.body.code);

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

export { sendOTP, verifyOTPController, setBVNController };
