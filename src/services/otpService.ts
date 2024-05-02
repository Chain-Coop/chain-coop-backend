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

export { createOtp, findOtp, deleteOtp, findOtpByEmail };
