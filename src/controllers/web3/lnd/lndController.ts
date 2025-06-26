// // controllers/lndController.ts
// import Invoice, { IInvoice } from '../../../models/web3/lnd/invoice';
// import Payment, { IPayment } from '../../../models/web3/lnd/payment';
// import Transaction, {
//   ITransaction,
// } from '../../../models/web3/lnd/transaction';
// import LndWallet, { ILndWallet } from '../../../models/web3/lnd/wallet';
// import mongoose from 'mongoose';

import { Request, Response } from 'express';
import * as lndService from '../../../services/web3/lndService/lndService';
import { StatusCodes } from 'http-status-codes';
import bolt11 from 'bolt11';
import { AddInvoice, PayInvoice, decodeInvoice } from '../../../utils/web3/lnd';
import { IInvoice } from '../../../models/web3/lnd/invoice';
import { Types, Error } from 'mongoose';
import { IPayment } from '../../../models/web3/lnd/payment';

// Create a controller to get invoice by Id
// export const getInvoice = async (req: Request, res: Response) => {
//   const { invoiceId } = req.params;
//   try {
//     const invoice = await lndService.getInvoiceById(invoiceId);
//     if (!invoice) {
//       res
//         .status(StatusCodes.NOT_FOUND)
//         .json({ message: `Invoice ${invoiceId} not found` });
//       return;
//     }
//     return res.status(StatusCodes.OK).json(invoice);
//   } catch (error: any) {
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//       error: error.message,
//     });
//   }
// };

// Create a controller to get invoices for user
// export const getUserInvoice = async (req: Request, res: Response) => {
//   // @ts-ignore
//   const { userId } = req.user as { userId: string };

//   try {
//     const invoices = await lndService.getInvoicesByUser(userId);
//     return res.status(StatusCodes.OK).json(invoices);
//   } catch (error) {
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//       //@ts-ignore
//       error: error.message,
//     });
//   }
// };

// // Create invoice controller
// export const createInvoice = async (req: Request, res: Response) => {
//   try {
//     // @ts-ignore
//     const { userId } = req.user;
//     const { amount, memo = '' } = req.body;

//     // Input validation
//     if (!amount && amount <= 0) {
//       return res.status(StatusCodes.BAD_REQUEST).json({
//         message: 'Valid amount is required',
//       });
//     }

//     if (memo && memo.length > 639) {
//       // LND memo limit
//       return res.status(StatusCodes.BAD_REQUEST).json({
//         message: 'Memo too long (max 639 bytes)',
//       });
//     }

//     const payload = await lndService.createLndInvoice(userId, amount, memo);

//     res.status(StatusCodes.CREATED).json({
//       message: 'Created invoice successfully',
//       data: {
//         invoiceId: payload.invoiceId,
//         payment_request: payload.payment_request,
//         amount: payload.amount,
//         expires_at: payload.expiresAt,
//       },
//     });
//   } catch (error: any) {
//     console.error('Invoice creation failed:', {
//       error: error.message,
//       stack: error.stack,
//       code: error.code,
//       details: error.details,
//     });

//     // Handle specific gRPC errors
//     if (error.code === 2) {
//       // UNKNOWN
//       return res.status(StatusCodes.BAD_GATEWAY).json({
//         message: 'Lightning network service temporarily unavailable',
//         error: 'Please try again in a few moments',
//       });
//     }

//     if (error.code === 14) {
//       // UNAVAILABLE
//       return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
//         message: 'Lightning network connection failed',
//         error: 'Service temporarily unavailable',
//       });
//     }

//     // Generic error response
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//       message: 'Failed to create invoice',
//       error:
//         process.env.NODE_ENV === 'development'
//           ? error.message
//           : 'Internal server error',
//     });
//   }
// };

// export const sendPayment = async (req: Request, res: Response) => {
//   try {
//     // @ts-ignore
//     const { userId } = req.user;
//     const { invoiceId } = req.body;

//     if (!invoiceId) {
//       return res.status(StatusCodes.BAD_REQUEST).json({
//         message: 'Invoice ID is required',
//       });
//     }

