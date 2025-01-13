import { Request, Response } from "express";
import {
  createCircleService,
  joinCircleService,
  getCircleServiceByUserId,
  getCircleService,
  updateCircleService,
  initializeCircleService,
  paymentCircleService,
  unpaidCircleService,
  tryRecurringCircleService,
} from "../services/savingCircle.services";
import { BadRequestError } from "../errors";

/**
 * Controller to create a new saving circle
 */
export const createCircleController = async (req: Request, res: Response) => {
  try {
    const circleData = req.body;
    // @ts-ignore
    circleData.createdBy = req.user.userId;
    if (circleData.type === "time") {
      const frequencyInDays = req.body.frequencyInDays;
      if (!frequencyInDays || typeof frequencyInDays !== "number") {
        throw new BadRequestError(
          "Frequency in days is required and must be a number"
        );
      }
      const nextContributionDate = new Date();
      nextContributionDate.setDate(
        nextContributionDate.getDate() + frequencyInDays
      );
      circleData.nextContributionDate = nextContributionDate;

      circleData.currentIndividualTotal = circleData.amount;

      circleData.endDate = new Date(
        new Date().setDate(new Date().getDate() + circleData.duration)
      );
    }
    const circle = await createCircleService(circleData);
    res.status(201).json({
      message: "Saving circle created successfully",
      data: circle,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to create saving circle",
    });
  }
};

/**
 * Controller to join an existing saving circle
 */
export const joinCircleController = async (req: Request, res: Response) => {
  try {
    const { circleId, userId } = req.body;

    if (!circleId || !userId) {
      throw new BadRequestError("circleId and userId are required");
    }

    const circle = await joinCircleService(circleId, userId);
    res.status(200).json({
      message: "Successfully joined the circle",
      data: circle,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to join the saving circle",
    });
  }
};

/**
 * Controller to get all saving circles for a user
 */
export const getUserCirclesController = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      throw new BadRequestError("User ID is required");
    }

    const circles = await getCircleServiceByUserId(userId);
    res.status(200).json({
      message: "Successfully fetched user circles",
      data: circles,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch user circles",
    });
  }
};

/**
 * Get a saving circle by its ID
 */
export const getCircleController = async (req: Request, res: Response) => {
  try {
    const circleId = req.params.circleId;

    const circle = await getCircleService(circleId);
    if (!circle) {
      throw new BadRequestError("Circle not found");
    }

    res.status(200).json({
      message: "Successfully fetched the circle",
      data: circle,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch the circle",
    });
  }
};

/**
 * Update a saving circle by its ID
 */
export const updateCircleController = async (req: Request, res: Response) => {
  try {
    const circleId = req.params.circleId;
    const circleData = req.body;

    const updatedCircle = await updateCircleService(circleId, circleData);
    res.status(200).json({
      message: "Successfully updated the circle",
      data: updatedCircle,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to update the circle",
    });
  }
};

/**
 * Initialize a saving circle for payment
 */
export const initializeCircleController = async (req: Request, res: Response) => {
  try {
    const { circleId, paymentType, userId, cardData } = req.body;

    const response = await initializeCircleService(circleId, paymentType, userId, cardData);
    res.status(200).json({
      message: "Circle initialized for payment successfully",
      data: response,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to initialize the circle for payment",
    });
  }
};

/**
 * Make a payment in a saving circle
 */
export const paymentCircleController = async (req: Request, res: Response) => {
  try {
    const { userId, circleId, amount } = req.body;

    const circle = await paymentCircleService({ userId, circleId, amount });
    res.status(200).json({
      message: "Payment made successfully",
      data: circle,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to make payment",
    });
  }
};

/**
 * Get the unpaid amount for a user in a circle
 */
export const unpaidCircleController = async (req: Request, res: Response) => {
  try {
    const { circleId, userId } = req.params;

    const unpaidAmount = await unpaidCircleService({ userId, circleId });
    res.status(200).json({
      message: "Successfully fetched unpaid amount",
      data: { unpaidAmount },
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch unpaid amount",
    });
  }
};

/**
 * Trigger recurring contributions for circles
 */
export const recurringCircleController = async (req: Request, res: Response) => {
  try {
    await tryRecurringCircleService();
    res.status(200).json({
      message: "Successfully triggered recurring contributions",
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to trigger recurring contributions",
    });
  }
};
