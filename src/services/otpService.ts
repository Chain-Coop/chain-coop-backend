import OTP from "../models/otpModel";

const createOtp = async (email: string, otp: string) => {
  const newOTP = await OTP.create({ email, otp });
  return newOTP;
};

const findOtp = async (email: string, otpValue: string) => {
  const otp = await OTP.findOne({ email, otp: otpValue });
  return otp;
};

const findOtpByEmail = async (email: string) => {
  const otp = await OTP.findOne({ email });
  return otp;
};

const deleteOtp = async (email: string) => {
  const otp = await OTP.findOneAndDelete({ email });
  return otp;
};

const createOtpPhone = async (phone: string, otp: string) => {
  const newOTP = await OTP.create({ phone, otp });
  return newOTP;
};

const findOtpPhone = async (phone: string, otpValue: string) => {
  const otp = await OTP.findOne({ phone, otp: otpValue });
  return otp;
};

const findOtpByPhone = async (phone: string) => {
  return await OTP.findOne({ phone });
};

const deleteOtpPhone = async (phone: string) => {
  return await OTP.findOneAndDelete({ phone });
};

export {
  createOtp,
  findOtp,
  deleteOtp,
  findOtpByEmail,
  createOtpPhone,
  findOtpPhone,
  findOtpByPhone,
  deleteOtpPhone
};