//     const paymentRecord = await lndService.sendPayment(invoiceId, userId);
//     res.status(StatusCodes.OK).json({
//       message: 'Payment sent successfully',
//       payment: paymentRecord,
//     });
//   } catch (error) {
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//       message: 'Failed to send payment',
//       //@ts-ignore
//       error: error.message,
//     });
//   }
// };

export const lockFunds = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { userId } = req.user;
    const { amount, unlockAt, purpose = 'staking' } = req.body;

    // Input validation
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Valid amount is required',
      });
    }

    if (!unlockAt || new Date(unlockAt) <= new Date()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Valid future unlock date is required',
      });
    }

    const result = await lndService.lockBalance(
      userId,
      amount,
      new Date(unlockAt),
      purpose
    );

    res.status(StatusCodes.OK).json({
      message: 'Funds locked successfully',
      data: {
        lockId: result.lockId,
        amount,
        unlockAt,
        purpose,
        availableBalance: result.wallet.balance - result.wallet.lockedBalance,
      },
    });
  } catch (error: any) {
    console.error('Lock funds failed:', error);
    res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Failed to lock funds',
      error: error.message,
    });
  }
};

export const getWalletInfo = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { userId } = req.user;

    const walletDetails = await lndService.getWalletDetails(userId);

    res.status(StatusCodes.OK).json({
      message: 'Wallet details retrieved successfully',
      data: walletDetails,
    });
  } catch (error: any) {
    console.error('Get wallet info failed:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to get wallet information',
      error: error.message,
    });
  }
};

export const unlockFunds = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { userId } = req.user;

    const result = await lndService.unlockCurrentFunds(userId);

    res.status(StatusCodes.OK).json({
      message: 'Funds unlocked successfully',
      data: {
        unlockedAmount: result.unlockedAmount,
        availableBalance: result.wallet.balance - result.wallet.lockedBalance,
      },
    });
  } catch (error: any) {
    console.error('Unlock funds failed:', error);
    res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Failed to unlock funds',
      error: error.message,
    });
  }
};

// // Get wallet info controller
// export const getWalletInfo = async (req: Request, res: Response) => {
//   try {
//     //@ts-ignore
//     const { userId } = req.user as { userId: string }; // Assuming auth middleware sets this

//     // Get LND wallet info
//     const lndWalletInfo = await lndService.getWallet();

//     // Find or create user wallet in MongoDB
//     let wallet = await LndWallet.findOne({ userId });

//     if (!wallet) {
//       // Create new wallet if it doesn't exist
//       wallet = await LndWallet.create({
//         userId,
//         balance: {
//           onchain: lndWalletInfo.chain_balance,
//           lightning: lndWalletInfo.channel_balance,
//           pendingChannels: lndWalletInfo.pending_channel_balance,
//         },
//       });
//     } else {
//       // Update wallet balance from LND
//       wallet.balance = {
//         onchain: lndWalletInfo.chain_balance,
//         lightning: lndWalletInfo.channel_balance,
//         pendingChannels: lndWalletInfo.pending_channel_balance,
//       };
//       await wallet.save();
//     }

//     res.status(200).json({
//       success: true,
//       data: {
//         channelBalance: lndWalletInfo.channel_balance,
//         chainBalance: lndWalletInfo.chain_balance,
//         pendingChannelBalance: lndWalletInfo.pending_channel_balance,
//         version: lndWalletInfo.version,
//         wallet: {
//           id: wallet._id,
//           onchainAddressCount: wallet.onchainAddresses?.length || 0,
//           currentAddress: wallet.currentAddress,
//         },
//       },
//     });
//   } catch (error: any) {
//     console.error('Error getting wallet info:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to retrieve wallet information',
//       error: error.message,
//     });
//   }
// };

// // Create on-chain address controller
// export const createBitcoinAddress = async (req: Request, res: Response) => {
//   try {
//     //@ts-ignore
//     const { userId } = req.user as { userId: string };
//     const { label } = req.body;

//     // Generate new address via LND
//     const addressInfo = await lndService.createAddress();

//     // Update wallet with the new address
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       // Find or create wallet
//       let wallet: ILndWallet | null = await LndWallet.findOne({ userId }).session(
//         session
//       );

