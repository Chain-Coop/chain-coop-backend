import { Schema, model } from "mongoose";

export interface OtpDocument extends Document {
  email?: string;
  compareOtp: (enteredOtp: string) => boolean;
  type?: string;
  phone?: string;
}

const OtpSchema = new Schema({
  email: {
    type: String,
    trim: true,
  },
  otp: String,
  type: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 10,
  },
  phone: {
    type: String,
    trim: true,
  },
});

OtpSchema.methods.compareOtp = async function (enteredOtp: string) {
  const isMatch = this.otp === enteredOtp;
  return isMatch;
};

export default model<OtpDocument>("OTP", OtpSchema);
