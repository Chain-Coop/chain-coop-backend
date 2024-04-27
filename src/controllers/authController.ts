import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

const register = async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ msg: "Register user" });
};

export { register };