//       if (!wallet) {
//         const lndWalletInfo = await lndService.getWallet();
//         wallet = new LndWallet({
//           userId,
//           onchainAddresses: [],
//           balance: {
//             onchain: lndWalletInfo.chain_balance,
//             lightning: lndWalletInfo.channel_balance,
//             pendingChannels: lndWalletInfo.pending_channel_balance,
//           },
//         });
//       }

//       // Add new address to wallet
//       wallet.onchainAddresses.push({
//         address: addressInfo.address,
//         format: 'p2wpkh',
//         createdAt: new Date(),
//         label: label || undefined,
//         isUsed: false,
//       });

//       // Update current address
//       wallet.currentAddress = addressInfo.address;

//       await wallet.save({ session });
//       await session.commitTransaction();
//     } catch (err) {
//       await session.abortTransaction();
//       throw err;
//     } finally {
//       session.endSession();
//     }

//     res.status(201).json({
//       success: true,
//       data: {
//         address: addressInfo.address,
//         type: 'p2wpkh',
//         label: label || null,
//       },
//     });
//   } catch (error: any) {
//     console.error('Error creating address:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create Bitcoin address',
//       error: error.message,
//     });
//   }
// };

// // Create invoice controller
// export const createInvoice = async (req: Request, res: Response) => {
//   try {
//     //@ts-ignore
//     const { userId } = req.user as { userId: string };
//     const { amount, memo = '' } = req.body;

//     // Validate amount
//     const tokens = Number(amount);
//     if (isNaN(tokens) || tokens <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Amount must be a valid positive number',
//       });
//     }

//     // Create invoice in LND
//     const lndInvoice = await lndService.createLndInvoice(tokens, memo);

//     // Save invoice to MongoDB
//     const invoice = await Invoice.create({
//       userId,
//       invoiceId: lndInvoice.id,
//       bolt11: lndInvoice.request,
//       description: memo,
//       amount: tokens,
//       memo,
//       status: 'pending',
//       expiresAt: new Date(lndInvoice.expires_at),
//       paymentHash: lndInvoice.id,
//     });

//     res.status(201).json({
//       success: true,
//       data: {
//         id: invoice.invoiceId,
//         request: invoice.bolt11,
//         description: invoice.memo,
//         tokens: invoice.amount,
//         created_at: invoice.createdAt,
//         expires_at: invoice.expiresAt,
//       },
//     });
//   } catch (error: any) {
//     console.error('Error creating invoice:', error);
//     if (error.message && error.message.includes('unable to create invoice')) {
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to create invoice',
//       });
//     }
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create invoice',
//       error: error.message,
//     });
//   }
// };

// // Get invoice details controller
// export const getInvoice = async (req: Request, res: Response) => {
//   try {
//     //@ts-ignore
//     const { userId } = req.user as { userId: string };
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invoice ID is required',
//       });
//     }

//     // First check MongoDB for invoice
//     const invoice: IInvoice | null = await Invoice.findOne({
//       $or: [{ invoiceId: id }, { paymentHash: id }],
//       userId,
//     });

//     if (!invoice) {
//       return res.status(404).json({
//         success: false,
//         message: 'Invoice not found',
//       });
//     }

//     // If pending, check with LND for latest status
//     if (invoice.status === 'pending') {
//       try {
//         const lndInvoice = await lndService.getLndInvoice(invoice.invoiceId);

//         // Update local invoice if status changed
//         if (lndInvoice.is_confirmed) {
//           invoice.status = 'paid';
//           invoice.paidAt = new Date(lndInvoice.confirmed_at);
//           invoice.amountPaid = lndInvoice.received || lndInvoice.tokens;
//           invoice.preimage = lndInvoice.secret;
//           await invoice.save();

//           // Create transaction record for the payment
//           await Transaction.create({
//             userId,
//             txType: 'deposit',
//             paymentMethod: 'lightning',
//             amount: invoice.amountPaid,
//             description: `Payment received for invoice ${invoice.invoiceId}`,
//             status: 'completed',
//             relatedId: invoice._id,
//             relatedType: 'invoice',
//             completedAt: invoice.paidAt,
//           });

//           // Update wallet balance
//           const wallet = await LndWallet.findOne({ userId });
//           if (wallet) {
//             const previousBalance = wallet.balance.lightning;
//             wallet.balance.lightning += invoice.amountPaid || 0;
//             await wallet.save();

