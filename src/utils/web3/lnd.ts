import axios from 'axios';

const LND_BASE_URL = process.env.LND_REST_URL!;
const MACAROON = process.env.LND_MACAROON!;

export interface AddInvoiceResponse {
  r_hash: string;
  payment_request: string;
  add_index: string;
  payment_addr: string;
}

export interface SendPaymentInterface {
  payment_hash: string,
  value: string,
  creation_date: string,
  fee: string,
  payment_preimage: string,
  value_sat: string,
  value_msat: string,
  payment_request: string,
  status: string,
  fee_sat: string,
  fee_msat: string,
  creation_time_ns: string,
  htlcs: any[],
  payment_index: string,
  failure_reason: string,
  first_hop_custom_records: object,
}

export const AddInvoice = async (payload: any): Promise<AddInvoiceResponse> => {
  try {
    const { data } = await axios.post<AddInvoiceResponse>(
      `${LND_BASE_URL}/v1/invoices`,
      JSON.stringify(payload),
      {
        headers: {
          'Grpc-Metadata-macaroon': MACAROON,
          'Content-Type': 'application/json'
        },
      }
    );
    return data;
  } catch (error: any) {
    console.error('LND API error:', error.response);
    throw error;
  }
};

export const PayInvoice = async (payload: any): Promise<SendPaymentInterface> => {
  try {
    const { data } = await axios.post<SendPaymentInterface>(`${LND_BASE_URL}/v2/router/send`,
      JSON.stringify(payload),
      {
        headers: {
          'Grpc-Metadata-macaroon': MACAROON,
          'Content-Type': 'application/json'
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
    const { data } = await axios.get<any>(`${LND_BASE_URL}/v1/invoices/subscribe`,
      {
        headers: {
          'Grpc-Metadata-macaroon': MACAROON,
          'Content-Type': 'application/json'
        },
      }
    );

    return data;
  } catch (error: any) {
    console.error('LND API Error:', error.response);
    throw error;
  }
};

// const fs = require('fs');
// const grpc = require('@grpc/grpc-js');
// const protoLoader = require('@grpc/proto-loader');
// const path = require('path');

// const loaderOptions = {
//   keepCase: true,
//   longs: String,
//   enums: String,
//   defaults: true,
//   oneofs: true,
// };

// process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';

// const getProtoPath = () => {
//   const protoPath =
//     process.env.NODE_ENV === 'production'
//       ? '/etc/secrets/lightning.proto'
//       : path.resolve(__dirname, 'lightning.proto');

//   if (!fs.existsSync(protoPath)) {
//     throw new Error(`Proto file not found at: ${protoPath}`);
//   }

//   return protoPath;
// };

// const getRouterProtoPath = () => {
//   const routerPath =
//     process.env.NODE_ENV === 'production'
//       ? '/etc/secrets/router.proto'
//       : path.resolve(__dirname, 'router.proto');

//   if (!fs.existsSync(routerPath)) {
//     throw new Error(`Router proto file not found at: ${routerPath}`);
//   }

//   return routerPath;
// };

// const getMacaroon = () => {
//   const certPath =
//     process.env.NODE_ENV === 'production'
//       ? '/etc/secrets/admin.macaroon'
//       : path.resolve(__dirname, 'admin.macaroon');

//   if (!fs.existsSync(certPath)) {
//     throw new Error(`Macaroon file not found at: ${certPath}`);
//   }

//   const m = fs.readFileSync(certPath);

//   // Debug: Check macaroon size and format
//   console.log('Macaroon loaded, size:', m.length);

//   // Ensure it's converted to hex properly
//   const hexMacaroon = m.toString('hex');
//   console.log('Macaroon hex length:', hexMacaroon.length);

//   return hexMacaroon;
// };

// const getTLSCERT = () => {
//   const certPath =
//     process.env.NODE_ENV === 'production'
//       ? '/etc/secrets/tls.cert'
//       : path.resolve(__dirname, 'tls.cert');

//   if (!fs.existsSync(certPath)) {
//     throw new Error(`Cert file not found at: ${certPath}`);
//   }

//   const cert = fs.readFileSync(certPath);
//   console.log('TLS Cert loaded, size:', cert.length);

//   // Debug: Check if certificate looks valid
//   const certString = cert.toString();
//   if (!certString.includes('BEGIN CERTIFICATE')) {
//     console.warn('Warning: Certificate file may not be in PEM format');
//   }

//   return cert;
// };

// // Load proto definitions with error handling
// let packageDefinition: any;
// let routerPackageDefinition: any;

// try {
//   const protoPath = getProtoPath();
//   packageDefinition = protoLoader.loadSync(protoPath, loaderOptions);

//   const routerPath = getRouterProtoPath();
//   routerPackageDefinition = protoLoader.loadSync(
//     [protoPath, routerPath],
//     loaderOptions
//   );
// } catch (error) {
//   console.error('Failed to load proto definitions:', error);
//   throw error;
// }

// // Create credentials with multiple fallback options
// const createCredentials = () => {
//   try {
//     const macaroon = getMacaroon();
//     const tlsCert = getTLSCERT();

//     // Build metadata credentials
//     const metadata = new grpc.Metadata();
//     metadata.add('macaroon', macaroon);

//     const macaroonCreds = grpc.credentials.createFromMetadataGenerator(
//       (_args: any, callback: any) => {
//         callback(null, metadata);
//       }
//     );

//     const sslCreds = grpc.credentials.createSsl(tlsCert);

//     return grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
//   } catch (error) {
//     console.error('Failed to create credentials:', error);
//     throw error;
//   }
// };

// const credentials = createCredentials();

// const LND_HOST = 'lightning-test-node.t.voltageapp.io:10009';

// export const client = async () => {
//   try {
//     const lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
//     const lnrpc = lnrpcDescriptor.lnrpc;

//     if (!lnrpc || !lnrpc.Lightning) {
//       throw new Error('Failed to load Lightning service from proto definition');
//     }

//     console.log('Creating LND client connection to:', LND_HOST);
//     const client = new lnrpc.Lightning(LND_HOST, credentials);

//     // Test connection with a simple call
//     console.log('Testing connection...');
//     await new Promise((resolve, reject) => {
//       const deadline = new Date(Date.now() + 15000); // 15 second timeout
//       client.getInfo({}, { deadline }, (err: any, response: any) => {
//         if (err) {
//           console.error('Connection test failed:', err.message);
//           console.error('Error code:', err.code);
//           console.error('Error details:', err.details);
//           reject(err);
//         } else {
//           console.log('LND connection successful!');
//           console.log('Node alias:', response.alias);
//           console.log('Node pubkey:', response.identity_pubkey);
//           resolve(response);
//         }
//       });
//     });

//     return client;
//   } catch (error) {
//     console.error('Failed to create LND client:', error);
//     throw new Error('Failed to connect to LND node');
//   }
// };

// export const routerClient = async () => {
//   try {
//     const routerLnrpcDescriptor = grpc.loadPackageDefinition(
//       routerPackageDefinition
//     );
//     const routerrpc = routerLnrpcDescriptor.routerrpc;

//     if (!routerrpc || !routerrpc.Router) {
//       throw new Error('Failed to load Router service from proto definition');
//     }

//     const client = new routerrpc.Router(LND_HOST, credentials);

//     return client;
//   } catch (error) {
//     console.error('Failed to create router client:', error);
//     throw new Error('Failed to connect to LND router');
//   }
// };