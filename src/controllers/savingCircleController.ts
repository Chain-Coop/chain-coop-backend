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
  verifyPaymentService,
  getAllCirclesService,
  getTotalUserCircleBalance,
  getOtherUsersCirclesService,
  searchCircleByIdService,
  getCircleTransactionsService
} from "../services/savingCircle.services";
import { BadRequestError } from "../errors";
import uploadImageFile from "../utils/imageUploader"; 
import { StatusCodes } from "http-status-codes";
import Transaction from "../models/SavingCircleHistory";

/**
 * Controller to create a new saving circle
 */
export const createCircleController = async (req: Request, res: Response) => {
  try {
    let image = null;
    let imagePublicId = null;

    // Only try upload if there are files
    if (req.files && req.files.image) {
      const uploadedImage = await uploadImageFile(req, "image", "image");
      image = uploadedImage.secure_url;  
      imagePublicId = uploadedImage.public_id;  
    }

    const circleData = req.body;
    //@ts-ignore
    if (!req.user?.userId) {
      throw new BadRequestError("Unauthorized: User ID is missing.");
    }
    //@ts-ignore
    circleData.createdBy = req.user.userId;

    // Add imageUrl and imagePublicId to the circleData
    if (image && imagePublicId) {
      circleData.imageUrl = image;
      circleData.imagePublicId = imagePublicId;
    }

    const circle = await createCircleService(circleData);
    res.status(201).json({ message: "Saving circle created successfully", data: circle });

  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to create saving circle" });
  }
};



/**
 * Controller to join an existing saving circle
 */
export const joinCircleController = async (req: Request, res: Response) => {
  try {
    const { circleId, userId, inviteCode } = req.body;

    if (!circleId || !userId) {
      throw new BadRequestError("circleId and userId are required.");
    }

    const circle = await getCircleService(circleId);
    if (!circle) throw new BadRequestError("Circle not found.");

    if (circle.groupType === "closed" && circle.inviteCode !== inviteCode) {
      throw new BadRequestError("Invalid invite code for this closed circle.");
    }

    const updatedCircle = await joinCircleService(circleId, userId);
    res.status(200).json({ message: "Successfully joined the circle", data: updatedCircle });

  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to join the saving circle" });
  }
};

/**
 * Controller to get all saving circles for a user
 */
export const getUserCirclesController = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    if (!userId) throw new BadRequestError("User ID is required.");

    const circles = await getCircleServiceByUserId(userId);

    const filteredCircles = circles.filter(
      (circle) => circle.groupType === "open" || circle.members.some(member => member.userId.toString() === userId)
    );

    res.status(200).json({ message: "Successfully fetched user circles", data: filteredCircles });

  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to fetch user circles" });
  }
};

/**
 * Get a saving circle by its ID
 */
export const getCircleController = async (req: Request, res: Response) => {
  try {
    const circleId = req.params.circleId;
    //@ts-ignore
    if (!req.user?.userId) throw new BadRequestError("Unauthorized: User ID is missing.");

    const circle = await getCircleService(circleId);
    if (!circle) throw new BadRequestError("Circle not found.");
    //@ts-ignore
    if (circle.groupType === "closed" && !circle.members.some(member => member.userId.toString() === req.user.userId)) {
      throw new BadRequestError("You do not have access to this circle.");
    }

    res.status(200).json({ message: "Successfully fetched the circle", data: circle });

  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to fetch the circle" });
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
    res.status(200).json({ message: "Successfully updated the circle", data: updatedCircle });

  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to update the circle" });
  }
};

/**
 * Initialize a saving circle for payment
 */
export const initializeCircleController = async (req: Request, res: Response) => {
  try {
    const { circleId, paymentType, depositAmount, userId, cardData } = req.body;

    const response = await initializeCircleService(circleId, paymentType, depositAmount, userId, cardData);
    res.status(200).json({ message: "Circle initialized for payment successfully", data: response });

  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to initialize the circle for payment" });
  }
};

/**
 * Make a payment in a saving circle
 */
export const paymentCircleController = async (req: Request, res: Response) => {
  try {
    const { userId, circleId, amount } = req.body;

    const circle = await paymentCircleService({ userId, circleId, amount });
    res.status(200).json({ message: "Payment made successfully", data: circle });

  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to make payment" });
  }
};

/**
 * Get the unpaid amount for a user in a circle
 */
export const unpaidCircleController = async (req: Request, res: Response) => {
  try {
    const { circleId, userId } = req.params;
    if (!circleId || !userId) throw new BadRequestError("circleId and userId are required.");

    const unpaidAmount = await unpaidCircleService({ userId, circleId });
    res.status(200).json({ message: "Successfully fetched unpaid amount", data: { unpaidAmount } });

  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to fetch unpaid amount" });
  }
};

/**
 * Trigger recurring contributions for circles
 */
export const recurringCircleController = async (req: Request, res: Response) => {
  try {
    await tryRecurringCircleService();
    res.status(200).json({ message: "Successfully triggered recurring contributions" });

  } catch (error: any) {
    res.status(error.status || 500).json({ message: error.message || "Failed to trigger recurring contributions" });
  }
};

// Controller for verifying the payment
export const verifyPaymentController = async (req: Request, res: Response) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({
        statusCode: 400,
        data: { message: "Reference is required." },
      });
    }

    // Call the service to verify the payment
    const paymentDetails = await verifyPaymentService(reference as string);

    return res.status(200).json({
      statusCode: 200,
      data: {
        message: "Payment verified successfully",
        data: paymentDetails,
      },
    });
  } catch (error: any) {
    console.error("Error in payment verification controller:", error.message || error);

    return res.status(500).json({
      statusCode: 500,
      data: {
        message: error.message || "Payment verification failed.",
      },
    });
  }
};


/**
 * Controller to get all saving circles with optional status filtering
 */
export const getAllCirclesController = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const userId = req.user?.userId; // Assumes authentication middleware sets req.user
    
    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        error: "User ID is required.",
      });
    }

    // Pass both status and userId to the service
    const circles = await getAllCirclesService(userId, status as string | undefined);

    return res.status(StatusCodes.OK).json({
      status: StatusCodes.OK,
      message: "Group savings retrieved successfully",
      data: circles,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      error: error instanceof Error ? error.message : "An error occurred",
    });
  }
};


export const getUserTotalBalanceController = async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: userId not found" });
  }

  const totalBalance = await getTotalUserCircleBalance(userId);
  res.status(200).json({ 
    userId,
    totalBalance });
};


// Add controller to get public circles from other users
export const getOtherUsersCirclesController = async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  const circles = await getOtherUsersCirclesService(userId);
  res.status(200).json({ circles });
};

// Add controller to get circle by ID
export const searchCircleByIdController = async (req: Request, res: Response) => {
  const { circleId } = req.params;
  const circle = await searchCircleByIdService(circleId);
  if (!circle) return res.status(404).json({ message: "Circle not found" });
  res.status(200).json({ circle });
};


export const getCircleTransactionsController = async (req: Request, res: Response) => {
  try {
    const { circleId } = req.params;
    if (!circleId) {
      return res.status(400).json({ message: "Circle ID is required" });
    }

    const transactions = await getCircleTransactionsService(circleId);
    res.status(200).json({ transactions });
  } catch (error: any) {
    console.error("Error fetching circle transactions:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};