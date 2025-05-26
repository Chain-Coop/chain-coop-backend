import mongoose, { ObjectId } from "mongoose";
import Contribution, { ContributionDocument } from "../models/contribution";
import ContributionHistory from "../models/contributionHistory";
import { BadRequestError } from "../errors";
import axios from "axios";
import dotenv from "dotenv";
import { findUser } from "./authService";
import { chargeCardService, findWalletService } from "./walletService";
import logger from "../utils/logger";

dotenv.config();

export interface iContribution {
  endDate: Date | undefined;
  startDate: Date | undefined;
  savingsCategory: string;
  _id?: ObjectId;
  user: ObjectId;
  contributionPlan?: string;
  amount: number;
  currency: string;
  status?: string;
  bankDetails?: {
    accountNumber: string;
    bankCode: string;
  };
  balance?: number;
  nextContributionDate?: Date;
  lastContributionDate?: Date;
  paymentReference?: string;
  contributionType: "one-time" | "auto";
}

export interface iContributionHistory {
  contribution: ObjectId;
  user: ObjectId;
  amount: number;
  currency: string;
  Date: Date;
  type: string;
  balance: number;
  status: string;
  withdrawalDate?: Date;
  reference?: string;
  savingsType?: string;
}

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const CONTRIBUTION_CALLBACK_URL = process.env.CONTRIBUTION_CALLBACK_URL;

export const createContributionService = async (data: {
  user: mongoose.Types.ObjectId;
  contributionPlan: string;
  amount: number;
  savingsType: string;
  currency: string;
  savingsCategory: string;
  startDate: Date;
  endDate: Date;
  email: string;
  contributionType: "one-time" | "auto";
}) => {
  try {
    // Calculate savings duration (endDate - startDate in days)
    const savingsDuration =
      (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24);

    const withdrawalDate = new Date(data.endDate);
    withdrawalDate.setDate(withdrawalDate.getDate() + 1);

const contributionPayload: any = {
  user: data.user,
  amount: data.amount,
  savingsType: data.savingsType,
  currency: data.currency,
  savingsCategory: data.savingsCategory,
  startDate: new Date(data.startDate),
  endDate: new Date(data.endDate),
  savingsDuration,
  withdrawalDate,
  lastContributionDate:
    data.contributionType === "one-time"
      ? new Date(data.startDate)
      : new Date(),
  contributionType: data.contributionType,
  balance: 0,
  status: "Pending",
};

// Only set if not one-time
if (data.contributionType !== "one-time") {
  contributionPayload.contributionPlan = data.contributionPlan;
  contributionPayload.nextContributionDate = calculateNextContributionDate(
    data.startDate,
    data.contributionPlan
  );
}

const contribution = await Contribution.create(contributionPayload);


    logger.info(`Created ${data.contributionType} Contribution ID:`, contribution._id);

    return {
      contributionId: contribution._id,
      withdrawalDate: contribution.withdrawalDate,
      savingsDuration: contribution.savingsDuration,
    };
  } catch (error: any) {
    console.error("Error creating contribution:", error);
    throw new BadRequestError(
      error.response ? error.response.data : error.message
    );
  }
};


export const initializeContributionPayment = async (
  contributionId: string,
  paymentType: string,
  userId: string,
  cardData?: string
) => {
  try {
    const debt = await calculateTotalDebt(contributionId);
    if (debt > 0) {
      throw new BadRequestError("Pay Outstanding Debt First");
    }

    const contribution = await Contribution.findById(contributionId);
    const user = await findUser("id", userId);
    if (!contribution || !user) {
      throw new BadRequestError("Contribution not found");
    }

    let response: any;
    if (paymentType === "paystack") {
      response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email: user.email,
          amount: contribution.amount * 100,
          callback_url: CONTRIBUTION_CALLBACK_URL,
          metadata: {
            contributionId: contribution._id,
            type: "conpayment",
          }, 
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );
    } else if (paymentType === "card" && cardData) {
      response = await chargeCardService(
        cardData,
        user.email,
        contribution.amount,
        {
          contributionId: contribution._id,
          type: "conpayment",
        }
      );
      if (!response.data.status && response.data.status !== "success") {
        throw new BadRequestError(response.data.message);
      }

      // Reset failed attempts count on card
      const wallet = await findWalletService({ user: userId });
      if (wallet) {
        const usableCard = wallet.Card;
        if (usableCard) {
          usableCard.failedAttempts = 0;
          wallet.markModified("Card");
          await wallet.save();
        }
      }

      return {
        reference: response.data.reference,
        status: response.data.status,
        type: "card",
      };
    } else {
      throw new BadRequestError("Invalid payment type");
    }

    return { info: response.data, type: "paystack" };
  } catch (error: any) {
    console.error("Error initializing payment:", error);
    throw new BadRequestError(
      error.response ? error.response.data.data : error.message
    );
  }
};

