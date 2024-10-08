import { Request, Response, NextFunction } from 'express';

const logRequest = (req: Request, res: Response, next: NextFunction) => {
    console.log(`Incoming request to ${req.originalUrl} with query:`, req.query);
    next();
};

export default logRequest;