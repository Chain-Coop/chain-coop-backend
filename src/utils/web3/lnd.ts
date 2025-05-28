const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Enhanced loader options for better compatibility
const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  // Add these for better protobuf handling
  arrays: true,
  objects: true,
  includeDirs: [],
};

// Set gRPC environment variables for better compatibility
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';
process.env.GRPC_VERBOSITY = 'ERROR'; // Reduce noise in production

const getProtoPath = () => {
  const protoPath = process.env.NODE_ENV === 'production'
    ? '/etc/secrets/lightning.proto'
    : path.resolve(__dirname, 'lightning.proto');
  
  // Verify proto file exists
  if (!fs.existsSync(protoPath)) {
    throw new Error(`Proto file not found at: ${protoPath}`);
  }
  
  return protoPath;
};

const getRouterProtoPath = () => {
  const routerPath = process.env.NODE_ENV === 'production'
    ? '/etc/secrets/router.proto'
    : path.resolve(__dirname, 'router.proto');
    
  // Verify proto file exists
  if (!fs.existsSync(routerPath)) {
    throw new Error(`Router proto file not found at: ${routerPath}`);
  }
  
  return routerPath;
};

const getMacaroon = () => {
  const certPath = process.env.NODE_ENV === 'production'
    ? '/etc/secrets/admin.macaroon'
    : path.resolve(__dirname, 'admin.macaroon');
    
  if (!fs.existsSync(certPath)) {
    throw new Error(`Macaroon file not found at: ${certPath}`);
  }
  
  const m = fs.readFileSync(certPath);
  return m.toString('hex');
};

// Load proto definitions with error handling
let packageDefinition: any;
let routerPackageDefinition: any;

try {
  const protoPath = getProtoPath();
  packageDefinition = protoLoader.loadSync(protoPath, loaderOptions);
  
  const routerPath = getRouterProtoPath();
  routerPackageDefinition = protoLoader.loadSync([protoPath, routerPath], loaderOptions);
} catch (error) {
  console.error('Failed to load proto definitions:', error);
  throw error;
}

// Create credentials with error handling
const createCredentials = () => {
  try {
    const macaroon = getMacaroon();
    
    // Build metadata credentials
    const metadata = new grpc.Metadata();
    metadata.add('macaroon', macaroon);
    
    const macaroonCreds = grpc.credentials.createFromMetadataGenerator(
      (_args: any, callback: any) => {
        callback(null, metadata);
      }
    );

    // Build SSL credentials
    const sslCreds = grpc.credentials.createSsl();

    // Combine credentials
    return grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
  } catch (error) {
    console.error('Failed to create credentials:', error);
    throw error;
  }
};

const credentials = createCredentials();

// Enhanced gRPC options for better reliability
const grpcOptions = {
  'grpc.keepalive_time_ms': 30000,
  'grpc.keepalive_timeout_ms': 5000,
  'grpc.keepalive_permit_without_calls': true,
  'grpc.http2.max_pings_without_data': 0,
  'grpc.http2.min_time_between_pings_ms': 10000,
  'grpc.http2.min_ping_interval_without_data_ms': 300000,
  'grpc.so_reuseport': 1,
  'grpc.use_local_subchannel_pool': 1,
};

const LND_HOST = 'lightning-test-node.t.voltageapp.io:10009';

export const client = async () => {
  try {
    const lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const lnrpc = lnrpcDescriptor.lnrpc;
    
    if (!lnrpc || !lnrpc.Lightning) {
      throw new Error('Failed to load Lightning service from proto definition');
    }
    
    const client = new lnrpc.Lightning(LND_HOST, credentials, grpcOptions);
    
    // Test connection with a simple call
    await new Promise((resolve, reject) => {
      const deadline = new Date(Date.now() + 10000); // 10 second timeout
      client.getInfo({}, { deadline }, (err: any, response: any) => {
        if (err) {
          console.error('Connection test failed:', err);
          reject(err);
        } else {
          console.log('LND connection successful. Node alias:', response.alias);
          resolve(response);
        }
      });
    });
    
    return client;
  } catch (error) {
    console.error('Failed to create LND client:', error);
    throw new Error('Failed to connect to LND node');
  }
};

export const routerClient = async () => {
  try {
    const routerLnrpcDescriptor = grpc.loadPackageDefinition(routerPackageDefinition);
    const routerrpc = routerLnrpcDescriptor.routerrpc;
    
    if (!routerrpc || !routerrpc.Router) {
      throw new Error('Failed to load Router service from proto definition');
    }
    
    const client = new routerrpc.Router(LND_HOST, credentials, grpcOptions);
    
    return client;
  } catch (error) {
    console.error('Failed to create router client:', error);
    throw new Error('Failed to connect to LND router');
  }
};