//Service to charge unpaid contributions
export const chargeUnpaidContributions = async (
  contributionId: string,
  paymentType: string,
  cardData?: string
) => {
  const amount = await calculateTotalDebt(contributionId);
  const contribution = await Contribution.findById(contributionId).populate(
    "user"
  );

  if (!amount || amount <= 0) {
    throw new BadRequestError("No unpaid contributions found");
  }

  if (!contribution) {
    throw new BadRequestError("Contribution not found");
  }

  if (paymentType === "paystack") {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        //@ts-ignore
        email: contribution.user.email,
        amount: amount * 100,
        callback_url: CONTRIBUTION_CALLBACK_URL,
        metadata: {
          contributionId: contributionId,
          type: "conunpaid",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return { info: response.data, type: "paystack" };
  } else if (paymentType === "card" && cardData) {
    const response = (await chargeCardService(
      cardData,
      //@ts-ignore
      contribution.user.email,
      amount,
      {
        contributionId: contributionId,
        type: "conunpaid",
      }
    )) as any;

    if (response.data.status !== "success") {
      throw new BadRequestError(response.data.message);
    }

    // Reset failed attempts count on card
    const wallet = await findWalletService({ user: contribution.user });
    if (wallet) {
      const usableCard = wallet.Card;
      if (usableCard) {
        usableCard.failedAttempts = 0;
        wallet.markModified("Card");
        await wallet.save();
      }
    }

    return {
      reference: response.data.reference,
      status: response.data.status,
      type: "card",
    };
  } else {
    throw new BadRequestError("Invalid payment type");
  }
};

export const verifyUnpaidContributionPayment = async (reference: string) => {
  try {
    const referenceExists = await ContributionHistory.countDocuments({
      reference: reference,
    });

    if (referenceExists) {
      throw new BadRequestError("Payment already verified");
    }

    const response: any = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!response || !response?.data) {
      throw new BadRequestError("Invalid response from Paystack");
    }

    const paymentData = response?.data?.data;
    console.log("Payment verification response:", response);

    if (paymentData.status === "success") {
      const { amount, customer } = paymentData;

      const user = await findUser("email", customer.email);
      if (!user) {
        throw new BadRequestError("User not found");
      }

      const contribution = await Contribution.findOne({
        _id: paymentData.metadata.contributionId,
      });

      if (!contribution) {
        throw new BadRequestError("Contribution not found");
      }

      contribution.balance += amount / 100;

      await createContributionHistoryService({
        contribution: contribution._id as ObjectId,
        user: user._id as ObjectId,
        amount: contribution.amount,
        currency: contribution.currency,
        type: "Credit",
        balance: contribution.balance,
        status: "Paid",
        Date: new Date(),
        reference: paymentData.reference,
      });
      console.log("Payment verified:" + paymentData.reference)
      await updateContributionStatusService(
        contribution._id as string,
        "Completed"
      );

      await contribution.save();

      return {
        message: "Payment verified successfully",
        data: {
          contributionId: contribution._id,
          amount: contribution.amount,
          balance: contribution.balance,
        },
      };
    } else {
      throw new BadRequestError("Payment verification failed");
    }
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    throw new BadRequestError(
      error.response ? error.response.data : error.message
    );
  }
};

