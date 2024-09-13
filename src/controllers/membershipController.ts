import { Request, Response } from "express";
import { createMembershipService, findMembershipService } from "../services/membershipService";
import { findWalletService, updateWalletService } from "../services/walletService";
import { BadRequestError } from "../errors";
import { StatusCodes } from "http-status-codes";
import uploadImageFile from "../utils/imageUploader";
import { createPaystackSubscription, getPlanIdForMembershipType } from '../services/paystackService';

// membership amounts for each type(with temp amounts, will update after they are announced)
const membershipAmounts: Record<string, number> = {
  Explorer: 100000,
  Pioneer: 250000,
  Voyager: 500000,
};

export const activateMembership = async (req: Request, res: Response) => {
    const { membershipType, paymentMethod } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
  
    // Check if the selected membership type is valid
    if (!membershipType || !membershipAmounts[membershipType]) {
      throw new BadRequestError('Invalid membership type.');
    }
  
    // Get the amount based on the selected membership type
    const amount = membershipAmounts[membershipType];
  
    // Check if the user already has an active membership
    const existingMembership = await findMembershipService(userId);
    if (existingMembership && existingMembership.status === 'Active') {
      throw new BadRequestError('You already have an active membership.');
    }
  
    let bankReceiptUrl = null;
    let subscriptionUrl = null;
  
    if (paymentMethod === 'BankTransfer') {
      // Image upload: User must upload the bank transfer receipt image
      if (!req.files || !req.files.bankReceipt) {
        throw new BadRequestError('Please upload a bank receipt for verification');
      }
  
      // Upload the receipt to Cloudinary
      const uploadedReceipt = await uploadImageFile(req, 'bankReceipt', 'image');
      bankReceiptUrl = uploadedReceipt.secure_url;
  
      // For bank transfer, we don't need to deduct from wallet or do any other action
    } else if (paymentMethod === 'PaystackSubscription') {
      const planId = getPlanIdForMembershipType(membershipType);
      if (!planId) {
        throw new BadRequestError('Invalid subscription tier.');
      }
  
      const email = 'user@example.com'; // Replace with actual user email
      subscriptionUrl = await createPaystackSubscription(email, planId);
  
      if (!subscriptionUrl) {
        throw new BadRequestError('Failed to create Paystack subscription');
      }
    } else {
      throw new BadRequestError('Invalid payment method.');
    }
  
    // Create membership record with "Pending" status
    const membership = await createMembershipService({
      user: userId,
      membershipType,
      paymentMethod,
      amount,
      status: 'Pending',
      bankReceiptUrl,
      subscriptionUrl,
    });
  
    res.status(StatusCodes.CREATED).json({ message: 'Membership activated successfully', membership });
  };

export const getMembershipDetails = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userId = req.user.userId;

    const membership = await findMembershipService(userId);

    if (!membership) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "No membership found for this user",
      });
    }

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
