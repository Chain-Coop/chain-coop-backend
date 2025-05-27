import { StatusCodes } from "http-status-codes";
import Invoice from "../../../models/web3/lnd/invoice";
import Payment from "../../../models/web3/lnd/payment";
import { client, routerClient } from "../../../utils/web3/lnd";
import { Response } from "express";

export const getInvoiceById = async (invoiceId: string) => {
    return await Invoice.findOne({ invoiceId });
};

export const getInvoicesByUser = async (userId: string) => {
    return await Invoice.find({ userId }).sort({ createdAt: -1 });
};

export const create = async (payload: any) => {
    return await Invoice.create(payload);
};

interface IAddInvoice {
    value: number;
    memo?: string;
}

export const createInvoice = async (request: IAddInvoice, res: Response, user_id: string) => {
    try {
        client.addInvoice(request, async (err: Error | null, response: any) => {

            if (err) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    message: "Error creating invoice",
                    //@ts-ignore
                    error: err.message,
                });
            }

            let invoice = {
                userId: user_id,
                invoiceId: response.add_index,
                bolt11: response.payment_addr,
                amount: request.value,
                memo: request.memo,
                expiresAt: new Date(Date.now() + 3600000),
                paymentHash: response.r_hash,
                payment_request: response.payment_request
            };

            let resp = await create(invoice);

            res.status(StatusCodes.CREATED).json({
                message: "Created invoice successfully",
                resp
            });
        });

    } catch (error) {
        console.log(`Error creating invoice`, error);
        throw Error('Something went wrong please retry')
    }

};


interface ISendPaymentRequest {
    payment_request: string,
    timeout_seconds: number
}

export const createPayment = async (payload: any) => {
    return await Payment.create(payload);
};

export const sendPayment = async (
    request: ISendPaymentRequest,
    res: Response,
    userId: string,
    invoice: any,
) => {
    try {
        // call the SendPaymentV2 RPC
        const call = routerClient.sendPaymentV2(request);

        call.on('data', async (response: any) => {
            console.log(response);

            if (response.status === 'SUCCEEDED' || response.status === 'FAILED') {

                const payload = {
                    userId,
                    paymentId: invoice.invoiceId,
                    bolt11: invoice.bolt11,
                    amount: response.value,
                    fee: response.fee,
                    payment_index: response.payment_index,
                    preimage: response.payment_preimage,
                    status: response.status.toLowerCase(),
                    failureReason: response.failure_reason,
                    paymentHash: response.paymentHash,
                    hop: response.first_hop_custom_records,
                    succeededAt: response.status === 'SUCCEEDED' ? new Date() : undefined,
                    failedAt: response.status === 'FAILED' ? new Date() : undefined,
                    routingHints: response.htlcs,
                };

                let resp = await createPayment(payload);

                res.status(response.status === 'SUCCEEDED' ? StatusCodes.CREATED : StatusCodes.CONFLICT).json({
                    message: response.status === 'SUCCEEDED' ? "Payment sent successfully" : "Payment failed",
                    resp
                });
            }
        });
        call.on('error', (err: Error) => {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Payment failed', error: err.message });
        });
        call.on('end', () => {
            console.log('Payment stream ended');
        });
    } catch (error) {
        console.log(`Error making payment`, error);
        throw Error('Something went wrong please retry')
    }
};


// interface LndRoute {
//   fee: number;
//   fee_mtokens: string;
//   hops: Array<{
//     channel: string;
//     channel_capacity: number;
//     fee: number;
//     fee_mtokens: string;
//     forward: number;
//     forward_mtokens: string;
//     public_key: string;
//     timeout: number;
//   }>;
//   mtokens: string;
//   payment: number;
//   timeout: number;
// }

// export const getWallet = async () => {
//   try {
//     console.log('LND instance:', lnd);
//     const walletInfo = await getWalletInfo({ lnd });
//     return walletInfo;
//   } catch (error) {
//     console.error('Error getting wallet info:', error);
//     throw error;
//   }
// };

// export const createAddress = async () => {
//   try {
//     const address = await createChainAddress({ format: 'p2wpkh', lnd });
//     return address;
//   } catch (error) {
//     console.error('Error creating address:', error);
//     throw error;
//   }
// };

// export const createLndInvoice = async (amount: number, memo: string) => {
//   try {
//     if (isNaN(amount) || amount <= 0) {
//       throw new Error('Invalid amount: must be a positive number');
//     }

//     const invoice = await createInvoice({
//       lnd,
//       tokens: amount,
//       description: memo,
//     });
//     return invoice;
//   } catch (error) {
//     console.error('Error creating invoice:', error);
//     throw error;
//   }
// };
// export const getLndInvoice = async (id: string) => {
//   try {
//     const invoice = await getInvoice({ id, lnd });
//     return invoice;
//   } catch (error) {
//     console.error('Error getting invoice:', error);
//     throw error;
//   }
// };
// export const subscribeToLndInvoice = async (id: string) => {
//   try {
//     const subscription = await subscribeToInvoice({ id, lnd });
//     return subscription;
//   } catch (error) {
//     console.error('Error subscribing to invoice:', error);
//     throw error;
//   }
// };
// export const payLndInvoice = async (invoice: string, route: LndRoute) => {
//   try {
//     const decoded = await decodeBolt11({ lnd, request: invoice });
//     const payment = await payViaRoutes({
//       lnd,
//       routes: [route],
//       id: decoded.id,
//     });
//     return payment;
//   } catch (error: any) {
//     // Better error categorization
//     if (error.message.includes('insufficient funds')) {
//       const enhancedError = new Error('Insufficient funds for payment');
//       enhancedError.name = 'INSUFFICIENT_FUNDS';
//       throw enhancedError;
//     }
//     if (error.message.includes('unable to route')) {
//       const enhancedError = new Error('Payment route not found');
//       enhancedError.name = 'ROUTE_NOT_FOUND';
//       throw enhancedError;
//     }
//     console.error('Error paying invoice:', error);
//     throw error;
//   }
// };

// export const decodeLndInvoice = async (invoice: string) => {
//   try {
//     const decoded = await decodeBolt11({ lnd, request: invoice });
//     return decoded;
//   } catch (error) {
//     console.error('Error decoding invoice:', error);
//     throw error;
//   }
// };
// export const probeLndRoute = async (
//   destination: string,
//   amount: number,
//   maxFee?: number
// ) => {
//   try {
//     const route = await probeForRoute({
//       lnd,
//       destination,
//       tokens: amount,
//       max_fee: maxFee || Math.floor(amount * 0.01), // Default to 1% fee limit
//     });
//     return route;
//   } catch (error) {
//     console.error('Error probing route:', error);
//     throw error;
//   }
// };

// export const getLndRoute = async (destination: string, amount: number) => {
//   try {
//     const route = await getRouteToDestination({
//       lnd,
//       destination,
//       tokens: amount,
//     });
//     return route;
//   } catch (error) {
//     console.error('Error getting route:', error);
//     throw error;
//   }
// };

// export const getLndChannels = async (limit = 100, offset = 0) => {
//   try {
//     const { channels } = await getChannels({ lnd });
//     // Apply pagination
//     const paginatedChannels = channels.slice(offset, offset + limit);
//     return {
//       channels: paginatedChannels,
//       total: channels.length,
//     };
//   } catch (error) {
//     console.error('Error getting channels:', error);
//     throw error;
//   }
// };
