// import OTP from "../models/otpModel";

// const createOtp = async (email: string, otp: string) => {
//   const newOTP = await OTP.create({ email, otp });
//   return newOTP;
// };

// const findOtp = async (email: string, otpValue: string) => {
//   const otp = await OTP.findOne({ email, otp: otpValue });
//   return otp;
// };

// const findOtpByEmail = async (email: string) => {
//   const otp = await OTP.findOne({ email });
//   return otp;
// };

// const deleteOtp = async (email: string) => {
//   const otp = await OTP.findOneAndDelete({ email });
//   return otp;
// };

// const createOtpPhone = async (phone: string, otp: string) => {
//   const newOTP = await OTP.create({ phone, otp });
//   return newOTP;
// };

// const findOtpPhone = async (phone: string, otpValue: string) => {
//   const otp = await OTP.findOne({ phone, otp: otpValue });
//   return otp;
// };

// export {
//   createOtp,
//   findOtp,
//   deleteOtp,
//   findOtpByEmail,
//   createOtpPhone,
//   findOtpPhone,
// };

import OTP from "../models/otpModel";

const createOtp = async (email: string, otp: string) => {
  return await OTP.create({ email, otp, type: "email" });
};

const findOtp = async (email: string, otpValue: string) => {
  return await OTP.findOne({ email, otp: otpValue, type: "email" });
};

const findOtpByEmail = async (email: string) => {
  return await OTP.findOne({ email, type: "email" });
};

const deleteOtp = async (email: string) => {
  return await OTP.findOneAndDelete({ email, type: "email" });
};

const createOtpPhone = async (phoneNumber: string, otp: string) => {
  return await OTP.create({ phoneNumber, otp, type: "sms" });
};

const findOtpPhone = async (phoneNumber: string, otpValue: string) => {
  return await OTP.findOne({ phoneNumber, otp: otpValue, type: "sms" });
};

const findOtpByPhone = async (phoneNumber: string) => {
  return await OTP.findOne({ phoneNumber, type: "sms" });
};


const deleteOtpPhone = async (phoneNumber: string) => {
  return await OTP.findOneAndDelete({ phoneNumber, type: "sms" });
};

const createOtpWhatsApp = async (whatsappNumber: string, otp: string) => {
  return await OTP.create({ whatsappNumber, otp, type: "whatsapp" });
};

const findOtpWhatsApp = async (whatsappNumber: string, otpValue: string) => {
  return await OTP.findOne({ whatsappNumber, otp: otpValue, type: "whatsapp" });
};

const findOtpByWhatsApp = async (whatsappNumber: string) => {
  return await OTP.findOne({ whatsappNumber, type: "whatsapp" });
};

const deleteOtpWhatsApp = async (whatsappNumber: string) => {
  return await OTP.findOneAndDelete({ whatsappNumber, type: "whatsapp" });
};

export {
  createOtp,
  findOtp,
  deleteOtp,
  findOtpByEmail,
  createOtpPhone,
  findOtpPhone,
  findOtpByPhone,
  deleteOtpPhone,
  createOtpWhatsApp,
  findOtpWhatsApp,
  findOtpByWhatsApp,
  deleteOtpWhatsApp,
};
