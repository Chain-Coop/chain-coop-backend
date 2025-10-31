import speakeasy from "speakeasy";
import QRCode from "qrcode";
import User from "../models/authModel";
import { encryptTwoFA, decryptTwoFA } from "./twoFactorEncyption";
import { BadRequestError, NotFoundError } from "../errors";

export const generate2FASecret = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("User not found");

  const secret = speakeasy.generateSecret({
    name: `Chain-co-op (${user.email})`,
    length: 20,
  });

  user.twoFactorSecret = encryptTwoFA(secret.base32);
  await user.save();

  const otpauth = secret.otpauth_url || "";
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  return {
    qrDataUrl,
    manualCode: secret.base32,
  };
};

export const verify2FAToken = async (userId: string, token: string):Promise<boolean> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.twoFactorSecret) {
    throw new BadRequestError(
      "Two-factor authentication is not setup for this account"
    );
  }

  const secret = decryptTwoFA(user.twoFactorSecret);

  const verified = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });

  return !!verified;
};

export const enable2FA = async (userId: string, token: string) => {
  const isValid = await verify2FAToken(userId, token);
  if (!isValid) throw new BadRequestError("Invalid 2FA code");

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("User not found");

  user.twoFactorEnabled = true;
  await user.save();

  return { message: "Two factor authentication enabled" };
};

export const disable2FA = async (userId: string, token?: string) => {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("User not found");

  if (user.twoFactorEnabled) {
    if (!token) throw new BadRequestError("2FA token required to disable");
    const valid = await verify2FAToken(userId, token);
    if (!valid) throw new BadRequestError("Invalid 2FA token");
  }

  user.twoFactorEnabled = false
  user.twoFactorSecret = ""
  await user.save()

  return {message: "Two-Factor authentication disabled"}
};