export const verifyContributionPayment = async (reference: string) => {
  try {
    const referenceExists = await ContributionHistory.countDocuments({
      reference: reference,
    });

    if (referenceExists) {
      throw new BadRequestError("Payment already verified");
    }

    const response: any = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!response || !response?.data) {
      throw new BadRequestError("Invalid response from Paystack");
    }

    const paymentData = response?.data?.data;

    if (paymentData.status === "success") {
      const { amount, customer } = paymentData;

      const user = await findUser("email", customer.email);
      if (!user) {
        throw new BadRequestError("User not found");
      }

      const wallet = await findWalletService({ user: user._id });
      if (!wallet) {
        throw new BadRequestError("Wallet not found");
      }

      // Save card details if not already saved
      if (!wallet.Card?.data) {
        //@ts-ignore
        wallet.Card = {
          data: paymentData.authorization.authorization_code,
          failedAttempts: 0,
        };
        wallet.markModified("Card");
        await wallet.save();
      }

      const rawId = paymentData.metadata.contributionId;

  
      const cleanedId = typeof rawId === "string" ? rawId.replace(/"/g, '') : rawId;
      
 
      const contribution = await Contribution.findOne({
        _id: new mongoose.Types.ObjectId(cleanedId),
      });
      if (!contribution) {
        throw new BadRequestError("Contribution not found");
      }

      // Skip balance update for non-NGN currencies
      if (contribution.currency !== "NGN") {
        logger.info(
          `Payment made with ${contribution.currency}, skipping balance update.`
        );
      } else {
        contribution.balance += amount / 100;
      }

      contribution.paymentReference = paymentData.reference;
      contribution.status = "Completed"; // Ensure status is updated

      // Create Contribution History Entry
      await createContributionHistoryService({
        contribution: contribution._id as ObjectId,
        user: user._id as ObjectId,
        amount: contribution.amount,
        currency: contribution.currency,
        savingsType: contribution.savingsType,
        type: "Credit",
        balance: contribution.balance,
        status: "Completed",
        Date: new Date(),
        reference: contribution.paymentReference,
      });

      await contribution.save(); // Ensure the updated status is persisted

      return {
        message: "Payment verified successfully",
        data: {
          contributionId: contribution._id,
          amount: contribution.amount,
          balance: contribution.balance,
          status: contribution.status, // Return updated status
        },
      };
    } else {
      throw new BadRequestError("Payment verification failed");
    }
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    throw new BadRequestError(
      error.response ? error.response.data : error.message
    );
  }
};


export const tryRecurringContributions = async () => {
  // Process only auto-savings contributions; one-time contributions are skipped.
  const contributions = await Contribution.find({
    contributionType: "auto",
    status: "Completed",
    //endDate: { $gte: new Date() },
    //startDate: { $lte: new Date() },
    //nextContributionDate: { $lt: new Date() },
    // lastChargeDate: {
   //  $lt: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
   // },
  }).populate("user");

  for (let contribution of contributions) {
    // If the contribution's end date has been reached, skip recurring charges.
    if (contribution.endDate && new Date() >= contribution.endDate) {
      console.log(
        `Skipping recurring charge for contribution ${contribution._id} because end date has been reached.`
      );
      continue;
    }

    const session = await mongoose.startSession();
    try {
      contribution.lastChargeDate = new Date();
      const user = contribution.user;
      if (!user) {
        console.warn(
          `Skipping contribution ${contribution._id} as user ${contribution.user} is null`
        );
        continue;
      }

      //@ts-ignore
      const wallet = await findWalletService({ user: user._id });

      if (wallet?.Card?.data) {
        let usableCard = wallet.Card;

        // If the preferred card has failed 3 times, try another card
        if (wallet?.allCards && wallet.allCards.length > 0) {
          const preferredCard = wallet.allCards.find(card => card.isPreferred);
          if (preferredCard) {
            usableCard = {
              data: preferredCard.authCode,
              failedAttempts: preferredCard.failedAttempts,
            };
          }
        }

        // Process recurring charges only if nextContributionDate exists,
        // is in the past, and the current date is still before endDate.
        while (
          contribution.nextContributionDate &&
          contribution.nextContributionDate < new Date() &&
          (!contribution.endDate || new Date() < contribution.endDate)
        ) {
          const charge = (await chargeCardService(
            usableCard.data,
            //@ts-ignore
            user.email,
            contribution.amount
          )) as { data: any };

          if (charge.data && charge.data.status === "success") {
            session.startTransaction();
            try {
              // Update contribution dates and balance for auto-savings
              contribution.lastContributionDate = contribution.nextContributionDate;
              contribution.nextContributionDate = calculateNextContributionDate(
                contribution.nextContributionDate!,
                contribution.contributionPlan!
              );
              contribution.balance += contribution.amount;

              // Set payment reference and log it
              contribution.paymentReference = charge.data.reference;
              console.log("Final Payment Reference:", contribution.paymentReference);

              await contribution.save();

              await createContributionHistoryService({
                contribution: contribution._id as any,
                //@ts-ignore
                user: user._id as any,
                amount: contribution.amount,
                currency: contribution.currency,
                type: "Credit",
                balance: contribution.balance,
                status: "Completed",
                Date: contribution.lastContributionDate!,
                reference: contribution.paymentReference,
                savingsType: contribution.savingsType,
              });

              await contribution.save();
              await session.commitTransaction();
            } catch (err) {
              console.error(err);
              await session.abortTransaction();
            }
            session.endSession();
          } else {
            // Increment failed attempts count on card
            usableCard.failedAttempts
              ? usableCard.failedAttempts++
              : (usableCard.failedAttempts = 1);
            wallet.markModified("allCards");
            await wallet.save();
            break;
          }
        }
      } else {
        console.log("No card found for recurring charge");
        await paymentforContribution(contribution);
      }
    } catch (err) {
      console.error("Error processing recurring contribution:", err);
    }
  }
};



