import savingCircleModel, { SavingCircleDocument } from "../models/savingCircle.model";
import axios from "axios";
import dotenv from "dotenv";
import { chargeCardService, findWalletService } from "./walletService";
import User, { UserDocument } from "../models/authModel";
import { BadRequestError, NotFoundError } from "../errors";
import { findUser } from "./authService";
import Transaction from "../models/SavingCircleHistory";

dotenv.config();

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;


/**
 * Create a new saving circle
 */


export const createCircleService = async (circleData: any) => {
  try {
    const {
      userId, 
      name, 
      groupType, 
      depositAmount, 
      currency, 
      description, 
      goalAmount, 
      savingFrequency, 
      startDate, 
      endDate, 
      imageUrl,  
      imagePublicId 
    } = circleData;

    // ✅ Validate required fields
    if (!userId) throw new Error("User ID is required to create a circle.");
    if (!currency) throw new Error("Currency is required.");
    if (!description) throw new Error("Circle description is required.");
    if (!savingFrequency) throw new Error("Saving frequency is required.");
    if (!startDate || !endDate) throw new Error("Start Date and End Date are required.");
    if (!goalAmount) throw new Error("Goal Amount is required!");

    // Convert string dates to Date objects if needed
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date format for start or end date.");
    }

    // Validate that goalAmount and depositAmount are valid numbers
    if (goalAmount <= 0) throw new Error("Goal Amount should be greater than 0.");
    if (depositAmount && depositAmount <= 0) throw new Error("Deposit Amount should be greater than 0.");

    // ✅ Create new saving circle object
    const newCircleData = {
      name,
      groupType,
      depositAmount,
      currency,
      description,
      createdBy: userId,
      goalAmount,
      savingFrequency,
      startDate: start,
      endDate: end,
      members: [{ userId, contribution: 0, role: "admin" }],  
      imageUrl,
      imagePublicId 
    };

  
    if (imageUrl && imagePublicId) {
      newCircleData.imageUrl = imageUrl;
      newCircleData.imagePublicId = imagePublicId;
    }


    // ✅ Create and save the new saving circle
    const newCircle = new savingCircleModel(newCircleData);
    return await newCircle.save();
    
  } catch (error) {
    // Handle errors appropriately
    //@ts-ignore
    throw new Error(`Failed to create saving circle: ${error.message}`);
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
          { status: { $in: ["active", "pending"] } } // Wrap this in an object
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
    
    // ✅ Add this
    member.progress = (member.contribution / circle.goalAmount!) * 100;
    
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
export const initializeCircleService = async (circleId: string, paymentType: string, depositAmount: number, userId: string, cardData?: string) => {
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


    const amount = depositAmount

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
  circle.members.push({ userId, contribution: 0, role: "member", status: "active" });

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
        member.progress = (member.contribution / circle.goalAmount!) * 100;
      } catch (error) {
        member.failures! += 1;
      }
    }

    function mapFrequencyToDays(frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly"): number {
      switch (frequency) {
        case "Daily":
          return 1;
        case "Weekly":
          return 7;
        case "Monthly":
          return 30;
        case "Quarterly":
          return 90;
        default:
          return 30; // fallback if not specified
      }
    }
    

    const frequencyInDays = mapFrequencyToDays(circle.depositFrequency);

    circle.nextContributionDate = new Date(
      circle.nextContributionDate!.getTime() + frequencyInDays * 24 * 60 * 60 * 1000
    );
    
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

if (!savingCircle || !savingCircle._id) {
  throw new Error(`SavingCircle with ID ${metadata.circleId} not found or invalid.`);
}
console.error("SavingCircle to be saved:", JSON.stringify(savingCircle, null, 2));


    // Update balance and member contribution status
    savingCircle.balance += amount / 100; // Convert from kobo to Naira
    savingCircle.status = "active";

    const memberIndex = savingCircle.members.findIndex(
      (member) => member.userId.toString() === metadata.userId
    );

    if (memberIndex !== -1) {
      const member = savingCircle.members[memberIndex];
      member.status = "completed";
      member.contribution += amount / 100;
    
      // ✅ Add this to update individual progress
      member.progress = (member.contribution / savingCircle.goalAmount!) * 100;
    }
     else {
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

    // ✅ Create a transaction record
    await Transaction.create({
      userId: metadata.userId,
      circleId: metadata.circleId,
      amount: amount / 100,
      type: "credit",
      reference,
      status: "success",
    });


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

/**
 * Get all saving circles with optional status filtering
 */
export const getAllCirclesService = async (userId: string, status?: string) => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error("User ID is required to filter out user's own circles.");
    }

    // Initialize filter
    let filter: any = {
      createdBy: { $ne: userId }, // Exclude circles created by this user
    };

    // Optional status filtering
    if (status) {
      const allowedStatuses = ["active", "completed", "pending"];
      if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid status. Only 'active', 'completed', or 'pending' are allowed.");
      }
      filter.status = status;
    }

    // Fetch filtered and sorted circles
    const circles = await savingCircleModel.find(filter).sort({ createdAt: -1 });

    return circles;
  } catch (error) {
    throw error;
  }
};


// Add a new function to calculate total user balance
export const getTotalUserCircleBalance = async (userId: string) => {
  const circles = await savingCircleModel.find({ "members.userId": userId });
  const total = circles.reduce((sum, circle) => {
    const member = circle.members.find(m => m.userId.toString() === userId);
    return member ? sum + member.contribution : sum;
  }, 0);
  return total;
};

// New service to get public/open circles by others
export const getOtherUsersCirclesService = async (userId: string) => {
  return await savingCircleModel.find({
    groupType: "open",
    createdBy: { $ne: userId },
  });
};

// Search circle by ID
export const searchCircleByIdService = async (circleId: string) => {
  return await savingCircleModel.findById(circleId);
};

export const getCircleTransactionsService = async (circleId: string) => {
  return await Transaction.find({ circleId }).sort({ createdAt: -1 });
};