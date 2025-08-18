import axios from 'axios';
import { generateAccount } from '../../utils/web3/generateAccount';
import { generateBtcAccount } from '../../utils/web3/generateAccountBTC';
import { contract } from '../../utils/web3/contract.2.0';
import { v4 as uuidv4 } from 'uuid';
import {
  formatUnits,
  JsonRpcProvider,
  parseEther,
  parseUnits,
  Provider,
  uuidV4,
} from 'ethers';
import Web3Wallet from '../../models/web3Wallet';
import User from '../../models/authModel';
import {
  SupportedLISKStables,
  SupportedETHERLINKStables,
  SupportedBSCStables,
  SupportedPOLYGONStables,
} from '../../utils/web3/supportedStables';
import {
  CHAINCOOPSAVINGCONTRACT_LISK,
  CHAINCOOPSAVINGCONTRACT_ETHERLINK,
  CHAINCOOPSAVING_BSC,
  CHAINCOOPSAVING_POLYGON
} from '../../constant/contract/ChainCoopSaving';
import { BSC_RPC, POLYGON_RPC } from '../../constant/rpcs';
import BitcoinWallet, {
  BitcoinLockEntry,
  IBitcoinWallet,
} from '../../models/bitcoinWallet';
import LndWallet, { ILndWallet } from '../../models/web3/lnd/wallet';
import * as bitcoin from 'bitcoinjs-lib';
import * as tinysecp from 'tiny-secp256k1';
import { networks } from 'bitcoinjs-lib';

import { encrypt, decrypt } from '../encryption';
import ECPairFactory from 'ecpair';
import { Signer } from '../../utils/web3/createSingner';
import {
  SAVINGCIRCLESCONTRACT_BSC,
  SAVINGCIRCLESCONTRACT_POLYGON,
} from '../../constant/contract/SavingCircles';
require('dotenv').config();

// Initialize ECPair with the required elliptic curve implementation
const ECPair = ECPairFactory(tinysecp);

export interface TokenBalance {
  tokenAddress: string;
  balance: number;
  tokenSymbol: string;
}

export interface BlockcypherBalance {
  balance: number;
  final_balance: number;
}
export interface BlockchainInfoBalance {
  [address: string]: {
    final_balance: number;
  };
}

const BITCOIN_NETWORK = networks.bitcoin; // Use testnet for development, change to networks.bitcoin for mainnet
const SATOSHI_TO_BTC = 100000000;
const BTC_FEE_API = 'https://api.blockchain.info/mempool/fees'; // For mainnet
const BTC_TESTNET_FEE_API = 'https://api.blockcypher.com/v1/btc/test3'; // For testnet

const activateAccount = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const { address, privateKey, publicKey } = generateAccount();

  const web3Wallet = new Web3Wallet({
    user: userId,
    encryptedKey: encrypt(privateKey),
    publicKey: publicKey,
    address: address,
  });

  await web3Wallet.save();
  await user.updateOne({
    isWalletActivated: true,
  });
  return web3Wallet;
};

async function createUserBitcoinWallet(userId: string) {
  // Generate a new Bitcoin account
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  const bitcoinAccount = generateBtcAccount();

  if (!bitcoinAccount.privateKey) {
    throw new Error('Failed to generate Bitcoin private key');
  }

  // Encrypt the sensitive data
  const encryptedPrivateKey = encrypt(bitcoinAccount.privateKey!);
  const encryptedWif = encrypt(bitcoinAccount.wif);

  // Create a new wallet document
  const wallet = new BitcoinWallet({
    user: userId,
    encryptedPrivateKey,
    encryptedWif,
    publicKey: bitcoinAccount.publicKey,
    address: bitcoinAccount.address,
    walletType: 'segwit', // Using SegWit by default
  });
  if (
    (await LndWallet.findOne({ userId })) === null ||
    (await LndWallet.findOne({ userId })) === undefined
  ) {
    const lightningWallet: ILndWallet = new LndWallet({
      userId: userId,
      balance: 0,
      lockedBalance: 0,
    });
    await lightningWallet.save();
  }

  await wallet.save();
  // Update the user document
  await user.updateOne({
    isBitcoinWalletActivated: true,
  });

  return {
    wallet: wallet,
  };
}
//check existing user wallet
const checkExistingWallet = async (userId: string): Promise<boolean> => {
  const existingWallet = await Web3Wallet.findOne({ user: userId });
  return !!existingWallet;
};
const checkExistingBitcoinWallet = async (userId: string): Promise<boolean> => {
  const existingWallet = await BitcoinWallet.findOne({ user: userId });
  return !!existingWallet;
};