//             // Update transaction with balance info
//             await Transaction.findOneAndUpdate(
//               { relatedId: invoice._id, relatedType: 'invoice' },
//               {
//                 'balance.before': previousBalance,
//                 'balance.after': wallet.balance.lightning,
//               }
//             );
//           }
//         }
//       } catch (err) {
//         console.error('Error checking LND invoice status:', err);
//         // Continue with existing invoice data if LND check fails
//       }
//     }

//     res.status(200).json({
//       success: true,
//       data: {
//         id: invoice.invoiceId,
//         request: invoice.bolt11,
//         description: invoice.memo,
//         tokens: invoice.amount,
//         is_confirmed: invoice.status === 'paid',
//         created_at: invoice.createdAt,
//         confirmed_at: invoice.paidAt || null,
//         payment_hash: invoice.paymentHash,
//         status: invoice.status,
//       },
//     });
//   } catch (error: any) {
//     console.error('Error getting invoice:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to retrieve invoice',
//       error: error.message,
//     });
//   }
// };

// // Pay invoice controller
// export const payInvoice = async (req: Request, res: Response) => {
//   try {
//     //@ts-ignore
//     const { userId } = req.user as { userId: string };
//     const { invoice: bolt11, maxFeePercent = 0.5 } = req.body;

//     if (!bolt11) {
//       return res.status(400).json({
//         success: false,
//         message: 'BOLT11 invoice is required',
//       });
//     }

//     // Decode invoice to get payment details
//     const decoded = await lndService.decodeLndInvoice(bolt11);

//     // Get user wallet
//     const wallet = await LndWallet.findOne({ userId });
//     if (!wallet) {
//       return res.status(404).json({
//         success: false,
//         message: 'Wallet not found',
//       });
//     }

//     // Check if user has enough balance
//     const tokens = decoded.tokens;
//     if (wallet.balance.lightning < tokens) {
//       return res.status(400).json({
//         success: false,
//         message: 'Insufficient lightning balance',
//       });
//     }

//     // Calculate max fee based on percentage
//     const maxFee = Math.max(1, Math.floor((tokens * maxFeePercent) / 100));

//     // Try to find a route
//     let route;
//     try {
//       // First try probing (tests if payment would succeed)
//       const probeResult = await lndService.probeLndRoute(
//         decoded.destination,
//         tokens
//       );
//       route = probeResult.route;
//     } catch (probeErr) {
//       // If probing fails, try to get a direct route
//       try {
//         const routeResult = await lndService.getLndRoute(
//           decoded.destination,
//           tokens
//         );
//         route = routeResult.route;
//       } catch (routeErr: any) {
//         return res.status(400).json({
//           success: false,
//           message: 'Failed to find a viable payment route',
//           error: routeErr.message,
//         });
//       }
//     }

//     // Create payment record in pending state
//     const paymentRecord = await Payment.create({
//       userId,
//       paymentId: decoded.id,
//       bolt11,
//       amount: tokens,
//       destination: decoded.destination,
//       status: 'pending',
//       paymentHash: decoded.id,
//       metadata: {
//         description: decoded.description,
//         maxFee,
//       },
//     });

//     // Execute payment
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       // Send payment via LND
//       const payment = await lndService.payLndInvoice(bolt11, route);

//       // Update payment record
//       paymentRecord.status = 'succeeded';
//       paymentRecord.fee = payment.fee;
//       paymentRecord.preimage = payment.secret;
//       paymentRecord.succeededAt = new Date(payment.confirmed_at);
//       paymentRecord.hops = payment.hops.length;
//       await paymentRecord.save({ session });

//       // Create transaction record
//       const previousBalance = wallet.balance.lightning;
//       const transaction = await Transaction.create(
//         [
//           {
//             userId,
//             txType: 'withdrawal',
//             paymentMethod: 'lightning',
//             amount: tokens,
//             fee: payment.fee,
//             description:
//               decoded.description ||
//               `Payment to ${decoded.destination.substring(0, 10)}...`,
//             status: 'completed',
//             relatedId: paymentRecord._id,
//             relatedType: 'payment',
//             balance: {
//               before: previousBalance,
//               after: previousBalance - tokens - payment.fee,
//             },
//             completedAt: new Date(payment.confirmed_at),
//           },
//         ],
//         { session }
//       );

