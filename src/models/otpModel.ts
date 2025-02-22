// import { Schema, model } from "mongoose";

// export interface OtpDocument extends Document {
//   email?: string;
//   compareOtp: (enteredOtp: string) => boolean;
//   type?: string;
//   phone?: string;
// }

// const OtpSchema = new Schema({
//   email: {
//     type: String,
//     trim: true,
//   },
//   otp: String,
//   type: {
//     type: String,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//     expires: 60 * 10,
//   },
//   phone: {
//     type: String,
//     trim: true,
//   },
// });

// OtpSchema.methods.compareOtp = async function (enteredOtp: string) {
//   const isMatch = this.otp === enteredOtp;
//   return isMatch;
// };

// export default model<OtpDocument>("OTP", OtpSchema);

import { Schema, model, Document } from "mongoose";

export interface OtpDocument extends Document {
  email?: string;
  whatsappNumber?: string;
  phoneNumber?: string;
  otp: string;
  type: "email" | "sms" | "whatsapp";
  createdAt?: Date;
  compareOtp: (enteredOtp: string) => boolean;
}

const OtpSchema = new Schema<OtpDocument>({
  email: {
    type: String,
    trim: true,
    sparse: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
    sparse: true,
  },
  whatsappNumber: {
    type: String,
    trim: true,
    sparse: true,
  },
  otp: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["email", "sms", "whatsapp"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // OTP expires in 10 minutes
  },
});

// Compare OTP value
OtpSchema.methods.compareOtp = function (enteredOtp: string | number) {
  return Number(this.otp) === Number(enteredOtp);
};

export default model<OtpDocument>("OTP", OtpSchema);