//get use wallet
const getUserWeb3Wallet = async (userId: string) => {
  const wallet = await Web3Wallet.findOne({ user: userId });
  if (!wallet) {
    throw new Error('No wallet found for this user');
  }
  return wallet?._doc;
};

//publickey is the address
const checkStableUserBalance = async (
  publicKey: string,
  tokenAddress: string,
  network: string
): Promise<{ bal: number; symbol: string }> => {
  const con_tract = await contract(tokenAddress, network);
  const balance = await con_tract.balanceOf(publicKey);
  //token symbol
  const tokenSymbol = await con_tract.symbol();
  //token decimal
  const tokenDecimal = await con_tract.decimals();
  const adjustedBalance =
    Number(balance.toString()) / 10 ** Number(tokenDecimal);
  return { bal: adjustedBalance, symbol: tokenSymbol };
};
//user tokenBalances
const userTokensBalance = async (
  network: string,
  publicKey: string
): Promise<TokenBalance[]> => {
  let stables;
  if (network === 'LISK') {
    stables = SupportedLISKStables;
  } else if (network === 'BSC') {
    stables = SupportedBSCStables;
  } else if (network === 'ETHERLINK') {
    stables = SupportedETHERLINKStables;
  } else if (network === 'POLYGON') {
    stables = SupportedPOLYGONStables;
  } else {
    throw new Error(`Invalid network: ${network}`);
  }
  const tokens = stables.map((tokenObj) => Object.values(tokenObj)[0]);

  const tokenBalances = await Promise.all(
    tokens.map(async (tokenAddress) => {
      const { bal, symbol } = await checkStableUserBalance(
        publicKey,
        tokenAddress,
        network
      );
      return {
        tokenAddress,
        balance: bal,
        tokenSymbol: symbol,
      } as TokenBalance;
    })
  );
  return tokenBalances;
};
//total sum of all the tokens
const totalUserTokenBalance = async (
  publicKey: string,
  network: string
): Promise<number> => {
  const tokenBalances = await userTokensBalance(network, publicKey);
  const totalBalance = tokenBalances.reduce(
    (acc, tokenBalance) => acc + tokenBalance.balance,
    0
  );
  return totalBalance;
};

const getBitcoinBalance = async (userId: string): Promise<number> => {
  try {
    const wallet = await BitcoinWallet.findOne({ user: userId });
    if (!wallet) {
      throw new Error('Bitcoin wallet not found for this user');
    }

    const isMainnet = BITCOIN_NETWORK === networks.bitcoin;
    const baseUrl = isMainnet
      ? `https://blockchain.info/balance?active=${wallet.address}`
      : `https://api.blockcypher.com/v1/btc/test3/addrs/${wallet.address}/balance`;

    const response = await axios.get<BlockchainInfoBalance>(baseUrl);
    if (isMainnet) {
      return response.data[wallet.address].final_balance / SATOSHI_TO_BTC;
    } else {
      const response = await axios.get<BlockcypherBalance>(baseUrl);
      return response.data.balance / SATOSHI_TO_BTC;
    }
  } catch (error: any) {
    console.error('Error fetching Bitcoin balance:', error);
    throw new Error(`Failed to fetch Bitcoin balance: ${error.message}`);
  }
};
const getTokenAddressSymbol = async (tokenAddress: string, network: string) => {
  const con_tract = await contract(tokenAddress, network);
  const symbol = await con_tract.symbol();

  return symbol;
};
const userAddress = async (userId: string): Promise<string> => {
  const wallet = await Web3Wallet.findOne({ user: userId });
  return wallet.address;
};
const getBitcoinAddress = async (userId: string): Promise<string> => {
  const wallet = await BitcoinWallet.findOne({ user: userId });
  if (!wallet) {
    throw new Error('Bitcoin wallet not found for this user');
  }
  return wallet.address;
};

