import { createOtp } from "../services/otpService";
import { createToken } from "./createToken";
import { sendEmail } from "./sendEmail";

interface iSendOTP {
	email: string;
	subject: string;
	message: string;
}
export const generateAndSendOtp = async ({
	email,
	subject,
	message,
}: iSendOTP) => {
	const otp = await createToken({ count: 6, numeric: true });
	await createOtp(email, otp);
	await sendEmail({
		subject,
		to: email,
		text: `${message} : ${otp}`,
	});
};
