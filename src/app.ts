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
import {
  clearAllPendingContributionsService,
  tryRecurringContributions,
  updateMissedContributions,
  verifyContributionPayment,
} from "./services/contributionService";

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
} from "./routes";

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
  })
);

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

const port = process.env.PORT || 3000;
const mongoUrl: any = process.env.MONGO_URI;

app.all("/", (req: Request, res: Response) => {
  res.send("Chain Coop Backend");
});

app.all("/webhook", async (req: Request, res: Response) => {
  console.log("Webhook called");

  const data = req.body;
  if (data.event !== "charge.success") {
    return res.status(200);
  }

  res.status(200).json({ message: "Webhook received" });

  if (
    data.data.status === "success" &&
    data.data.metadata.type === "conpayment"
  ) {
    await verifyContributionPayment(data.data.reference);
  }
});

// Error handling middlewares
app.use(notFound);
app.use(errorHandlerMiddleware);
const start = async () => {
  await ConnectDB(mongoUrl);
  app.listen(port, () => console.log(`App listening on port ${port}!`));
};

start();