const validateBitcoinAddress = (address: string): boolean => {
  try {
    bitcoin.address.toOutputScript(address, BITCOIN_NETWORK);
    return true;
  } catch (error) {
    return false;
  }
};

const transferStable = async (
  userPrivateKey: string,
  amount: string,
  toAddress: string,
  tokenAddress: string,
  network: string
): Promise<string> => {
  try {
    const con_tract = await contract(tokenAddress, network, userPrivateKey);
    const tx = await con_tract.transfer(
      toAddress,
      parseUnits(amount, await con_tract.decimals())
    );

    await tx.wait();

    return tx.hash;
  } catch (error) {
    console.error('Error during token transfer:', error);
    throw new Error('Token transfer failed.');
  }
};
const transferCrypto = async (
  amount: string,
  toAddress: string,
  network: string
): Promise<any> => {
  try {
    let provider;
    if (network === 'BSC') {
      provider = new JsonRpcProvider(BSC_RPC);
    } else if (network === 'POLYGON') {
      provider = new JsonRpcProvider(POLYGON_RPC);
    } else {
      throw new Error(`Unsupported network: ${network}`);
    }
    const signer = await Signer(process.env.RELAYER_PRIVATE_KEY!, provider);
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: parseEther(amount),
    });
    await tx.wait(1);
    return tx;
  } catch (error) {
    console.error('Error during crypto transfer:', error);
    throw new Error('Crypto transfer failed.');
  }
};

//get user account details
const userWeb3WalletDetails = async (userId: string) => {
  try {
    const wallets = await Web3Wallet.find({ user: userId })
      .select('-encryptedKey')
      .populate('user', 'email phoneNumber'); // Optionally include specific user fields

    if (!wallets || wallets.length === 0) {
      throw new Error('No wallets found for this user');
    }

    return wallets;
  } catch (error: any) {
    throw new Error(`Error fetching wallet details: ${error.message}`);
  }
};

