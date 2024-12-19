import { createOtp, createOtpPhone } from "../services/otpService";
import { createToken } from "./createToken";
import { sendEmail } from "./sendEmail";
import axios from "axios";

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

export const generateAndSendOtpWA = async (phone: string) => {
  const otp = await createToken({ count: 6, numeric: true });
  console.log(otp);
  await createOtpPhone(phone, otp);
  try {
    const result = await axios.post(
      "https://my.kudisms.net/api/whatsapp",
      {
        token: process.env.KUDI_API,
        recipient: phone,
        template_code: "2147483647",
        parameters: `${otp}`,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return result.data;
  } catch (err) {
    console.log(err);
    return err;
  }
};
