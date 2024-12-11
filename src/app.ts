import express, { Request, Response } from "express";
import cors from "cors";
import cron from "node-cron";
import "express-async-errors";
import dotenv from "dotenv";
import { ConnectDB } from "./db/connect";
import { notFound } from "./middlewares/notFoundMiddleWare";
import { errorHandlerMiddleware } from "./middlewares/errorHandler";
import cloudinary from "cloudinary";
import fileUpload from "express-fileupload";
import { RequestHandler } from "express";

import {
  clearAllPendingContributionsService,
  tryRecurringContributions,
} from "./services/contributionService";
import { setupSwagger } from "./swagger";

// Routers
import {
  authRouter,
  newsLetterRouter,
  walletRouter,
  proposalRouter,
  contactRouter,
  portfolioRouter,
  projectRouter,
  contributionRouter,
  profilePictureRouter,
  membershipRouter,
  withdrawalRoutes,
  notificationRouter,   
  kycRouter,
  dashboardRouter,
} from "./routes";
import account from "./routes/web3/accountRoutes"
import balance from "./routes/web3/balanceRoutes"
//import
import logger from "./utils/logger";
import { webhookController } from "./controllers/webhookController";
import { authorize } from "./middlewares/authorization";
import { addtoLimit, getDailyTotal } from "./services/dailyServices";

dotenv.config();
// console.log(process.env.CLOUD_API_KEY);
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

//Check if app is in development or live and generates cron string
const cronString =
  process.env.NODE_ENV === "development" ? "*/3 * * * *" : "0 * * * *";

cron.schedule(cronString, () => {
  console.log("Running recurring contributions check...");
  tryRecurringContributions()
    .then(() => console.log("Processed recurring contributions."))
    .catch((err) => console.error("Error processing contributions:", err));
});

// Clear pending contributions every day at 12:00 AM
cron.schedule("0 0 * * *", () => {
  console.log("Clearing pending contributions...");
  clearAllPendingContributionsService()
    .then(() => console.log("Cleared pending contributions."))
    .catch((err) =>
      console.error("Error clearing pending contributions:", err)
    );
});

// Middleware
const app = express();
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp",
  }) as unknown as RequestHandler
);


app.use((req, _res, next) => {
  logger.info({ req }, "Incoming request");
  next();
});

setupSwagger(app);

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/news-letter", newsLetterRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/contact-us", contactRouter);
app.use("/api/v1/proposals", proposalRouter);
app.use("/api/v1/portfolios", portfolioRouter);
app.use("/api/v1/project", projectRouter);
app.use("/api/v1/contribution", contributionRouter);
app.use("/api/v1/profile", profilePictureRouter);
app.use("/api/v1/membership", membershipRouter);
app.use("/api/v1/withdrawal", withdrawalRoutes);
app.use("/api/v1/notification", notificationRouter);
app.use("/api/v1/kyc", kycRouter);
app.use("/api/v1/dashboard", dashboardRouter);
//web3 
app.use("/api/v1/web3/account",account)
app.use("/api/v1/web3/balance",balance)


const port = process.env.PORT || 3000;
const mongoUrl: any = process.env.MONGO_URI;

app.all("/", (req: Request, res: Response) => {
  res.send("Chain Coop Backend");
});

app.all("/webhook", webhookController);

app.all("/add", authorize, async (req: Request, res: Response) => {
  //@ts-ignore
  const data = await getDailyTotal(req.user.userId);
  res.send(data);
});

// Error handling middlewares
app.use(notFound);
app.use(errorHandlerMiddleware);
const start = async () => {
  await ConnectDB(mongoUrl);
  app.listen(port, () => console.log(`App listening on port ${port}!`));
};

start();
