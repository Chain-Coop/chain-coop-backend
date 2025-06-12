import WebSocket from 'ws';
import axios from 'axios';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';
import Invoice from '../../../models/web3/lnd/invoice';
import { incrementBalance } from './lndService';
dotenv.config();

const LND_BASE_URL = process.env.LND_REST_URL!;
const MACAROON = process.env.LND_MACAROON!;

export interface InvoiceUpdateEvent {
  memo: string;
  r_preimage: string;
  r_hash: string;
  value: string;
  value_msat: string;
  settled: boolean;
  creation_date: string;
  settle_date: string;
  payment_request: string;
  description_hash: string;
  expiry: string;
  fallback_addr: string;
  cltv_expiry: string;
  route_hints: any[];
  private: boolean;
  add_index: string;
  settle_index: string;
  amt_paid: string;
  amt_paid_sat: string;
  amt_paid_msat: string;
  state: string; // 'OPEN', 'SETTLED', 'CANCELED', 'ACCEPTED'
  htlcs: any[];
  features: Record<string, any>;
  is_keysend: boolean;
  payment_addr: string;
  is_amp: boolean;
  amp_invoice_state: Record<string, any>;
  is_blinded: boolean;
  blinded_path_config: Record<string, any>;
}

class InvoiceSubscriptionService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000; // 5 seconds
  private isConnected = false;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Handle settled invoices
    this.on('invoice_settled', this.handleInvoiceSettled.bind(this));

    // Handle invoice state changes
    this.on('invoice_updated', this.handleInvoiceUpdated.bind(this));
  }

  // WebSocket implementation (recommended for production)
  public startWebSocketSubscription(): void {
    try {
      const wsUrl = process.env.LND_WSS_URL;
      this.ws = new WebSocket(`${wsUrl}/v1/invoices/subscribe?method=GET`, {
        headers: {
          'Grpc-Metadata-macaroon': MACAROON,
        },
      });

      this.ws.on('open', () => {
        console.log('Invoice subscription WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Send subscription request
        const requestBody = {
          add_index: 0, // Start from beginning, or use last known index
          settle_index: 0, // Start from beginning, or use last known index
        };

        this.ws?.send(JSON.stringify(requestBody));
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Check if this is an invoice update message
          if (message && typeof message === 'object') {
            // LND sometimes sends different message types, ensure this looks like an invoice
            if (message.result || message.r_hash || message.payment_request) {
              this.handleInvoiceMessage(message as InvoiceUpdateEvent);
            } else {
              console.log('Received non-invoice message:', message);
            }
          }
        } catch (error) {
          console.error('Error parsing invoice message:', error);
          console.error('Raw message data:', data.toString());
        }
      });

      this.ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.ws.on('close', (code: number, reason: string) => {
        console.log(`WebSocket closed: ${code} - ${reason}`);
        this.isConnected = false;
        this.scheduleReconnect();
      });
    } catch (error) {
      console.error('Error starting WebSocket subscription:', error);
      this.scheduleReconnect();
    }
  }

  public startHTTPSubscription(): void {
    try {
      const source = axios({
        method: 'GET',
        url: `${LND_BASE_URL}/v1/invoices/subscribe`,
        headers: {
          'Grpc-Metadata-macaroon': MACAROON,
          Accept: 'application/json',
        },
        responseType: 'stream',
      });

      source
        .then((response) => {
          console.log('Invoice subscription HTTP stream connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          const stream = response.data as NodeJS.ReadableStream;

          stream.on('data', (chunk: Buffer) => {
            try {
              const lines = chunk.toString().split('\n');
              for (const line of lines) {
                if (line.trim()) {
                  const invoice: InvoiceUpdateEvent = JSON.parse(line);
                  this.handleInvoiceMessage(invoice);
                }
              }
            } catch (error) {
              console.error('Error parsing HTTP stream data:', error);
            }
          });

          stream.on('error', (error: Error) => {
            console.error('HTTP stream error:', error);
            this.isConnected = false;
            this.scheduleReconnect();
          });

          stream.on('end', () => {
            console.log('HTTP stream ended');
            this.isConnected = false;
            this.scheduleReconnect();
          });
        })
        .catch((error) => {
          console.error('Error starting HTTP subscription:', error);
          this.scheduleReconnect();
        });
    } catch (error) {
      console.error('Error starting HTTP subscription:', error);
      this.scheduleReconnect();
    }
  }

  private handleInvoiceMessage(invoice: InvoiceUpdateEvent): void {
    // Validate that we have essential invoice data before processing
    if (!invoice.r_hash || !invoice.state) {
      console.log('Received incomplete invoice data, skipping...', {
        hasRHash: !!invoice.r_hash,
        hasState: !!invoice.state,
        rawData: invoice
      });
      return;
    }

    console.log('Received invoice update:', {
      state: invoice.state,
      settled: invoice.settled,
      amount: invoice.amt_paid_sat,
      hash: invoice.r_hash,
    });

    // Emit general update event
    this.emit('invoice_updated', invoice);

    // Handle settled invoices specifically
    if (invoice.settled || invoice.state === 'SETTLED') {
      this.emit('invoice_settled', invoice);
    }
  }

  private async handleInvoiceSettled(
    invoice: InvoiceUpdateEvent
  ): Promise<void> {
    try {
      // Validate essential fields for settled invoices
      if (!invoice.r_hash) {
        console.error('Cannot process settled invoice: missing r_hash');
        return;
      }

      if (!invoice.amt_paid_sat && !invoice.amt_paid) {
        console.error('Cannot process settled invoice: missing payment amount');
        return;
      }

      console.log(`Invoice settled: ${invoice.r_hash}`);

      // Convert r_hash from base64 to hex for database lookup
      const paymentHashHex = Buffer.from(invoice.r_hash, 'base64').toString(
        'hex'
      );

      // Find the invoice in our database
      const dbInvoice = await Invoice.findOne({
        paymentHash: paymentHashHex,
      });

      if (!dbInvoice) {
        console.error(`Invoice not found in database: ${paymentHashHex}`);
        return;
      }

      // Check if already processed
      if (dbInvoice.status === 'paid') {
        console.log(`Invoice already processed: ${paymentHashHex}`);
        return;
      }

      // Use amt_paid_sat if available, otherwise fall back to amt_paid converted to sats
      const amountToCredit = invoice.amt_paid_sat 
        ? parseInt(invoice.amt_paid_sat)
        : Math.floor(parseInt(invoice.amt_paid || '0') / 1000); // Convert msat to sat

      // Update invoice status in database
      await Invoice.findByIdAndUpdate(dbInvoice._id, {
        status: 'paid',
        paidAt: new Date(),
        settleDate: invoice.settle_date ? new Date(parseInt(invoice.settle_date) * 1000) : new Date(),
        amountPaid: parseInt(invoice.amt_paid || '0'),
        amount: amountToCredit,
        settleIndex: invoice.settle_index,
      });

      // Credit the user's balance
      await incrementBalance(dbInvoice.userId, amountToCredit);

      console.log(
        `Successfully credited ${amountToCredit} sats to user ${dbInvoice.userId}`
      );

      // Emit event for other parts of your application
      this.emit('user_credited', {
        userId: dbInvoice.userId,
        amount: amountToCredit,
        invoiceId: dbInvoice._id,
        paymentHash: paymentHashHex,
      });
    } catch (error) {
      console.error('Error handling settled invoice:', error);

      // You might want to implement a retry mechanism or dead letter queue here
      this.emit('processing_error', {
        invoice,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleInvoiceUpdated(
    invoice: InvoiceUpdateEvent
  ): Promise<void> {
    try {
      // Validate essential fields before processing
      if (!invoice.r_hash) {
        console.log('Cannot update invoice: missing r_hash');
        return;
      }

      if (!invoice.state) {
        console.log('Cannot update invoice: missing state');
        return;
      }

      const paymentHashHex = Buffer.from(invoice.r_hash, 'base64').toString(
        'hex'
      );

      // Update invoice status for other states if needed
      const statusMap: Record<string, string> = {
        OPEN: 'pending',
        SETTLED: 'paid',
        CANCELED: 'expired',
        ACCEPTED: 'pending',
      };

      const newStatus = statusMap[invoice.state] || 'pending';

      await Invoice.findOneAndUpdate(
        { paymentHash: paymentHashHex },
        {
          status: newStatus,
          ...(invoice.state === 'CANCELED' && { canceledAt: new Date() }),
        }
      );

      console.log(`Updated invoice ${paymentHashHex} to status: ${newStatus}`);
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        'Max reconnection attempts reached. Stopping subscription service.'
      );
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts); // Exponential backoff
    console.log(
      `Scheduling reconnection in ${delay}ms (attempt ${
        this.reconnectAttempts + 1
      })`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      // Use WebSocket by default, fallback to HTTP if needed
      this.startWebSocketSubscription();
    }, delay);
  }

  public stop(): void {
    console.log('Stopping invoice subscription service...');

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.removeAllListeners();
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public async syncMissedInvoices(): Promise<void> {
    try {
      // Get all pending invoices from database
      const pendingInvoices = await Invoice.find({ status: 'pending' });

      for (const invoice of pendingInvoices) {
        // Check if invoice is expired
        if (invoice.expiresAt && new Date() > invoice.expiresAt) {
          await Invoice.findByIdAndUpdate(invoice._id, {
            status: 'expired',
            expiredAt: new Date(),
          });
          continue;
        }

        // Look up invoice status from LND
        try {
          const response: any = await axios.get(
            `${LND_BASE_URL}/v1/invoice/${invoice.paymentHash}`,
            {
              headers: {
                'Grpc-Metadata-macaroon': MACAROON,
              },
            }
          );

          if (response.data.settled) {
            // Process this settled invoice
            await this.handleInvoiceSettled(response.data);
          }
        } catch (lookupError) {
          console.error(
            `Error looking up invoice ${invoice.paymentHash}:`,
            lookupError
          );
        }
      }
    } catch (error) {
      console.error('Error syncing missed invoices:', error);
    }
  }
}

export const invoiceSubscriptionService = new InvoiceSubscriptionService();

export const startInvoiceSubscription = () => {
  console.log('Starting invoice subscription service...');

  // Try WebSocket first, fallback to HTTP streaming
  invoiceSubscriptionService.startWebSocketSubscription();

  // Sync any missed invoices on startup
  invoiceSubscriptionService.syncMissedInvoices();

  return invoiceSubscriptionService;
};

export default InvoiceSubscriptionService;