//       // Update wallet balance
//       wallet.balance.lightning -= tokens + payment.fee;
//       await wallet.save({ session });

//       await session.commitTransaction();

//       res.status(200).json({
//         success: true,
//         data: {
//           preimage: payment.secret,
//           fee_paid: payment.fee,
//           tokens_sent: payment.tokens,
//           confirmed_at: payment.confirmed_at,
//           hops: payment.hops.length,
//           payment_id: paymentRecord._id,
//           transaction_id: transaction[0]._id,
//         },
//       });
//     } catch (error: any) {
//       await session.abortTransaction();

//       // Update payment record to failed
//       paymentRecord.status = 'failed';
//       paymentRecord.failureReason = error.message;
//       paymentRecord.failedAt = new Date();
//       await paymentRecord.save();

//       // Handle common payment errors
//       if (error.message) {
//         if (error.message.includes('invoice is already paid')) {
//           return res.status(400).json({
//             success: false,
//             message: 'This invoice has already been paid',
//           });
//         }

//         if (
//           error.message.includes('insufficient fund') ||
//           error.name === 'INSUFFICIENT_FUNDS'
//         ) {
//           return res.status(400).json({
//             success: false,
//             message: 'Insufficient funds to make this payment',
//           });
//         }

//         if (error.message.includes('invalid payment request')) {
//           return res.status(400).json({
//             success: false,
//             message: 'Invalid BOLT11 payment request',
//           });
//         }

//         if (error.name === 'ROUTE_NOT_FOUND') {
//           return res.status(400).json({
//             success: false,
//             message: 'No route found to destination',
//           });
//         }
//       }

//       console.error('Error paying invoice:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to pay invoice',
//         error: error.message,
//       });
//     } finally {
//       session.endSession();
//     }
//   } catch (error: any) {
//     console.error('Error in pay invoice flow:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to process payment',
//       error: error.message,
//     });
//   }
// };

// // Get channel information controller
// export const getChannels = async (req: Request, res: Response) => {
//   try {
//     //@ts-ignore
//     const { userId } = req.user as { userId: string };
//     const { limit = 100, offset = 0 } = req.query;

//     // Get channels from LND
//     const { channels, total } = await lndService.getLndChannels(
//       Number(limit),
//       Number(offset)
//     );

//     const formattedChannels = channels.map((channel: any) => ({
//       id: channel.id,
//       partner_public_key: channel.partner_public_key,
//       capacity: channel.capacity,
//       local_balance: channel.local_balance,
//       remote_balance: channel.remote_balance,
//       is_active: channel.is_active,
//       is_private: channel.is_private,
//     }));

//     // Get wallet to include balance info
//     const wallet = await LndWallet.findOne({ userId });

//     res.status(200).json({
//       success: true,
//       data: {
//         channels: formattedChannels,
//         count: formattedChannels.length,
//         total_capacity: formattedChannels.reduce(
//           (sum: number, channel: any) => sum + channel.capacity,
//           0
//         ),
//         total_local_balance: formattedChannels.reduce(
//           (sum: number, channel: any) => sum + channel.local_balance,
//           0
//         ),
//         wallet_balance: wallet
//           ? {
//               onchain: wallet.balance.onchain,
//               lightning: wallet.balance.lightning,
//               pendingChannels: wallet.balance.pendingChannels,
//             }
//           : null,
//         pagination: {
//           total,
//           offset: Number(offset),
//           limit: Number(limit),
//         },
//       },
//     });
//   } catch (error: any) {
//     console.error('Error getting channels:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to retrieve channels',
//       error: error.message,
//     });
//   }
// };

// // Webhook setup for invoice notifications
// export const setupInvoiceWebhook = async (req: Request, res: Response) => {
//   try {
//     //@ts-ignore
//     const { userId } = req.user as { userId: string };
//     const { invoiceId, callbackUrl } = req.body;

//     if (!invoiceId || !callbackUrl) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invoice ID and callback URL are required',
//       });
//     }

