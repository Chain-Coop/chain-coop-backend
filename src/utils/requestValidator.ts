//@ts-nocheck

import { Request } from "express";
import { BadRequestError } from "../errors";

export const validateCreateContribution = (req: Request) => {
  const { contributionPlan, amount, savingsCategory, startDate, endDate, pin } =
    req.body;
  if (typeof contributionPlan !== "string") {
    throw new BadRequestError("Contribution plan is required");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new BadRequestError("Amount is required/must be a number");
  }

  if (typeof savingsCategory !== "string") {
    throw new BadRequestError("Savings category is required");
  }

  if (!startDate) {
    throw new BadRequestError("Start date is required");
  }

  if (!endDate) {
    throw new BadRequestError("End date is required");
  }
};

export const registerValidator = (req: Request) => {
  const { email, password } = req.body;

  emailChecker(email);

  //Check if password is at least 6 characters with capital letter, small letter, number and special character
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
  if (!password || !passwordRegex.test(password)) {
    throw new BadRequestError(
      "Password must be at least 6 characters long and include a capital letter, a small letter, a number, and a special character"
    );
  }
};

export const emailChecker = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !regex.test(email)) {
    throw new BadRequestError("Please provide a valid email address");
  }
  return true;
};

export const portfolioCreateValidator = (req: Request) => {
  const { netWorthAsset, assetType } = req.body;

  if (!netWorthAsset || typeof netWorthAsset !== "number") {
    throw new BadRequestError("Net worth asset is required");
  }

  if (!assetType) {
    throw new BadRequestError("Asset type is required");
  }
};

export const createProjectValidator = (req: Request) => {
  const { title, description, projectPrice } = req.body;
  console.log(req.body);

  if (!title) {
    throw new BadRequestError("Title is required");
  }

  if (!description) {
    throw new BadRequestError("Description is required");
  }

  if (!projectPrice) {
    throw new BadRequestError("Project price is required");
  }
};

export const isNumber = (value, name) => {
  if (!value || typeof value !== "number") {
    throw new BadRequestError(`${name} is required / must be a number`);
  }
  return true;
};
