import { Request, Response, NextFunction } from "express";
import * as twoFAService from "../services/twoFactorService";

export const setup2FA = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any).userId;
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const { qrDataUrl, manualCode } = await twoFAService.generate2FASecret(
      userId
    );
    res.status(200).json({
      message:
        "Scan the QR code with your authenticator app and verify using the code.",
      qrDataUrl,
      manualCode, //if the user wants to type it manually
    });
  } catch (error) {
    next(error);
  }
};

export const verify2FASetup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    await twoFAService.enable2FA(userId, token);
    return res.status(200).json({
      status: 200,
      message: "2FA verification successful",
    });
  } catch (error) {
    next(error)
  }
};


export const disable2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { token } = req.body;
    // The service will validate token if 2FA was enabled
    await twoFAService.disable2FA(userId, token);

    res.status(200).json({ message: "Two-factor authentication disabled" });
  } catch (err) {
    next(err);
  }
}; 