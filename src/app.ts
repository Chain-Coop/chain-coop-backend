import express, { Request, Response } from "express";
import cors from "cors";
import "express-async-errors";
import dotenv from "dotenv";
import { ConnectDB } from "./db/connect";
import { notFound } from "./middlewares/notFoundMiddleWare";
import { errorHandlerMiddleware } from "./middlewares/errorHandler";
import cloudinary from "cloudinary";
import fileUpload from "express-fileupload";
dotenv.config();

cloudinary.v2.config({
	cloud_name: process.env.CLOUD_NAME,
	api_key: process.env.CLOUD_API_KEY,
	api_secret: process.env.CLOUD_API_SECRET,
});

// Routers
import { authRouter } from "./routes";

// Middlewares
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

const port = process.env.PORT || 3000;
const mongoUrl: any = process.env.MONGO_URI;

app.get("/", (req: Request, res: Response) => {
	res.send("Chain Co-op Backend");
});

// Error handling middlewares
app.use(notFound);
app.use(errorHandlerMiddleware);
const start = async () => {
	await ConnectDB(mongoUrl);
	app.listen(port, () => console.log(`App listening on port ${port}!`));
};

start();

// Environment: Node
// Build Command: npm ci; npm run build
// Start Command: npm run start
