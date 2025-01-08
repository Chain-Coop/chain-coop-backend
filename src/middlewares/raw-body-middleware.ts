import { Request, Response, NextFunction } from 'express';

declare global {
    namespace Express {
        interface Request {
            rawBody: string;
        }
    }
}

export const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    req.rawBody = '';
    req.on('data', (chunk) => {
        req.rawBody += chunk;
    });
    req.on('end', () => {
        next();
    });
};