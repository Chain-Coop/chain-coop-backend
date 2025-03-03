import axios, { get } from "axios";
import dotenv from "dotenv";
import { BadRequestError, InternalServerError } from "../errors";
import logger from "../utils/logger";

dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_SUBSCRIPTION_URL = "https://api.paystack.co/subscription";
const PAYSTACK_CUSTOMER_URL = "https://api.paystack.co/customer";
const PAYSTACK_INITIALIZE_URL =
  "https://api.paystack.co/transaction/initialize";
const PAYSTACK_VERIFY_URL = "https://api.paystack.co/transaction/verify";

type MembershipType = "Explorer" | "Pioneer" | "Voyager";

const plans: Record<MembershipType, string> = {
  Explorer: process.env.PAYSTACK_EXPLORER_PLAN_ID || "",
  Pioneer: process.env.PAYSTACK_PIONEER_PLAN_ID || "",
  Voyager: process.env.PAYSTACK_VOYAGER_PLAN_ID || "",
};

// Function to create a customer on Paystacks
export const createCustomer = async (email: string) => {
  console.log("Creating customer with email:", email); // Logging input
  if (!PAYSTACK_SECRET_KEY) {
    throw new InternalServerError("Paystack secret key is not defined.");
  }

  try {
    const response: any = await axios.post(
      PAYSTACK_CUSTOMER_URL,
      { email },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Customer created successfully:", response.data); // Logging output
    return response.data.data.id;
  } catch (error: any) {
    if (error.response) {
      console.error(`Error creating customer: ${error.response.data.message}`); // Logging error
      throw new BadRequestError(
        `Paystack error: ${error.response.data.message}`
      );
    } else if (error.request) {
      throw new InternalServerError("No response received from Paystack.");
    } else {
      throw new InternalServerError(
        `Error creating Paystack customer: ${error.message}`
      );
    }
  }
};

export const getCustomer = async (email: string) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  try {
    const response = await axios.get(
      `https://api.paystack.co/customer/${email}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    console.log(response.data);

    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const deleteCard = async (authorizationCode: string) => {
  const response = await axios.post(
    "https://api.paystack.co/customer/deactivate_authorization",
    {
      authorization_code: authorizationCode,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  logger.info("Card deactivated:", response.data);
};

// Function to create a payment link
export const createPaymentLink = async (
  email: string,
  amount: number,
  userId: string,
  membershipType: MembershipType,
  planId?: string // Mark planId as optional
) => {
  console.log("Creating payment link for:", {
    email,
    amount,
    userId,
    membershipType,
    planId, // Optional planId
  }); // Logging input

  if (!PAYSTACK_SECRET_KEY) {
    throw new InternalServerError("Paystack secret key is not defined.");
  }

  try {
    // Ensure planId is valid if needed for subscriptions
    if (planId && !plans[membershipType]) {
      throw new BadRequestError(
        "Plan ID is required for creating a payment link."
      );
    }

    const response: any = await axios.post(
      PAYSTACK_INITIALIZE_URL,
      {
        email,
        amount,
        planId, // Include planId for subscriptions or leave it undefined for one-off payments
        currency: "NGN",
        callback_url: "https://chaincoop.org/set-payment-plan/step3",
        metadata: {
          userId,
          membershipType,
          planId, // Ensure this is also included
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Payment link created successfully:", response.data); // Logging output
    return response.data.data.authorization_url; // Return authorization URL
  } catch (error: any) {
    if (error.response) {
      console.error(
        `Error creating payment link: ${error.response.data.message}`
      ); // Logging error
      throw new BadRequestError(
        `Paystack error: ${error.response.data.message}`
      );
    } else if (error.request) {
      throw new InternalServerError("No response received from Paystack.");
    } else {
      throw new InternalServerError(
        `Error creating Paystack payment link: ${error.message}`
      );
    }
  }
};

// Function to verify a payment on Paystack
export const verifyPayment = async (reference: string) => {
  console.log("Verifying payment with reference:", reference); // Logging input
  if (!PAYSTACK_SECRET_KEY) {
    throw new InternalServerError("Paystack secret key is not defined.");
  }

  try {
    const response: any = await axios.get(
      `${PAYSTACK_VERIFY_URL}/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Payment verification response:", response.data); // Logging output
    return response.data.data;
  } catch (error: any) {
    console.error("Error verifying payment:", error); // Logging error
    if (error.response) {
      console.error(
        `Paystack verification error response: ${JSON.stringify(
          error.response.data
        )}`
      ); // Log full error response
      throw new BadRequestError(
        `Paystack error: ${error.response.data.message}`
      );
    } else if (error.request) {
      console.error(
        "No response received from Paystack. Request details:",
        error.request
      ); // Log request details
      throw new InternalServerError("No response received from Paystack.");
    } else {
      console.error(`Unexpected error: ${error.message}`); // Log unexpected errors
      throw new InternalServerError(
        `Error verifying payment: ${error.message}`
      );
    }
  }
};

// Function to create a Paystack subscription
export const createPaystackSubscription = async (
  email: string,
  planId: string
) => {
  console.log(
    "Creating subscription for email:",
    email,
    "with plan ID:",
    planId
  ); // Logging input
  if (!PAYSTACK_SECRET_KEY) {
    throw new InternalServerError("Paystack secret key is not defined.");
  }

  try {
    if (!planId) {
      throw new BadRequestError("Invalid plan code.");
    }

    const response: any = await axios.post(
      PAYSTACK_SUBSCRIPTION_URL,
      {
        customer: email,
        plan: planId,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Subscription created successfully:", response?.data?.message); // Logging output
    return response?.data?.message;
  } catch (error: any) {
    console.error("Error creating subscription:", error.response.data); // Logging error
    if (error.response) {
      throw new BadRequestError(
        `Paystack error: ${error.response.data.message}`
      );
    } else if (error.request) {
      throw new InternalServerError("No response received from Paystack.");
    } else {
      throw new InternalServerError(
        `Error creating Paystack subscription: ${error.message}`
      );
    }
  }
};

// Helper function to get plan ID for a membership type
export const getPlanIdForMembershipType = (
  membershipType: MembershipType
): string | undefined => {
  const planId = plans[membershipType];
  if (!planId) {
    console.error(`No Plan ID found for membership type: ${membershipType}`); // Logging error
    throw new BadRequestError(`No Plan ID configured for ${membershipType}`);
  }
  return planId;
};

//Charge stored card
export const chargeStoredCard = async (
  authorization_code: string,
  email: string,
  amount: number
) => {
  console.log(
    "Charging stored card with authorization code:",
    authorization_code
  ); // Logging input
  if (!PAYSTACK_SECRET_KEY) {
    throw new InternalServerError("Paystack secret key is not defined.");
  }

  try {
    const response: any = await axios.post(
      "https://api.paystack.co/transaction/charge_authorization",
      {
        authorization_code,
        email,
        amount,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Charge stored card response:", response.data); // Logging output
    return response.data.data;
  } catch (error: any) {
    console.error("Error charging stored card:", error.response.data); // Logging error
    if (error.response) {
      throw new BadRequestError(
        `Paystack error: ${error.response.data.message}`
      );
    } else if (error.request) {
      throw new InternalServerError("No response received from Paystack.");
    } else {
      throw new InternalServerError(
        `Error charging stored card: ${error.message}`
      );
    }
  }
};
