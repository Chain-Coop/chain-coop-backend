import Invoice, { IInvoiceData } from "../../../models/web3/lnd/invoice";
import Payment, { IPaymentData } from "../../../models/web3/lnd/payment";

export const getInvoiceById = async (invoiceId: string) => {
    return await Invoice.findOne({ invoiceId });
};

export const getInvoicesByUser = async (userId: string) => {
    return await Invoice.find({ userId }).sort({ createdAt: -1 });
};

export const createInvoice = async (payload: IInvoiceData) => {
    return await Invoice.create(payload);
};

export const createPayment = async (payload: IPaymentData) => {
    return await Payment.create(payload);
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