const transferBitcoin = async (
  userId: string,
  amount: number,
  toAddress: string,
  feeRate?: number
): Promise<string> => {
  try {
    // Fetch user's Bitcoin wallet
    const wallet = await BitcoinWallet.findOne({ user: userId });
    if (!wallet) {
      throw new Error('Bitcoin wallet not found for this user');
    }

    const availableBalance = await getAvailableBitcoinBalance(userId);

    if (availableBalance < amount) {
      throw new Error(
        `Insufficient available balance. Available: ${availableBalance}`
      );
    }

    // Get the private key
    const wif = decrypt(wallet.encryptedWif);
    const network = BITCOIN_NETWORK;
    const keyPair = ECPair.fromWIF(wif, network);

    // Create a P2WPKH (SegWit) address
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(keyPair.publicKey),
      network,
    });

    if (address !== wallet.address) {
      throw new Error('Generated address does not match stored address');
    }

    const signer: bitcoin.Signer = {
      publicKey: Buffer.from(keyPair.publicKey),
      network,
      sign: (hash: Buffer) => Buffer.from(keyPair.sign(hash)),
    };

    // Get the current fee rate if not provided
    if (!feeRate) {
      feeRate = await getBitcoinFeeRate(); // sat/vB
    }

    const amountSatoshis = Math.floor(amount * SATOSHI_TO_BTC);

    // Get UTXOs
    const utxos = await getUnspentOutputs(
      wallet.address,
      network === networks.bitcoin
    );

    if (!utxos || utxos.length === 0) {
      throw new Error('No UTXOs available');
    }

    // 1. Build dummy PSBT to estimate actual transaction size
    const dummyPsbt = new bitcoin.Psbt({ network });
    let totalInput = 0;

    for (const utxo of utxos) {
      dummyPsbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(wallet.address, network),
          value: utxo.value,
        },
      });
      totalInput += utxo.value;
    }

    // Dummy outputs
    dummyPsbt.addOutput({ address: toAddress, value: 1000 });
    dummyPsbt.addOutput({ address: wallet.address, value: 1000 });

    for (let i = 0; i < utxos.length; i++) {
      dummyPsbt.signInput(i, signer);
    }
    dummyPsbt.finalizeAllInputs();

    const dummyTxHex = dummyPsbt.extractTransaction().toHex();
    const txSize = Buffer.from(dummyTxHex, 'hex').length;
    const fee = Math.ceil(txSize * feeRate); // accurate fee in satoshis

    // 2. Validate sufficient balance
    const changeAmount = totalInput - amountSatoshis - fee;
    if (changeAmount < 0) {
      throw new Error('Insufficient funds including fee');
    }

    // 3. Build actual transaction
    const psbt = new bitcoin.Psbt({ network });

    for (const utxo of utxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(wallet.address, network),
          value: utxo.value,
        },
      });
    }

    psbt.addOutput({ address: toAddress, value: amountSatoshis });

    if (changeAmount > 546) {
      psbt.addOutput({ address: wallet.address, value: changeAmount });
    }

    for (let i = 0; i < utxos.length; i++) {
      psbt.signInput(i, signer);
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();

    const txId = await broadcastTransaction(
      tx.toHex(),
      network === networks.bitcoin
    );
    return txId;
  } catch (error: any) {
    console.error('Error transferring Bitcoin:', error);
    throw new Error(`Bitcoin transfer failed: ${error.message}`);
  }
};

//approve token transfer
const approveTokenTransfer = async (
  tokenAddress: string,
  amount: string,
  userPrivateKey: string,
  network: string
) => {
  const con_tract = await contract(tokenAddress, network, userPrivateKey);
  let contractAddress;
  if (network === 'LISK') {
    contractAddress = CHAINCOOPSAVINGCONTRACT_LISK;
  } else if (network === 'BSC') {
    contractAddress = CHAINCOOPSAVING_BSC;
  } else if (network === 'ETHERLINK') {
    contractAddress = CHAINCOOPSAVINGCONTRACT_ETHERLINK;
  } else if (network === 'POLYGON') {
    contractAddress = CHAINCOOPSAVING_POLYGON;
  } else if (network === 'TBSC') {
    contractAddress = SAVINGCIRCLESCONTRACT_BSC;
  } else if (network === 'TPOLYGON') {
    contractAddress = SAVINGCIRCLESCONTRACT_POLYGON;
  } else {
    throw new Error(`Invalid approval network: ${network}`);
  }

  const tx = await con_tract.approve(
    contractAddress,
    parseUnits(amount, await con_tract.decimals())
  );
  console.log('Transaction hash:', tx);
  await tx.wait(1);
  return tx;
};

const getBitcoinFeeRate = async (): Promise<number> => {
  try {
    if (BITCOIN_NETWORK === networks.bitcoin) {
      // Mainnet fee API
      const response = await axios.get(BTC_FEE_API);
      return (response.data as { regular: number }).regular; // Return regular fee rate
    } else {
      // Testnet fee API
      const response = await axios.get(BTC_TESTNET_FEE_API);
      const data = response.data as { medium_fee_per_kb: number };
      return data.medium_fee_per_kb / 1000; // Convert from kb to byte
    }
  } catch (error) {
    console.error('Error fetching fee rate:', error);
    return 10; // Default fallback fee rate
  }
};