//Update all missed contributions by creating a contribution history and updating the next contribution date
export const updateMissedContributions = async () => {
  const contributions = await Contribution.find({
    status: "Completed",
    nextContributionDate: {
      $lt: new Date(new Date().getTime() - 60 * 60 * 1000),
    },
    endDate: { $gte: new Date() },
    startDate: { $lte: new Date() },
  }).populate("user");

  for (let contribution of contributions) {
    await paymentforContribution(contribution);
  }
};

export const paymentforContribution = async (contribution: any) => {
  // Logic to add unpaid contribution history and update next contribution date
  console.log("Payment for contribution:", contribution._id);

  // Initialize paymentReference if it's not set already
  if (!contribution.paymentReference) {
    contribution.paymentReference = `fallback-ref-${new Date().getTime()}`;
    console.log("Payment Reference initialized:", contribution.paymentReference);
  }

  const session = await mongoose.startSession();
  while (contribution.nextContributionDate < new Date()) {
    try {
      session.startTransaction();
      
      let nextContributionDate = contribution.nextContributionDate;
      contribution.lastContributionDate = contribution.nextContributionDate;
      contribution.nextContributionDate = calculateNextContributionDate(
        nextContributionDate,
        contribution.contributionPlan
      );

      await contribution.save(); 

      // Create contribution history
      await createContributionHistoryService({
        contribution: contribution._id as ObjectId,
        //@ts-ignore
        user: contribution.user._id as ObjectId,
        amount: contribution.amount,
        currency: contribution.currency,
        type: "Credit",
        balance: contribution.balance,
        status: "Unpaid",
        Date: contribution.lastContributionDate,
        reference: contribution.paymentReference, 
      });
      console.log(
        "Contribution history created",
        contribution.lastContributionDate
      );

      await contribution.save();
      await session.commitTransaction();
    } catch (err) {
      console.log(err);
      await session.abortTransaction();
    }
  }

  session.endSession();
};


export const getUnpaidContributionHistory = async (
  contributionId: string,
  attToGet: Array<string>
) => {
  return await ContributionHistory.find(
    {
      contribution: contributionId,
      status: "Unpaid",
    },
    attToGet.join(" ")
  );
};

export const calculateTotalDebt = async (contributionId: string) => {
  const unpaidContributions = await getUnpaidContributionHistory(
    contributionId,
    ["amount"]
  );

  const totalDebt = unpaidContributions.reduce((acc, contribution) => {
    return acc + contribution.amount;
  }, 0);

  return totalDebt;
};

export const updateContributionStatusService = async (
  id: ObjectId | string,
  status: string
) => {
  return await ContributionHistory.updateMany(
    { contribution: id, status: "Unpaid" },
    { status }
  );
};


