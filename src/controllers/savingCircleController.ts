import { Request, Response } from "express";
import {
  createCircleService,
  joinCircleService,
  getCircleServiceByUserId,
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