const getUnspentOutputs = async (
  address: string,
  isMainnet: boolean
): Promise<any[]> => {
  try {
    const baseUrl = isMainnet
      ? `https://blockchain.info/unspent?active=${address}`
      : `https://api.blockcypher.com/v1/btc/test3/addrs/${address}?unspentOnly=true`;

    const response = await axios.get(baseUrl);

    if (isMainnet) {
      const data = response.data as { unspent_outputs: any[] };
      return data.unspent_outputs.map((utxo: any) => ({
        txid: utxo.tx_hash_big_endian,
        vout: utxo.tx_output_n,
        value: utxo.value,
        script: utxo.script,
      }));
    } else {
      const data = response.data as { txrefs: any[] };
      return data.txrefs.map((utxo: any) => ({
        txid: utxo.tx_hash,
        vout: utxo.tx_output_n,
        value: utxo.value,
      }));
    }
  } catch (error: any) {
    console.error('Error fetching UTXOs:', error);
    throw new Error(`Failed to fetch UTXOs: ${error.message}`);
  }
};
const broadcastTransaction = async (
  txHex: string,
  isMainnet: boolean
): Promise<string> => {
  try {
    const baseUrl = isMainnet
      ? 'https://blockchain.info/pushtx'
      : 'https://api.blockcypher.com/v1/btc/test3/txs/push';

    let response;
    if (isMainnet) {
      response = await axios.post(baseUrl, { tx: txHex });
      return String(response.data); // Transaction hash
    } else {
      response = await axios.post(baseUrl, { tx: txHex });
      const data = response.data as { tx: { hash: string } };
      return data.tx.hash;
    }
  } catch (error: any) {
    console.error('Error broadcasting transaction:', error);
    throw new Error(`Failed to broadcast transaction: ${error.message}`);
  }
};

/**
 * Locks a specific amount of Bitcoin for a given duration
 * @param userId User ID
 * @param amount Amount to lock in BTC
 * @param durationInSeconds Lock duration in seconds
 * @param reason Optional reason for the lock
 * @returns Updated wallet with lock information
 */
const lockBitcoinAmount = async (
  userId: string,
  amount: number,
  durationInSeconds: number,
  reason?: string
): Promise<BitcoinLockEntry> => {
  const wallet = await BitcoinWallet.findOne({ user: userId });
  if (!wallet) {
    throw new Error('Bitcoin wallet not found for this user');
  }

  // Get current balance
  const currentBalance = await getAvailableBitcoinBalance(userId);
  if (currentBalance < amount) {
    throw new Error(
      `Insufficient balance. Available: ${currentBalance} BTC, Requested: ${amount} BTC`
    );
  }

  // Set lock parameters
  const lockedAt = new Date();
  const unlocksAt = new Date(lockedAt.getTime() + durationInSeconds * 1000);
  const amountSatoshis = Math.floor(amount * SATOSHI_TO_BTC);

  const lockEntry: BitcoinLockEntry = {
    lockedAmount: amount,
    lockedAmountSatoshis: amountSatoshis,
    lockDuration: durationInSeconds,
    lockedAt: lockedAt,
    maturityDate: unlocksAt,
    purpose: reason || 'General Lock',
    lockId: uuidv4(),
  };
  wallet.lock.push(lockEntry);

  await wallet.save();
  return lockEntry;
};

/**
 * Unlocks Bitcoin if the lock period has expired
 * @param userId User ID
 * @returns Updated wallet information
 */
const unlockBitcoinAmount = async (userId: string): Promise<IBitcoinWallet> => {
  const wallet = await BitcoinWallet.findOne({ user: userId });
  if (!wallet) {
    throw new Error('Bitcoin wallet not found for this user');
  }

  if (wallet.lock.length === 0) {
    throw new Error('No active lock found for this wallet');
  }

  const now = new Date();

  const expiredLocks = wallet.lock.filter(
    (lock: BitcoinLockEntry) => lock.maturityDate && lock.maturityDate <= now
  );

  if (expiredLocks.length === 0) {
    throw new Error('No locks have expired yet');
  }

  // Remove expired locks by comparing lockId
  const expiredLockIds = new Set(expiredLocks.map((lock) => lock.lockId));
  wallet.lock = wallet.lock.filter(
    (lock: BitcoinLockEntry) => !expiredLockIds.has(lock.lockId)
  );

  await wallet.save();
  return wallet;
};