export const updateContributionService = async (
  id: ObjectId,
  payload: Partial<iContribution>
) => {
  const contribution = await Contribution.findById(id);
  if (!contribution) throw new Error("Contribution not found");

  const categoryBalances = contribution.categoryBalances || {};

  // Skip updating balance for non-NGN currencies
  if (contribution.currency !== "NGN") {
    logger.info(`Skipping balance update for non-NGN currency: ${contribution.currency}`);
    return contribution;
  }

  if (payload.savingsCategory && payload.amount) {
    const oldCategoryBalance =
      categoryBalances[contribution.savingsCategory] || 0;
    categoryBalances[contribution.savingsCategory] =
      oldCategoryBalance - contribution.amount;

    categoryBalances[payload.savingsCategory] =
      (categoryBalances[payload.savingsCategory] || 0) + payload.amount;
  }

  const newTotalBalance = Object.values(categoryBalances).reduce(
    (acc, balance) => acc + balance,
    0
  );

  return await Contribution.findByIdAndUpdate(
    id,
    {
      ...payload,
      categoryBalances,
      balance: newTotalBalance,
    },
    {
      new: true,
      runValidators: true,
    }
  );
};


export const createContributionHistoryService = async (
  payload: iContributionHistory
) => {
  try {
    const contribution = await Contribution.findById(payload.contribution);
    if (!contribution) {
      throw new Error("Contribution not found");
    }

    // Skip history creation for non-NGN contributions
    if (contribution.currency !== "NGN") {
      logger.info(`Skipping history for non-NGN currency: ${contribution.currency}`);
      return; // Skip history creation for non-NGN contributions
    }

    const contributionHistory = await ContributionHistory.create({
      ...payload,
      withdrawalDate: contribution.withdrawalDate,
    });

    return contributionHistory;
  } catch (error) {
    console.error("Error creating contribution history:", error);
    throw new Error("Failed to create contribution history");
  }
};


export const findContributionHistoryService = async (
  contributionId: string
) => {
  return await ContributionHistory.find({
    contribution: contributionId,
    status: { $in: ["Completed", "Unpaid"] },
  }).sort({
    createdAt: -1,
  });
};

export const updateContributionBankDetails = async (
  contributionId: ObjectId,
  bankDetails: { accountNumber: string; bankCode: string }
) => {
  return await Contribution.findByIdAndUpdate(
    contributionId,
    { bankDetails },
    { new: true }
  );
};

export const calculateNextContributionDate = (
  startDate: Date,
  frequency: string | null | undefined
): Date => {
  const date = new Date();

  switch (frequency) {
    case "Daily":
      date.setDate(date.getDate() + 1);
      break;
    case "Weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "Monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "5Minutes":
      date.setMinutes(date.getMinutes() + 2);
      break; 
      case "Hourly":
    date.setHours(date.getHours() + 1);
    break;
    case null:
    case undefined:
      return new Date();
    default:
      throw new Error(`Invalid contribution frequency: ${frequency}`);
  }
  return date;
};

export const findContributionService = async (payload: any) => {
  return await Contribution.findOne(payload).populate("user");
};

export const getAllUserContributionsService = async (
  userId: ObjectId,
  limit = 0,
  skip = 0
) => {
  return await Contribution.find({ user: userId, status: { $ne: "Pending" } })
    .sort({ createdAt: -1 }) 
    .limit(limit)
    .skip(skip);
};

export const getUserContributionsLengthService = async (userId: ObjectId) => {
  return await Contribution.countDocuments({ user: userId });
};

export const getUserContributionStrictFieldsService = async (
  userId: string,
  fields: string[]
) => {
  return await Contribution.find({ user: userId })
    .select(fields.join(" "))
    .lean();
};

export const getContributionHistoryService = async (
  contributionId: string
) => {
  return await ContributionHistory.find({
    contribution: contributionId,
    status: { $ne: "Paid" },
  });
};


export const getHistoryLengthService = async (contributionId: string) => {
  return await ContributionHistory.countDocuments({
    contribution: contributionId,
  });
};

export const getPendingContributionsService = async (userId: String) => {
  return await Contribution.find({ status: "Pending", user: userId });
};

export const clearAllPendingContributionsService = async () => {
  return await Contribution.deleteMany({
    status: "Pending",
    createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
};