//     // First validate the invoice exists and belongs to user
//     const invoice = await Invoice.findOne({
//       invoiceId,
//       userId,
//     });

//     if (!invoice) {
//       return res.status(404).json({
//         success: false,
//         message: 'Invoice not found',
//       });
//     }

//     // Save callback URL to invoice metadata
//     invoice.metadata = {
//       ...invoice.metadata,
//       callbackUrl,
//     };
//     await invoice.save();

//     // Set up LND subscription
//     const subscription = await lndService.subscribeToLndInvoice(invoiceId);

//     // Response immediately as webhook is set up
//     res.status(200).json({
//       success: true,
//       message: 'Invoice webhook configured successfully',
//       data: {
//         invoice_id: invoiceId,
//       },
//     });

//     // Handle the subscription events
//     subscription.on('invoice_updated', async (updatedInvoice: any) => {
//       if (updatedInvoice.is_confirmed) {
//         // Update MongoDB invoice
//         const dbInvoice = await Invoice.findOne({ invoiceId });
//         if (dbInvoice && dbInvoice.status !== 'paid') {
//           const session = await mongoose.startSession();
//           session.startTransaction();

//           try {
//             // Update invoice
//             dbInvoice.status = 'paid';
//             dbInvoice.paidAt = new Date();
//             dbInvoice.amountPaid =
//               updatedInvoice.received || updatedInvoice.tokens;
//             dbInvoice.preimage = updatedInvoice.secret;
//             await dbInvoice.save({ session });

//             // Get wallet to update balance
//             const wallet = await LndWallet.findOne({ userId }).session(session);

//             if (wallet) {
//               const previousBalance = wallet.balance.lightning;
//               wallet.balance.lightning += dbInvoice.amountPaid || 0;
//               await wallet.save({ session });

//               // Create transaction record
//               await Transaction.create(
//                 [
//                   {
//                     userId,
//                     txType: 'deposit',
//                     paymentMethod: 'lightning',
//                     amount: dbInvoice.amountPaid,
//                     description: `Payment received for invoice ${dbInvoice.invoiceId}`,
//                     status: 'completed',
//                     relatedId: dbInvoice._id,
//                     relatedType: 'invoice',
//                     balance: {
//                       before: previousBalance,
//                       after: wallet.balance.lightning,
//                     },
//                     completedAt: dbInvoice.paidAt,
//                   },
//                 ],
//                 { session }
//               );
//             }

//             await session.commitTransaction();
//           } catch (err) {
//             await session.abortTransaction();
//             console.error('Error updating invoice in webhook:', err);
//           } finally {
//             session.endSession();
//           }
//         }

//         // In production, send webhook notification
//         console.log(
//           `Invoice ${invoiceId} has been paid! Notifying ${callbackUrl}`
//         );

//         if (dbInvoice?.metadata?.callbackUrl) {
//           try {
//             // Example using fetch (in a real app, use a robust HTTP client)
//             // await fetch(dbInvoice.metadata.callbackUrl, {
//             //   method: 'POST',
//             //   headers: { 'Content-Type': 'application/json' },
//             //   body: JSON.stringify({
//             //     invoice_id: invoiceId,
//             //     status: 'paid',
//             //     amount: dbInvoice.amountPaid,
//             //     paid_at: dbInvoice.paidAt
//             //   })
//             // });
//           } catch (err) {
//             console.error('Failed to notify webhook:', err);
//             // In production: add to retry queue
//           }
//         }
//       }
//     });
//   } catch (error: any) {
//     console.error('Error setting up webhook:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to set up invoice webhook',
//       error: error.message,
//     });
//   }
// };

// // Decode invoice without paying it
// export const decodeInvoice = async (req: Request, res: Response) => {
//   try {
//     const { invoice } = req.body;

//     if (!invoice) {
//       return res.status(400).json({
//         success: false,
//         message: 'BOLT11 invoice is required',
//       });
//     }

//     const decoded = await lndService.decodeLndInvoice(invoice);

