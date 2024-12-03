import { Request, Response } from "express";
import {
  createMembershipService,
  findMembershipService,
} from "../services/membershipService";
import { BadRequestError, ConflictError, NotFoundError } from "../errors";
import { StatusCodes } from "http-status-codes";
import uploadImageFile from "../utils/imageUploader";
import {
  createPaystackSubscription,
  getPlanIdForMembershipType,
  createPaymentLink,
  verifyPayment,
} from "../services/paystackService";
import { updateUserProfile } from "../services/userService";
import { logUserOperation } from "../middlewares/logging";
import { addCardService } from "../services/walletService";

// Membership amounts for each type
const membershipAmounts: Record<string, number> = {
  Explorer: 5000,
  Pioneer: 25000,
  Voyager: 10000,
};

// Activate membership based on payment method (BankTransfer/Paystack)
export const activateMembership = async (req: Request, res: Response) => {
  const { membershipType, paymentMethod } = req.body;
  //@ts-ignore
  const userId = req.user.userId;

  // Validate membership type
  if (!membershipType || !membershipAmounts[membershipType]) {
    throw new BadRequestError("Invalid membership type.");
  }

  const amount = membershipAmounts[membershipType];

  // Check if the user already has an active membership
  const existingMembership = await findMembershipService(userId);
  if (existingMembership && existingMembership.status === "Active") {
    return res.json({ msg: "You already have an active membership." });
  }

  // Bank Transfer payment method handling
  if (paymentMethod === "onceOff") {
    // **No need for bank receipt for onceOff Paystack payment**

    // Create Paystack one-off payment link
    //@ts-ignore
    const email = req.user.email;

    // Create payment link for one-time payment via Paystack (planId is not required)
    const paymentLink = await createPaymentLink(
      email,
      amount * 100,
      userId,
      membershipType
    );

    // Update user profile for one-off payment
    await updateUserProfile(userId, {
      membershipStatus: "active",
      membershipPaymentStatus: "paid",
      //paymentMethod: "onceOff", // Record the payment method
    });

    // ** Return the Paystack payment link for one-off payment **
    return res.status(StatusCodes.OK).json({ paymentLink });
  }
  // Paystack Subscription payment method handling
  else if (paymentMethod === "PaystackSubscription") {
    //@ts-ignore
    const email = (req.user as { email: string }).email;
    const planId = getPlanIdForMembershipType(membershipType);
    if (!planId) {
      throw new BadRequestError("Invalid subscription tier.");
    }

    // Create payment link for Paystack subscription
    const paymentLink = await createPaymentLink(
      email,
      amount * 100,
      userId,
      membershipType,
      planId
    );

    // Update user profile for subscription payment
    await updateUserProfile(userId, {
      membershipStatus: "pending",
      membershipPaymentStatus: "in-progress",
      // paymentMethod: "PaystackSubscription", // Record the payment method
    });

    return res.status(StatusCodes.OK).json({ paymentLink });
  }
  // Invalid payment method error
  else {
    throw new BadRequestError("Invalid payment method.");
  }
};

// Verify Paystack payment and activate the membership
export const verifyPaymentCallback = async (req: Request, res: Response) => {
  const { reference } = req.query;

  let userId: string | null = null;

  try {
    // Verify the payment using the reference provided
    const paymentDetails = await verifyPayment(reference as string);
    if (paymentDetails.status === "success") {
      userId = paymentDetails.metadata.userId;
      const membershipType = paymentDetails.metadata.membershipType;
      const email = paymentDetails.customer.email;
      const planId = paymentDetails.metadata.planId;

      // Store card code for future payments
      if (
        paymentDetails.authorization.reusable &&
        paymentDetails.authorization.authorization_code
      ) {
        const userId = paymentDetails.metadata.userId;

        await addCardService(userId, {
          authCode: paymentDetails.authorization.authorization_code,
          number: paymentDetails.authorization.last4,
        });
      }

      // Check if the user already has an active membership
      //@ts-ignore
      const existingMembership = await findMembershipService(userId);
      if (existingMembership && existingMembership.status === "Active") {
        return res.status(StatusCodes.CONFLICT).json({
          statusCode: StatusCodes.CONFLICT,
          message: "Membership is already active.",
        });
      }

      // Create variables to hold values based on payment method
      let subscriptionResponse: string | null = null;
      let paymentMethod: "PaystackSubscription" | "onceOff";
      let membershipPaymentStatus: "in-progress" | "paid" | undefined;
      let membershipStatus: "active" | "pending" | undefined;

      // If payment method is PaystackSubscription, create a subscription
      if (planId) {
        paymentMethod = "PaystackSubscription";
        membershipPaymentStatus = "in-progress";
        membershipStatus = "pending";

        subscriptionResponse = await createPaystackSubscription(email, planId);
        if (!subscriptionResponse) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            statusCode: StatusCodes.BAD_REQUEST,
            message: "Failed to create subscription.",
          });
        }
      } else {
        paymentMethod = "onceOff"; // Default to onceOff if no planId is provided
        membershipPaymentStatus = "paid";
        membershipStatus = "active";
      }

      // Create the membership record after successful payment verification
      const membership = await createMembershipService({
        user: userId,
        membershipType,
        paymentMethod, // Set paymentMethod based on logic
        amount: membershipAmounts[membershipType],
        status: membershipStatus, // Set status based on payment method
        bankReceiptUrl: null,
        membershipPaymentStatus, // Set membershipPaymentStatus based on payment method
        subscriptionUrl: subscriptionResponse
          ? subscriptionResponse
          : "One-off payment verified successfully",
      });

      // ** Update user profile after successful membership creation **
      //@ts-ignore
      await updateUserProfile(userId, {
        membershipStatus: membershipStatus, // Ensure only valid types are assigned
        membershipPaymentStatus, // Update payment status accordingly
      });
      //@ts-ignore
      await logUserOperation(userId, req, "ACTIVATE_MEMBERSHIP", "Success");

      // Return the created membership and payment details
      return res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        message: "Membership activated successfully",
        membership: {
          user: membership.user,
          membershipType: membership.membershipType,
          status: membership.status,
          paymentMethod: membership.paymentMethod,
          amount: membership.amount,
          bankReceiptUrl: membership.bankReceiptUrl,
          subscriptionUrl: membership.subscriptionUrl,
          _id: membership._id,
          activationDate: membership.activationDate,
          //@ts-ignore
          createdAt: membership.createdAt,
          //@ts-ignore
          updatedAt: membership.updatedAt,
          __v: membership.__v,
        },
      });
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Payment verification failed.",
      });
    }
  } catch (error) {
    //@ts-ignore
    await logUserOperation(userId, req, "ACTIVATE_MEMBERSHIP", "Failure");

    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "An error occurred during payment verification.",
    });
  }
};

// Retrieve membership details for the logged-in user
export const getMembershipDetails = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    // Find membership details by userId
    const membership = await findMembershipService(userId);

    if (!membership) {
      throw new NotFoundError("No membership found for this user.");
    }

    // Return membership details to the client
    return res.status(StatusCodes.OK).json({
      membershipType: membership.membershipType,
      status: membership.status,
      paymentMethod: membership.paymentMethod,
      bankReceiptUrl: membership.bankReceiptUrl || null,
      activationDate: membership.activationDate,
      amount: membership.amount,
      subscriptionUrl: membership.subscriptionUrl || null,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while fetching membership details",
    });
  }
};
