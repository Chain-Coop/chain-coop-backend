import jwt, { JwtPayload } from 'jsonwebtoken';
import { ForbiddenError, UnauthenticatedError } from '../errors';
import { NextFunction, Request, Response } from 'express';

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

export const authorizePermissions =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    // @ts-ignore
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenError('Access denied');
    }
    next();
  };