/**
 * Gets the available (unlocked) balance for a user
 * @param userId User ID
 * @returns Available balance in BTC
 */

const getAvailableBitcoinBalance = async (userId: string): Promise<number> => {
  const wallet = await BitcoinWallet.findOne({ user: userId });
  if (!wallet) {
    throw new Error('Bitcoin wallet not found for this user');
  }

  const totalBalance = await getBitcoinBalance(userId); // should return BTC
  const lockedAmount =
    (wallet.lock ?? []).reduce(
      (acc, lock) => acc + (lock.lockedAmountSatoshis || 0),
      0
    ) / SATOSHI_TO_BTC;

  const availableBalance = Math.max(0, totalBalance - lockedAmount);
  return availableBalance;
};

/**
 * Gets detailed balance information including locked amounts
 * @param userId User ID
 * @returns Detailed balance information
 */
const getBitcoinBalanceDetails = async (userId: string) => {
  const wallet = await BitcoinWallet.findOne({ user: userId });
  if (!wallet) {
    throw new Error('Bitcoin wallet not found for this user');
  }

  const totalBalance = await getBitcoinBalance(userId); // should return in BTC
  const lockedAmountSatoshis = (wallet.lock ?? []).reduce(
    (acc, lock) => acc + (lock.lockedAmountSatoshis || 0),
    0
  );
  const lockedBalance = lockedAmountSatoshis / SATOSHI_TO_BTC;
  const availableBalance = Math.max(0, totalBalance - lockedBalance);

  return {
    address: wallet.address,
    walletType: wallet.walletType,
    totalBalance,
    lockedBalance,
    availableBalance,
    locks: wallet.lock,
  };
};
/**
 * Gets lock status for a user's wallet
 * @param userId User ID
 * @returns Lock status information
 */
const getBitcoinLockStatus = async (userId: string) => {
  const wallet = await BitcoinWallet.findOne({ user: userId });
  if (!wallet) {
    throw new Error('Bitcoin wallet not found for this user');
  }

  if (wallet.lock.length === 0) {
    return { isLocked: false, locks: [] };
  }
  const locks = wallet.lock.map((lock) => ({
    lockedAmount: lock.lockedAmount,
    lockedAmountSatoshis: lock.lockedAmountSatoshis,
    lockDuration: lock.lockDuration,
    lockedAt: lock.lockedAt,
    maturityDate: lock.maturityDate,
    purpose: lock.purpose,
    lockId: lock.lockId,
  }));
  return { isLocked: true, locks };
};
const getLockDetails = async (
  userId: string,
  lockId: string
): Promise<BitcoinLockEntry | null> => {
  const wallet = await BitcoinWallet.findOne({ user: userId });
  if (!wallet) {
    throw new Error('Bitcoin wallet not found for this user');
  }
  const lockEntry = wallet.lock.find((lock) => lock.lockId === lockId);
  if (!lockEntry) {
    throw new Error('Lock entry not found');
  }
  return lockEntry;
};
// Export all functions for use in other modules

export {
  transferStable,
  transferCrypto,
  activateAccount,
  createUserBitcoinWallet,
  checkStableUserBalance,
  userWeb3WalletDetails,
  checkExistingWallet,
  userAddress,
  approveTokenTransfer,
  getUserWeb3Wallet,
  getTokenAddressSymbol,
  totalUserTokenBalance,
  userTokensBalance,
  getBitcoinBalance,
  getBitcoinAddress,
  transferBitcoin,
  validateBitcoinAddress,
  checkExistingBitcoinWallet,
  lockBitcoinAmount,
  unlockBitcoinAmount,
  getAvailableBitcoinBalance,
  getBitcoinBalanceDetails,
  getBitcoinLockStatus,
  getLockDetails,
};
