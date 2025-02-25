import savingCircleModel, { SavingCircleDocument } from "../models/savingCircle.model";
import axios from "axios";
import dotenv from "dotenv";
import { chargeCardService, findWalletService } from "./walletService";
import User, { UserDocument } from "../models/authModel";
import { BadRequestError, NotFoundError } from "../errors";
import { findUser } from "./authService";

dotenv.config();

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/**
 * Create a new saving circle
 */
export const createCircleService = async (circleData: SavingCircleDocument) => {
  try {
    const circle = new savingCircleModel(circleData);
    await circle.save();
    return circle;
  } catch (error) {
    throw new BadRequestError("Failed to create saving circle");
  }
};

/**
 * Get a saving circle by its ID
 */
export const getCircleService = async (circleId: string) => {
  try {
    const circle = await savingCircleModel.findById(circleId);
    if (!circle) throw new NotFoundError("Circle not found");
    return circle;
  } catch (error) {
    throw error;
  }
};

/**
 * Update a saving circle
 */
export const updateCircleService = async (circleId: string, circleData: Partial<SavingCircleDocument>) => {
  try {
    const circle = await savingCircleModel.findByIdAndUpdate(circleId, circleData, { new: true });
    if (!circle) throw new NotFoundError("Circle not found");
    return circle;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all saving circles for a specific user
 */
export const getCircleServiceByUserId = async (userId: string) => {
  try {
    return await savingCircleModel.find({ "members.userId": userId });
  } catch (error) {
    throw error;
  }
};

/**
 * Get unpaid amount for a user in a specific circle
 */
export const unpaidCircleService = async ({ userId, circleId }: { userId: string; circleId: string }) => {
  try {
    const circle = await savingCircleModel.findOne({
      _id: circleId,
      "members.userId": userId,
      status: "active",
    });
    if (!circle) throw new NotFoundError("Circle not found");

    const member = circle.members.find((m) => m.userId.toString() === userId);
    if (!member) throw new NotFoundError("Member not found in circle");

    return Math.max(circle.currentIndividualTotal! - member.contribution, 0);
  } catch (error) {
    throw error;
  }
};

/**
 * Process a user's payment for a saving circle
 */
export const paymentCircleService = async ({ userId, circleId, amount }: { userId: string; circleId: string; amount: number }) => {
  try {
    const circle = await savingCircleModel.findOne({
      _id: circleId,
      "members.userId": userId,
      status: "active",
    });
    if (!circle) throw new NotFoundError("Circle not found");

    const member = circle.members.find((m) => m.userId.toString() === userId);
    if (!member) throw new NotFoundError("Member not found");

    member.contribution += amount;
    circle.currentIndividualTotal! += amount;
    await circle.save();
    return circle;
  } catch (error) {
    throw error;
  }
};

/**
 * Initialize a payment for a saving circle
 */
export const initializeCircleService = async (circleId: string, paymentType: string, userId: string, cardData?: string) => {
  const debt = await unpaidCircleService({ userId, circleId });
  if (debt === 0) throw new BadRequestError("No unpaid amount");

  const user = await findUser("id", userId);
  if (!user) throw new NotFoundError("User not found");

  const circle = await getCircleService(circleId);
  if (!circle) throw new NotFoundError("Circle not found");

  return await paystackPaymentCircleService({
    paymentType,
    user,
    amount: circle.amount,
    metadata: { circleId: circle._id, type: "circle", userId },
    cardData,
  });
};

/**
 * Handle Paystack payments for a saving circle
 */
export const paystackPaymentCircleService = async ({
  paymentType,
  user,
  amount,
  cardData = "",
  metadata,
}: {
  paymentType: string;
  user: UserDocument;
  amount: number;
  cardData?: string;
  metadata: any;
}) => {
  try {
    if (paymentType === "card") {
      const response = await chargeCardService(cardData, user.email, amount, metadata);
      //@ts-ignore
      if (!response.data.status) throw new BadRequestError(response.data.message);

      const wallet = await findWalletService({ user: user._id });
      if (wallet?.Card) {
        wallet.Card.failedAttempts = 0;
        wallet.markModified("Card");
        await wallet.save();
      }
      //@ts-ignore
      return { reference: response.data.reference, status: response.data.status, type: "card" };
    }

    if (paymentType === "paystack") {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        { amount: amount * 100, email: user.email, metadata },
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
      );
      return { info: response.data, type: "paystack" };
    }

    throw new BadRequestError("Invalid payment type");
  } catch (error) {
    throw error;
  }
};

/**
 * Join savings group
 */

export const joinCircleService = async (circleId: string, userId: string) => {
  // Fetch the circle
  const circle = await savingCircleModel.findById(circleId);
  if (!circle) {
    throw new NotFoundError("Circle not found.");
  }

  // Check if the user is already a member
  const isMember = circle.members.some(member => member.userId.toString() === userId);
  if (isMember) {
    throw new BadRequestError("User is already a member of this circle.");
  }

  // Add user to the members list
  //@ts-ignore
  circle.members.push({ userId });

  // Save the updated circle
  await circle.save();

  return circle;
};

/**
 * Try recurring payments for active saving circles
 */
export const tryRecurringCircleService = async () => {
  const circles = await savingCircleModel.find({
    nextContributionDate: { $lte: new Date() },
    status: "active",
    type: "time",
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  });

  for (const circle of circles) {
    for (const member of circle.members) {
      if (member.status !== "active" || !member.cardData || member.failures! >= 3) continue;

      const amountUnpaid = Math.max(circle.currentIndividualTotal! - member.contribution, 0);
      if (amountUnpaid === 0) continue;

      const user = await findUser("id", member.userId.toString());
      if (!user) continue;

      try {
        const response = await chargeCardService(member.cardData!, user.email, amountUnpaid, {
          circleId: circle._id,
          type: "circle",
          userId: member.userId,
        });
        //@ts-ignore
        if (!response.data.status) {
          member.failures! += 1;
          continue;
        }

        member.failures = 0;
        member.contribution += amountUnpaid;
      } catch (error) {
        member.failures! += 1;
      }
    }

    circle.nextContributionDate = new Date(circle.nextContributionDate!.getTime() + circle.frequency * 24 * 60 * 60 * 1000);
    circle.progress = ((circle.currentIndividualTotal! * circle.members.length) / circle.goalAmount!) * 100;

    if (circle.progress >= 100) {
      circle.status = "completed";
      circle.endDate = new Date();
    }

    await circle.save();
  }
};
