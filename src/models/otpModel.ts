import { Schema, model } from "mongoose";

export interface OtpDocument extends Document {
	email: string;
	compareOtp: (enteredOtp: string) => boolean;
}

const OtpSchema = new Schema({
	email: {
		type: String,
		trim: true,
	},
	otp: String,
	createdAt: {
		type: Date,
		default: Date.now,
		expires: 60 * 10,
	},
});

OtpSchema.methods.compareOtp = async function (enteredOtp: string) {
	const isMatch = this.otp === enteredOtp;
	return isMatch;
};

export default model<OtpDocument>("OTP", OtpSchema);
