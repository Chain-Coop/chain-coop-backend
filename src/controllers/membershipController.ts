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
        throw new ConflictError("You already have an active membership.");
    }

    let bankReceiptUrl = null;

    // Bank Transfer payment method handling
    if (paymentMethod === "BankTransfer") {
        if (!req.files || !req.files.bankReceipt) {
            throw new BadRequestError("Please upload a bank receipt for verification.");
        }

        // Upload the bank receipt image and store its URL
        const uploadedReceipt = await uploadImageFile(req, "bankReceipt", "image");
        bankReceiptUrl = uploadedReceipt.secure_url;

        // Create and activate the membership
        const membership = await createMembershipService({
            user: userId,
            membershipType,
            paymentMethod,
            amount,
            status: "Pending",
            bankReceiptUrl,
            subscriptionUrl: null,
        });

        // ** Update user profile after creating membership **
        await updateUserProfile(userId, {
            membershipStatus: "pending",
            membershipPaymentStatus: "in-progress",
        });

        return res
            .status(StatusCodes.CREATED)
            .json({ message: "Membership activated successfully", membership });
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
        const paymentLink = await createPaymentLink(email, amount * 100, userId, membershipType, planId);
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
    if (!reference) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            statusCode: StatusCodes.BAD_REQUEST,
            message: "Reference is missing from the request."
        });
    }

    try {
        // Verify the payment using the reference
        const paymentDetails = await verifyPayment(reference as string);

        // Log full payment details
        console.log("Full payment details:", JSON.stringify(paymentDetails, null, 2));

        // Check if the payment was successful
        if (paymentDetails.status !== "success") {
            return res.status(StatusCodes.BAD_REQUEST).json({
                statusCode: StatusCodes.BAD_REQUEST,
                message: "Payment verification failed."
            });
        }

        // Validate metadata fields
        const { metadata } = paymentDetails;
        if (!metadata || !metadata.userId || !metadata.membershipType) {
            console.error("Missing metadata from payment verification.");
            throw new InternalServerError("Missing metadata from payment verification.");
        }

        const userId = metadata.userId;
        const membershipType = metadata.membershipType;
        const email = paymentDetails.customer.email;
        const planId = metadata.planId;

        // Check if the user already has an active membership
        const existingMembership = await findMembershipService(userId);
        if (existingMembership && existingMembership.status === "Active") {
            return res.status(StatusCodes.CONFLICT).json({
                statusCode: StatusCodes.CONFLICT,
                message: "Membership is already active.",
            });
        }

        // Create the Paystack subscription if applicable
        let subscriptionResponse = null;
        if (planId) {
            subscriptionResponse = await createPaystackSubscription(email, planId);
            if (!subscriptionResponse) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    statusCode: StatusCodes.BAD_REQUEST,
                    message: "Failed to create subscription.",
                });
            }
        }

        // Create the membership record after successful payment
        const membership = await createMembershipService({
            user: userId,
            membershipType,
            paymentMethod: "PaystackSubscription",
            amount: membershipAmounts[membershipType],
            status: "Active",
            bankReceiptUrl: null,
            membershipPaymentStatus: "in-progress",
            subscriptionUrl: subscriptionResponse ? subscriptionResponse : "Subscription created",
        });

        // Update user profile
        await updateUserProfile(userId, {
            membershipStatus: "pending",
            membershipPaymentStatus: "in-progress",
        });

        // Return the created membership
        return res.status(StatusCodes.OK).json({
            statusCode: StatusCodes.OK,
            message: "Membership activated successfully",
            membership,
        });
    } catch (error) {
        console.error("Error during payment verification:", error);
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

// Example subscription function for testing purposes (not required for production)
export const subscribe = async (req: Request, res: Response) => {
    const email = "testemail@example.com";
    const planId = "PLN_y5mqnz6hvobf7ya";
    const response = await createPaystackSubscription(email, planId);
    res.status(StatusCodes.OK).json({ response });
};
