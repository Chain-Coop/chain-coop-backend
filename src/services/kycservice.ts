const sid = process.env.TWILIO_ACCOUNT_SID;
const authtoken = process.env.TWILIO_AUTH_TOKEN;
const serviceId = process.env.TWILIO_SERVICE_ID;

const client = require("twilio")(sid, authtoken);
import axios from "axios";
import { findUser } from "./authService";
import { encrypt } from "./encryption";
import { findWalletService } from "./walletService";

const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
const sendSMSOTP = async (phone: string) => {
  try {
    const verification = await client.verify
      .services(serviceId)
      .verifications.create({ to: phone, channel: "sms" });
    return verification.sid;
  } catch (error) {
    return "failed";
  }
};

const verifyOTP = async (phone: string, code: string) => {
  try {
    const verificationCheck = await client.verify
      .services(serviceId)
      .verificationChecks.create({ to: phone, code: code });
    return verificationCheck.status;
  } catch (error) {
    return "failed";
  }
};

const createPaystackCustomer = async (
  email: string,
  phone: string,
  firstName: string,
  lastName: string
) => {
  try {
    const response = await axios.post<{ data: { data: any } }>(
      "https://api.paystack.co/customer",
      {
        email,
        phone,
        first_name: firstName,
        last_name: lastName,
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    return "failed";
  }
};

const setBVN = async (bvn: string, userId: string) => {
  const user = await findWalletService({ user: userId });
  if (!user) {
    return false;
  }

  const tryBvn = encrypt(bvn);
  if (!tryBvn) {
    return false;
  }
  user.bvn = tryBvn;
  console.log(user.bvn, user._id);
  await user.save();
  return true;
};

export { sendSMSOTP, verifyOTP, createPaystackCustomer, setBVN };
