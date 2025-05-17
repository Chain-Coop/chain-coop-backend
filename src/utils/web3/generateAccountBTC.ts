import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';

// Initialize ECPair with the required elliptic curve implementation
const ECPair = ECPairFactory(ecc);

// Define the Bitcoin account interface similar to your Ethereum interface
interface BitcoinAccount {
  address: string;
  privateKey?: string;
  publicKey: string;
  wif: string; // Wallet Import Format - commonly used in Bitcoin
}

/**
 * Generates a random Bitcoin SegWit account
 * @param network The Bitcoin network to use (default: bitcoin.networks.bitcoin for mainnet)
 * @returns A BitcoinAccount object with SegWit address, keys, and WIF
 */
const generateBtcAccount = (
  network = bitcoin.networks.bitcoin
): BitcoinAccount => {
  // Create a random keypair
  const keyPair = ECPair.makeRandom({ network });

  // Get the private key as hex (similar to Ethereum format)
  const privateKey = keyPair.privateKey?.toString();

  // Get the public key as hex
  const publicKey = keyPair.publicKey.toString();

  // Generate the SegWit address from the public key (p2wpkh - Pay to Witness Public Key Hash)
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(keyPair.publicKey),
    network,
  });

  // Get the WIF format of the private key (standard in Bitcoin)
  const wif = keyPair.toWIF();

  return {
    address: address!,
    privateKey,
    publicKey,
    wif,
  };
};

/**
 * Imports a Bitcoin account from an existing private key
 * @param privateKeyHex The private key in hex format
 * @param network The Bitcoin network to use (default: bitcoin.networks.bitcoin for mainnet)
 * @returns A BitcoinAccount object with SegWit address
 */
const importAccount = (
  privateKeyHex: string,
  network = bitcoin.networks.bitcoin
): BitcoinAccount => {
  const privateKey = Buffer.from(privateKeyHex, 'hex');

  // Create a keypair from the private key
  const keyPair = ECPair.fromPrivateKey(privateKey, { network });

  // Get the public key as hex
  const publicKey = keyPair.publicKey.toString();

  // Generate the SegWit address from the public key
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(keyPair.publicKey),
    network,
  });

  // Get the WIF format of the private key
  const wif = keyPair.toWIF();

  return {
    address: address!,
    privateKey: privateKeyHex,
    publicKey,
    wif,
  };
};

/**
 * Imports a Bitcoin account from a WIF (Wallet Import Format) private key
 * @param wif The WIF format private key
 * @param network The Bitcoin network to use (default: bitcoin.networks.bitcoin for mainnet)
 * @returns A BitcoinAccount object with SegWit address
 */
const importFromWIF = (
  wif: string,
  network = bitcoin.networks.bitcoin
): BitcoinAccount => {
  // Create a keypair from the WIF
  const keyPair = ECPair.fromWIF(wif, network);

  // Get the private key as hex
  const privateKey = keyPair.privateKey!.toString();

  // Get the public key as hex
  const publicKey = keyPair.publicKey.toString();

  // Generate the SegWit address from the public key
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(keyPair.publicKey),
    network,
  });

  return {
    address: address!,
    privateKey,
    publicKey,
    wif,
  };
};

/**
 * Generate a testnet SegWit account for testing purposes
 * @returns A BitcoinAccount object with testnet SegWit address
 */
const generateTestnetAccount = (): BitcoinAccount => {
  return generateBtcAccount(bitcoin.networks.testnet);
};

export {
  generateBtcAccount,
  importAccount,
  importFromWIF,
  generateTestnetAccount,
  BitcoinAccount,
};
