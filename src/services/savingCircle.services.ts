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
export const createCircleService = async (circleData: any) => {
  try {
    const { userId, name, groupType, amount, currency, description, goalAmount, duration} = circleData;

    // ✅ Validate required fields
    if (!userId) throw new Error("User ID is required to create a circle.");
    if (!amount) throw new Error("Amount is required.");
    if (!currency) throw new Error("Currency is required.");
    if (!description) throw new Error("Circle description is required.");

    // ✅ Create new saving circle
    const newCircle = new savingCircleModel({
      name,
      groupType,
      amount,
      currency,
      description,
      createdBy: userId,
      goalAmount,
      duration,
      members: [{ userId, contribution: 0, role: "admin" }], // Creator is added as admin
    });

    return await newCircle.save();
  } catch (error) {
    throw error;
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
    return await savingCircleModel
      .find({
        $and: [
          {
            $or: [
              { groupType: "open" }, 
              { "members.userId": userId }, // Ensure the user is a member for closed groups
            ]
          },
          { status: "active" } // Only fetch circles with a status of "active"
        ],
      })
      .sort({ createdAt: -1 }); // Sort by most recent first
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
  try {
    // Ensure the user exists
    const user = await findUser("id", userId);
    if (!user) throw new NotFoundError("User not found");

    // Ensure the circle exists
    const circle = await savingCircleModel.findById(circleId);
    if (!circle) throw new NotFoundError("Circle not found");

    // Ensure the user is a member of the circle
    const member = circle.members.find((m) => m.userId.toString() === userId);
    if (!member) throw new NotFoundError("User is not a member of this circle");

    // Calculate unpaid amount


    const amount = circle.amount

    // Process payment via Paystack or Card
    return await paystackPaymentCircleService({
      paymentType,
      user,
      amount: amount,
      metadata: { circleId: circle._id, type: "circle", userId },
      cardData,
    });
  } catch (error) {
    throw error;
  }
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
    const CALLBACK_URL = process.env.CONTRIBUTION_CALLBACK_URL || "https://chaincoop.org/dashboard/wallet";

    if (paymentType === "card") {
      const response = await chargeCardService(cardData, user.email, amount, metadata);
      //@ts-ignore
      if (!response?.data?.status) throw new BadRequestError(response.data.message);

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
        {
          amount: amount * 100,
          email: user.email,
          metadata,
          callback_url: CALLBACK_URL, // ✅ Redirects user after payment
        },
        {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        }
      );
        //@ts-ignore
      if (!response?.data?.status) throw new BadRequestError("Failed to initialize payment");

      return { 
        info: response.data, 
        type: "paystack", 
        //@ts-ignore
        redirect_url: response.data.data.authorization_url 
      };
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

export const verifyPaymentService = async (reference: string) => {
  try {
    if (!reference) {
      throw new Error("Reference is required to verify payment.");
    }

    // Fetch payment details from Paystack
    const { data: payment } = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    console.log("Paystack response:", payment);

    // Validate Paystack response
    //@ts-ignore
    if (payment?.status !== true || payment?.data?.status !== "success") {
      throw new Error("Payment verification failed or is not successful.");
    }

    // Extract required data
    //@ts-ignore
    const { metadata, amount } = payment.data;

    if (!metadata?.circleId || !metadata?.userId) {
      throw new Error("Missing circle ID or user ID in payment metadata.");
    }

    // Find the SavingCircle in the database
    const savingCircle = await savingCircleModel.findById(metadata.circleId);

    if (!savingCircle) {
      throw new Error("Saving circle not found.");
    }

    // Update balance and member contribution status
    savingCircle.balance += amount / 100; // Convert from kobo to Naira
    savingCircle.status = "active";

    const memberIndex = savingCircle.members.findIndex(
      (member) => member.userId.toString() === metadata.userId
    );

    if (memberIndex !== -1) {
      savingCircle.members[memberIndex].status = "completed";
      savingCircle.members[memberIndex].contribution += amount / 100;
    } else {
      throw new Error("Member not found in saving circle.");
    }

// Update the progress towards the goal
if (savingCircle.goalAmount === undefined || savingCircle.goalAmount === 0) {
  throw new Error("Saving circle goal amount is not set or is invalid.");
}

    const totalContributions = savingCircle.members.reduce(
      (sum, member) => sum + member.contribution,
      0
    );

    const newProgress = (totalContributions / savingCircle.goalAmount) * 100;

    // If progress is 100%, mark the circle as completed
    if (newProgress >= 100) {
      savingCircle.status = "completed";
      savingCircle.endDate = new Date();
    }

    savingCircle.progress = newProgress;


    await savingCircle.save();

    return {
      savingCircleId: savingCircle._id,
      amount: amount / 100,
      balance: savingCircle.balance,
      status: "Completed",
    };
  } catch (error: any) {
    console.error("Error verifying payment:", error.response?.data || error.message || error);
    throw new Error(error.response?.data?.message || "An error occurred while verifying payment.");
  }
};
