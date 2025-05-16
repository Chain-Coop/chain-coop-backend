// // routes/lndRoutes.ts
// import express from 'express';
// import * as lndController from '../../../controllers/web3/lnd/lndController';
// import { authorize } from '../../../middlewares/authorization';


// const router = express.Router();

// // Wallet routes
// router.get('/wallet/info', authorize,lndController.getWalletInfo);
// router.post('/wallet/address',authorize, lndController.createBitcoinAddress);

// // Invoice routes
// router.post('/invoice/create',authorize, lndController.createInvoice);
// router.get('/invoice/:id',authorize, lndController.getInvoice);
// router.post('/invoice/webhook',authorize, lndController.setupInvoiceWebhook);
// router.post('/invoice/decode', lndController.decodeInvoice);

// // Payment routes
// router.post('/payment/send',authorize, lndController.payInvoice);
// router.get('/channels', authorize,lndController.getChannels);

// router.get('/transactions',authorize, lndController.getTransactions);
// router.get('/userInvoice',authorize, lndController.getUserInvoices);
// router.get('/userPayment',authorize, lndController.getUserPayments);
// router.get('/userWallet',authorize, lndController.getWalletDetails);

// export default router;
