import { Request, Response, NextFunction } from "express";
import { LogModel } from "../models/logModel"; // Assuming a LogModel is defined to store logs in the database
import { sendEmail } from "../utils/sendEmail";
import { getAdminDetails } from "../services/authService";
import { userLogMail } from "../templates/userlog";


const loggableOperations = new Set([
  "CREATE_CONTRIBUTION",
  "FUND_PROJECT",
  "ACTIVATE_MEMBERSHIP"
]);

// Logger Middleware
export const loggerMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  //@ts-ignore
  const user = req.user;
  const start = Date.now();
  res.on("finish", async () => {
    const duration = Date.now() - start;
    //@ts-ignore
    const logEntry = {
      userId: user?.userId || "Anonymous",
      userEmail: user?.email || "Anonymous",
      timestamp: new Date().toISOString(),
      operation: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ip: req.ip,
      duration: `${duration}ms`,
      userAgent: req.headers["user-agent"] || "Unknown",
    };

    console.log(
      `${new Date().toLocaleString()} LOG [${req.originalUrl}] ${
        logEntry.userAgent
      }::: ip: ${req.ip} time: ${new Date().toLocaleString()} method: ${
        req.method
      } url: ${req.originalUrl} status: ${
        res.statusCode
      } Duration: ${duration}ms`
    );
  });

  next();
};

export const logUserOperation = async (
  userId: string,
  req: Request,
  operation: string,
  status: "Success" | "Failure"
) => {
  try {
    const createLogInput = {
      userId,
      timestamp: new Date().toISOString(),
      operation,
      url: req.originalUrl,
      status,
      ip: req.ip,
      userAgent: req.headers["user-agent"] || "Unknown",
    };
    await LogModel.create(createLogInput);

    const admins = await getAdminDetails();

    const emails = getEmails(admins);

    if (loggableOperations.has(createLogInput.operation)) {
      await sendEmail({
        subject: "Log Entry",
        to: emails,
        html: userLogMail(createLogInput),
      });
    }
  } catch (error) {
    console.error(`Failed to log operation: ${operation}`, error);
  }
};

function getEmails(users: any[]): string[] {
  return users.map((user) => user.email);
}
