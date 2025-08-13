import express, { Request, Response } from 'express';
import cors from 'cors';
import cron from 'node-cron';
import 'express-async-errors';
import dotenv from 'dotenv';
import { ConnectDB } from './db/connect';
import { notFound } from './middlewares/notFoundMiddleWare';
import { errorHandlerMiddleware } from './middlewares/errorHandler';
import cloudinary from 'cloudinary';
import fileUpload from 'express-fileupload';
import { RequestHandler } from 'express';
// import { initializeServices } from './services/web3/lndService/startupService';

import {
  clearAllPendingContributionsService,
  tryRecurringContributions,
} from './services/contributionService';
import { setupSwagger } from './swagger';

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
  savingCircleRoutes,
  blogRoutes,
  restoreWallets,
  vantWalletRoutes,
} from './routes';
import accountRouter from './routes/web3/accountRoutes';
import balanceRouter from './routes/web3/balanceRoutes';
// import chainCoopManagementRouter from './routes/web3/chaincoopSaving/managementRoutes';
// import chaincoopSavingRoute from './routes/web3/chaincoopSaving/savingRoutes';
import transactionHistory from './routes/web3/transactionHistoryRoutes';
//version 2.0
import chainCoopManagementRouter_2 from './routes/web3/chaincoopSaving.2.0/managementRoutes';
import chaincoopSavingRoute_2 from './routes/web3/chaincoopSaving.2.0/savingRoutes';
import web3SavingCircle from './routes/web3/savingCircles/savingCircleRoutes2';
import periodicSaving from './routes/web3/chaincoopSaving.2.0/periodicSavingRoutes';
import cashwyre from './routes/web3/cashWyre/cashWyre';
import lndRoutes from './routes/web3/lnd/lndRoutes';
//import
import logger from './utils/logger';
import { VantWebhookController, webhookController } from './controllers/webhookController';
import { authorize } from './middlewares/authorization';
import { addtoLimit, getDailyTotal } from './services/dailyServices';
import { tryRecurringCircleService } from './services/savingCircle.services';
import { periodicSavingService } from './services/web3/chaincoopSaving.2.0/periodicSavingService';

dotenv.config();
// console.log(process.env.CLOUD_API_KEY);
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

//Check if app is in development or live and generates cron string
const cronString =
  process.env.NODE_ENV === 'development' ? '*/3 * * * *' : '0 * * * *';

cron.schedule(cronString, () => {
  console.log('Running recurring contributions check...');
  tryRecurringContributions()
    .then(() => console.log('Processed recurring contributions.'))
    .catch((err) => console.error('Error processing contributions:', err));
});

// Clear pending contributions every day at 12:00 AM
cron.schedule('* * * * *', () => {
  console.log('Clearing pending contributions...');
  clearAllPendingContributionsService()
    .then(() => console.log('Cleared pending contributions.'))
    .catch((err) =>
      console.error('Error clearing pending contributions:', err)
    );
});

cron.schedule('0 0 * * *', () => {
  tryRecurringCircleService()
    .then(() => console.log('Processed recurring circles.'))
    .catch((err) => console.error('Error processing circles:', err));
});

cron.schedule('*/1 * * * *', () => {
  console.log('Running recurring contributions check...');
  tryRecurringContributions()
    .then(() => console.log('Processed recurring contributions.'))
    .catch((err) => console.error('Error processing contributions:', err));
});

// Middleware
const app = express();
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp',
  }) as unknown as RequestHandler
);

app.use((req, _res, next) => {
  logger.info({ req }, 'Incoming request');
  next();
});

setupSwagger(app);

const initializeBlockchainServices = async () => {
  const networks = ['BSC', 'LISK', 'ETHERLINK', 'GNOSIS']; // Your supported networks

  for (const network of networks) {
    try {
      console.log(`Initializing periodic saving service for ${network}...`);
      await periodicSavingService.initialize(network);
      console.log(
        `✅ ${network} periodic saving service initialized successfully`
      );
    } catch (error) {
      console.error(
        `❌ Failed to initialize ${network} periodic saving:`,
        error
      );
    }
  }
};
// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/news-letter', newsLetterRouter);
app.use('/api/v1/wallet', walletRouter);
app.use('/api/v1/contact-us', contactRouter);
app.use('/api/v1/proposals', proposalRouter);
app.use('/api/v1/portfolios', portfolioRouter);
app.use('/api/v1/project', projectRouter);
app.use('/api/v1/contribution', contributionRouter);
app.use('/api/v1/profile', profilePictureRouter);
app.use('/api/v1/membership', membershipRouter);
app.use('/api/v1/withdrawal', withdrawalRoutes);
app.use('/api/v1/notification', notificationRouter);
app.use('/api/v1/kyc', kycRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/wallets', restoreWallets);

//web3
app.use('/api/v1/web3/account', accountRouter);
app.use('/api/v1/web3/balance', balanceRouter);
// app.use('/api/v1/web3/management', chainCoopManagementRouter);
// app.use('/api/v1/web3/saving', chaincoopSavingRoute);
app.use('/api/v1/web3/transaction', transactionHistory);

//web3_version 2.0
app.use('/api/v1/web3/v2/management', chainCoopManagementRouter_2);
app.use('/api/v1/web3/v2/saving', chaincoopSavingRoute_2);
app.use('/api/v1/web3/v2/periodicSaving', periodicSaving);
app.use('/api/v1/web3/cashwyre', cashwyre);
app.use('/api/v1/web3/lnd', lndRoutes);

//web3_Saving_circle

app.use('/api/v1/web3/savingcircle', web3SavingCircle);

app.use('/api/v1/savingcircle', savingCircleRoutes);
app.use('/api/v1/blog', blogRoutes);

app.use('/api/v1/vant', vantWalletRoutes);

const port = process.env.PORT || 3000;
const mongoUrl: any = process.env.MONGO_URI;

app.all('/', (req: Request, res: Response) => {
  res.send('Chain Coop Backend');
});

app.all('/webhook', webhookController);

app.all('/add', authorize, async (req: Request, res: Response) => {
  //@ts-ignore
  const data = await getDailyTotal(req.user.userId);
  res.send(data);
});

// Error handling middlewares
app.use(notFound);
app.use(errorHandlerMiddleware);
const start = async () => {
  try {
    await ConnectDB(mongoUrl);
    app.listen(port, () => console.log(`App listening on port ${port}!`));
    initializeBlockchainServices()
      .then(() =>
        console.log('🎉 All blockchain services initialization completed')
      )
      .catch((error) =>
        console.error(
          '⚠️ Some blockchain services failed to initialize:',
          error
        )
      );
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
};

start();
