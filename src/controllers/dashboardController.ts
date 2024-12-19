import { Request, Response, NextFunction  } from "express";
import { fetchUserStatistics, fetchUsersInfo, fetchUserMembershipStats } from "../services/dashboardService";

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Call the service function to get stats
    const stats = await fetchUserStatistics();

    // Send the response
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const getUsersInfo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const users = await fetchUsersInfo();
  
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
};

export const getUserMembershipStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await fetchUserMembershipStats();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
