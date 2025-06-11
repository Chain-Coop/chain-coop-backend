import axios from 'axios';
import bolt11 from 'bolt11';
import dotenv from 'dotenv';
dotenv.config();

const LND_BASE_URL = process.env.LND_REST_URL!;
const MACAROON = process.env.LND_MACAROON!;

export interface AddInvoiceResponse {
  r_hash: string;
  payment_request: string;
  add_index: string;
  payment_addr: string;
}

export interface SendPaymentInterface {
  payment_hash: string;
  value: string;
  creation_date: string;
  fee: string;
  payment_preimage: string;
  value_sat: string;
  value_msat: string;
  payment_request: string;
  status: string;
  fee_sat: string;
  fee_msat: string;
  creation_time_ns: string;
  htlcs: any[];
  payment_index: string;
  failure_reason: string;
  first_hop_custom_records: object;
}
export interface PaymentInvoice {
  memo: string;
  r_preimage: string;
  r_hash: string;
  value: string;
  value_msat: string;
  creation_date: string;
  settle_date: string;
  payment_request: string;
  description_hash: string;
  expiry: number;
  fallback_addr: string;
  cltv_expiry: number;
  route_hints: any[];
  private: boolean;
  add_index: string;
  settle_index: string;
  amt_paid_sat: string;
  amt_paid_msat: string;
  state: string;
  htlcs: any[];
  features: {};
  is_keysend: boolean;
  payment_addr: string;
  is_amp: boolean;
  amp_invoice_state: {};
  is_blinded: boolean;
  blinded_path_config: {};
}

export const AddInvoice = async (payload: any): Promise<AddInvoiceResponse> => {
  try {
    const { data } = await axios.post<AddInvoiceResponse>(
      `${LND_BASE_URL}/v1/invoices`,
      JSON.stringify(payload),
      {
        headers: {
          'Grpc-Metadata-macaroon': MACAROON,
          'Content-Type': 'application/json',
        },
      }
    );
    return data;
  } catch (error: any) {
    console.error('LND API error:', error.response);
    throw error;
  }
};

export const decodeInvoice = async (invoice: string): Promise<any> => {
  try {
    // Decode the Lightning invoice to extract the payment hash
    const decoded = bolt11.decode(invoice);
    const paymentHash = decoded.tagsObject.payment_hash;
    if (!paymentHash) {
      throw new Error('Payment hash is missing from invoice.');
    }

    return decoded;
  } catch (error: any) {
    console.error('LND API Error:', error.response?.data || error.message);
    throw error;
  }
};

export const PayInvoice = async (
  payload: any
): Promise<SendPaymentInterface> => {
  try {
    const { data } = await axios.post<SendPaymentInterface>(
      `${LND_BASE_URL}/v2/router/send`,
      JSON.stringify(payload),
      {
        headers: {
          'Grpc-Metadata-macaroon': MACAROON,
          'Content-Type': 'application/json',
        },
      }
    );
    return data;
  } catch (error: any) {
    console.error('LND API Error:', error.response);
    throw error;
  }
};

export const SubscribeInvoices = async (): Promise<void> => {
  try {
    const { data } = await axios.get<any>(
      `${LND_BASE_URL}/v1/invoices/subscribe`,
      {
        headers: {
          'Grpc-Metadata-macaroon': MACAROON,
          'Content-Type': 'application/json',
        },
      }
    );

    return data;
  } catch (error: any) {
    console.error('LND API Error:', error.response);
    throw error;
  }
};