//     res.status(200).json({
//       success: true,
//       data: {
//         destination: decoded.destination,
//         description: decoded.description,
//         tokens: decoded.tokens,
//         id: decoded.id,
//         expires_at: decoded.expires_at,
//         created_at: decoded.created_at,
//       },
//     });
//   } catch (error: any) {
//     if (error.message && error.message.includes('invalid payment request')) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid BOLT11 payment request',
//       });
//     }
//     console.error('Error decoding invoice:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to decode invoice',
//       error: error.message,
//     });
//   }
// };

// // Get user transactions
// export const getTransactions = async (req: Request, res: Response) => {
//   try {
//     //@ts-ignore
//     const { userId } = req.user as { userId: string };
//     const { limit = 20, offset = 0, type, status, method } = req.query;

//     // Build query
//     const query: any = { userId };
//     if (type) query.txType = type;
//     if (status) query.status = status;
//     if (method) query.paymentMethod = method;

//     // Get transactions with pagination
//     const transactions = await Transaction.find(query)
//       .sort({ createdAt: -1 })
//       .skip(Number(offset))
//       .limit(Number(limit))
//       .lean();

//     const total = await Transaction.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       data: {
//         transactions,
//         pagination: {
//           total,
//           offset: Number(offset),
//           limit: Number(limit),
//         },
//       },
//     });
//   } catch (error: any) {
//     console.error('Error getting transactions:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to retrieve transactions',
//       error: error.message,
//     });
//   }
// };

// // Get user invoices
// export const getUserInvoices = async (req: Request, res: Response) => {
//   try {
//     //@ts-ignore
//     const { userId } = req.user as { userId: string };
//     const { limit = 20, offset = 0, status } = req.query;

//     // Build query
//     const query: any = { userId };
//     if (status) query.status = status;

//     // Get invoices with pagination
//     const invoices = await Invoice.find(query)
//       .sort({ createdAt: -1 })
//       .skip(Number(offset))
//       .limit(Number(limit))
//       .lean();

//     const total = await Invoice.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       data: {
//         invoices,
//         pagination: {
//           total,
//           offset: Number(offset),
//           limit: Number(limit),
//         },
//       },
//     });
//   } catch (error: any) {
//     console.error('Error getting invoices:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to retrieve invoices',
//       error: error.message,
//     });
//   }
// };

// // Get user payments
// export const getUserPayments = async (req: Request, res: Response) => {
//   try {
//     //@ts-ignore
//     const { userId } = req.user as { userId: string };
//     const { limit = 20, offset = 0, status } = req.query;

//     // Build query
//     const query: any = { userId };
//     if (status) query.status = status;

//     // Get payments with pagination
//     const payments = await Payment.find(query)
//       .sort({ createdAt: -1 })
//       .skip(Number(offset))
//       .limit(Number(limit))
//       .lean();

//     const total = await Payment.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       data: {
//         payments,
//         pagination: {
//           total,
//           offset: Number(offset),
//           limit: Number(limit),
//         },
//       },
//     });
//   } catch (error: any) {
//     console.error('Error getting payments:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to retrieve payments',
//       error: error.message,
//     });
//   }
// };

// // Get wallet details
// export const getWalletDetails = async (req: Request, res: Response) => {
//   try {
//     //@ts-ignore
//     const { userId } = req.user as { userId: string };

//     // Get wallet data
//     const wallet = await LndWallet.findOne({ userId });
//     if (!wallet) {
//       return res.status(404).json({
//         success: false,
//         message: 'Wallet not found',
//       });
//     }

//     // Get recent transactions
//     const recentTransactions = await Transaction.find({ userId })
//       .sort({ createdAt: -1 })
//       .limit(5)
//       .lean();

//     // Get pending invoices
//     const pendingInvoices = await Invoice.find({
//       userId,
//       status: 'pending',
//     })
//       .sort({ createdAt: -1 })
//       .limit(5)
//       .lean();

//     res.status(200).json({
//       success: true,
//       data: {
//         wallet: {
//           id: wallet._id,
//           balance: wallet.balance,
//           currentAddress: wallet.currentAddress,
//           addressCount: wallet.onchainAddresses.length,
//         },
//         recentTransactions,
//         pendingInvoices,
//       },
//     });
//   } catch (error: any) {
//     console.error('Error getting wallet details:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to retrieve wallet details',
//       error: error.message,
//     });
//   }
// };
