import savingCircleModel, {
  SavingCircleDocument,
} from "../models/savingCircle.model";
import axios, { get } from "axios";
import dotenv from "dotenv";
import { chargeCardService, findWalletService } from "./walletService";
import User, { UserDocument } from "../models/authModel";
import { BadRequestError } from "../errors";
import { findUser } from "./authService";

dotenv.config();

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export const createCircleService = async (circleData: SavingCircleDocument) => {
  try {
    const circle = new savingCircleModel(circleData);
    await circle.save();
    return circle;
  } catch (error) {
    throw error;
  }
};

//Get a circle by its ID
export const getCircleService = async (circleId: string) => {
  try {
    const circle = await savingCircleModel.findById(circleId);
    return circle;
  } catch (error) {
    throw error;
  }
};

//Update a circle by its ID
export const updateCircleService = async (
  circleId: string,
  circleData: Partial<SavingCircleDocument>
) => {
  try {
    const circle = await savingCircleModel.findByIdAndUpdate(
      circleId,
      circleData,
      { new: true }
    );
    return circle;
  } catch (error) {
    throw error;
  }
};

//Get all circles for a user
export const getCircleServiceByUserId = async (userId: string) => {
  try {
    const circle = await savingCircleModel.find({ "members.userId": userId });
    return circle;
  } catch (error) {
    throw error;
  }
};

export const initializeCircleService = async (
  circleId: string,
  paymentType: string,
  userId: string,
  cardData?: string
) => {
  const debt = await unpaidCircleService({ userId, circleId });
  if (debt >= 0) {
    throw new Error("No unpaid amount");
  }

  const user = await findUser("id", userId);
  if (!user) {
    throw new Error("User not found");
  }

  const circle = await getCircleService(circleId);
  if (!circle) {
    throw new Error("Circle not found");
  }
  const response = await paystackPaymentCircleService({
    paymentType,
    user,
    amount: circle.amount,
    metadata: { circleId: circle._id, type: "circle", userId: userId },
    cardData,
  });

  return response;
};

//Get the unpaid amount for a circle by a user
export const unpaidCircleService = async ({
  userId,
  circleId,
}: {
  userId: string;
  circleId: string;
}) => {
  try {
    const circle = await savingCircleModel.findOne({
      _id: circleId,
      "members.userId": userId,
      status: "active",
    });
    if (!circle) {
      throw new Error("Circle not found");
    }
    const amount =
      circle.members.find((member) => member.userId.toString() === userId)
        ?.contribution || 0;
    return circle.currentIndividualTotal! - amount;
  } catch (error) {
    throw error;
  }
};

export const paymentCircleService = async ({
  userId,
  circleId,
  amount,
}: {
  userId: string;
  circleId: string;
  amount: number;
}) => {
  try {
    const circle = await savingCircleModel.findOne({
      _id: circleId,
      "members.userId": userId,
      status: "active",
    });
    if (!circle) {
      throw new Error("Circle not found");
    }
    const member = circle.members.find(
      (member) => member.userId.toString() === userId
    );
    if (!member) {
      throw new Error("Member not found");
    }
    member.contribution += amount;
    circle.currentIndividualTotal! += amount;
    await circle.save();
    return circle;
  } catch (error) {
    throw error;
  }
};

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
    let response: any;

    if (paymentType === "card") {
      response = await chargeCardService(
        cardData,
        user.email,
        amount,
        metadata
      );

      if (!response.data.status && response.data.status !== "success") {
        throw new BadRequestError(response.data.message);
      }

      const wallet = await findWalletService({ user: user._id });
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
    }

    if (paymentType === "paystack") {
      response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          amount: amount * 100,
          email: user.email,
          metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      return { info: response.data, type: "paystack" };
    }

    throw new Error("Invalid payment type");
  } catch (error) {
    throw error;
  }
};

export const joinCircleService = async (circleId: string, userId: string) => {
  try {
    const circle = await getCircleService(circleId);
    const user = circle?.members.find(
      (member) => member.userId.toString() === userId
    );
    if (!user) {
      throw new Error("User not in circle");
    }

    if (user.status === "active") {
      throw new Error("User already in circle");
    }

    user.status = "active";
    await circle?.save();
    return circle;
  } catch (error) {
    throw error;
  }
};

export const tryRecurringCircleService = async () => {
  const circles = await savingCircleModel.find({
    nextContributionDate: { $lte: new Date() },
    status: "active",
    type: "time",
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  });

  for (const circle of circles) {
    circle.currentIndividualTotal! += circle.amount;

    const members = circle.members;
    for (const member of members) {
      if (member.status === "active") {
        const amountUnpaid =
          circle.currentIndividualTotal! - member.contribution;
        if (amountUnpaid < 0 || !member.cardData || member.failures! >= 3) {
          continue;
        }

        let response: any;

        const user = await findUser("id", member.userId.toString());

        if (!user) {
          continue;
        }

        response = await chargeCardService(
          member.cardData!,
          user.email,
          amountUnpaid,
          {
            circleId: circle._id,
            type: "circle",
            userId: member.userId,
          }
        );

        if (!response.data.status && response.data.status !== "success") {
          member.failures! += 1;
          continue;
        } else {
          member.failures = 0;
          member.contribution += amountUnpaid;
        }

        await circle.save();
      }
    }

    circle.nextContributionDate = new Date(
      circle.nextContributionDate.getTime() +
        circle.frequency * 24 * 60 * 60 * 1000
    );

    circle.progress =
      ((circle.currentIndividualTotal! * members.length) / circle.goalAmount!) *
      100;

    if (circle.progress >= 100) {
      circle.status = "completed";
      circle.endDate = new Date();
    }

    await circle.save();
  }
};
