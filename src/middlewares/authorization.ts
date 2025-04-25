import jwt, { JwtPayload } from 'jsonwebtoken';
import { ForbiddenError, UnauthenticatedError } from '../errors';
import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import ts from 'typescript';
import User from '../models/authModel';
type PayloadType = {
  user: {
    email: string;
    userId: string;
    role: string;
  };
};

export const authorize = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthenticatedError('Not authorized');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload & PayloadType;

    // @ts-ignore
    req.user = payload.user;
    next();
  } catch (error) {
    throw new UnauthenticatedError('Authentication invalid');
  }
};

export const verifyPin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { pin } = req.body;
  //@ts-ignore
  const userId = req.user.userId;
  const user = await User.findById(userId).populate('wallet');
  if (!user?.wallet || !user.wallet.pin) {
    throw new Error('Wallet or PIN not found.');
  }
  const isMatch = await bcrypt.compare(pin, user.wallet.pin);
  if (!isMatch) {
    throw new ForbiddenError('Invalid pin');
  }
  next();
};

export const authorizePermissions =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    // @ts-ignore
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenError('Access denied');
    }
    next();
  };
