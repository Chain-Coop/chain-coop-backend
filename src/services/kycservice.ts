import axios from "axios";
import { encrypt } from "./encryption";
import { findWalletService } from "./walletService";
import { findUser } from "./authService";
import { createToken } from "../utils/createToken";
import { generateAndSendOtpWA } from "../utils/sendOtp";
import qs from "qs";
import User from "../models/user";

interface VerifyBVNParams {
  countryCode: string;
  type: string;
  accountNumber: string;
  bvn: string;
  bankcode: string;
  firstName: string;
  lastName: string;
  customer_code: string;
}

const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
const sendSMSOTP = async (phone: string) => {
  const options = {
    method: "POST",
    url: "https://api.sendchamp.com/api/v1/verification/create",
    headers: {
      Accept: "application/json,text/plain,*/*",
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SENDCHAMP_KEY}`,
    },
    data: {
      channel: "sms",
      sender: "Sendchamp",
      token_type: "numeric",
      token_length: 6,
      expiration_time: 6,
      customer_mobile_number: phone,
      meta_data: { description: "verifyphone" },
    },
  };
  try {
    const result = await axios(options);

    return result.data;
  } catch (error) {
    console.error(error);
    return "failed";
  }
};

const verifyOTP = async (code: string, reference: string) => {
  try {
    const axiosOptions = {
      method: "post",
      url: "https://api.sendchamp.com/api/v1/verification/confirm",
      headers: {
        Authorization: `Bearer ${process.env.SENDCHAMP_KEY}`,
        accept: "application/json",
        "content-type": "application/json",
      },
      data: {
        verification_reference: reference,
        verification_code: code,
      },
    };

    const response = await axios(axiosOptions);
    return response.data;
  } catch (error) {
    //@ts-ignore
    console.error(error.response ? error.response.data : error.message);
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
  if (!user || bvn.length !== 11) {
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

const verifyBVN = async ({
  countryCode = "NG",
  type = "bank_account",
  accountNumber,
  bvn,
  bankcode,
  firstName,
  lastName,
  customer_code,
}: VerifyBVNParams) => {
  try {
    const data = {
      country: countryCode,
      type: type,
      account_number: accountNumber,
      bvn: bvn,
      bank_code: bankcode,
      first_name: firstName,
      last_name: lastName,
    };
    const response = await axios.post(
      `https://api.paystack.co/customer/${customer_code}/identification`,
      data,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    //@ts-ignore
    return error.response.data;
  }
};

const BVNWebhook = async (data: any) => {
  const user = await findUser("email", data.email);

  if (!user) {
    return "User not found";
  }

  user.Tier = 1;

  await user.save();

  return "success";
};


// TIER 2 KYC Verification
const DIDIT_AUTH_URL = "https://apx.didit.me/auth/v2/token/";
const DIDIT_VERIFICATION_BASE_URL = "https://verification.didit.me";

export const getClientToken = async (): Promise<string> => {
  const clientID = process.env.NEXT_PUBLIC_DIDIT_CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  if (!clientID || !clientSecret) {
    throw new Error("Didit client credentials not set in environment variables.");
  }

  const encodedCredentials = Buffer.from(`${clientID}:${clientSecret}`).toString("base64");
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");

  try {
    const response = await axios.post(DIDIT_AUTH_URL, params, {
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    //@ts-ignore
    return response.data.access_token;
  } catch (error: any) {
    console.error("Error fetching client token:", error.message);
    throw error;
  }
};

export const createKycSession = async (vendorData: string) => {
  // Use your callback URL from environment variables
  const callback = process.env.KYC_CALLBACK_URL;
  const features = "OCR + NFC + FACE"; 

  try {
    const token = await getClientToken();
    const response = await axios.post(
      `${DIDIT_VERIFICATION_BASE_URL}/v1/session/`,
      {
        callback,
        features,
        vendor_data: vendorData,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data; 
  } catch (error: any) {
    console.error("Error creating KYC session:", error.message);
    throw error;
  }
};

export const processKycWebhook = async (payload: any) => {
  const { status, vendor_data, session_id } = payload;

  // Validate required fields
  if (!vendor_data || !session_id || !status) {
    throw new Error("Missing required fields in webhook payload");
  }

  // Find the user by vendor_data (userId)
  const user = await User.findById(vendor_data);   
  if (!user) {
    throw new Error("User not found");
  }

  // Check for session ID mismatch (if already set)
  if (user.kycSessionId && user.kycSessionId !== session_id) {
    throw new Error("Session ID mismatch for the user");
  }

  // Handle verified status
  if (status.toLowerCase() === "verified") {
    user.Tier = 2;
    user.isVerified = true;
  }

  // Store the session ID if not already saved
  if (!user.kycSessionId) {
    user.kycSessionId = session_id;
  }

  // Save updates
  await user.save();

  return {
    message: "User KYC verification processed successfully",
    userId: user._id,
    status: user.isVerified ? "verified" : "unverified",
    tier: user.Tier,
  };
};


export {
  sendSMSOTP,
  verifyOTP,
  createPaystackCustomer,
  setBVN,
  verifyBVN,
  BVNWebhook,
};


