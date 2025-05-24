const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
const protoPath =
  process.env.NODE_ENV === 'production'
    ? '/etc/secrets/ligthning.proto'
    : path.resolve(__dirname, 'lightning.proto');
const packageDefinition = protoLoader.loadSync(protoPath, loaderOptions);

process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';
const certPath =
  process.env.NODE_ENV === 'production'
    ? '/etc/secrets/admin.macaroon'
    : path.resolve(__dirname, 'admin.macaroon');
let m = fs.readFileSync(certPath);
let macaroon = m.toString('hex');

// build meta data credentials
let metadata = new grpc.Metadata();
metadata.add('macaroon', macaroon);
let macaroonCreds = grpc.credentials.createFromMetadataGenerator(
  (_args: any, callback: any) => {
    callback(null, metadata);
  }
);

// build ssl credentials without needing to pass in the cert
const sslCreds = grpc.credentials.createSsl();

// combine the cert credentials and the macaroon auth credentials
// such that every call is properly encrypted and authenticated
let credentials = grpc.credentials.combineChannelCredentials(
  sslCreds,
  macaroonCreds
);

// Pass the crendentials when creating a channel
let lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
let lnrpc = lnrpcDescriptor.lnrpc;
export const client = new lnrpc.Lightning(
  'lightning-node.m.voltageapp.io:10009',
  credentials
);
