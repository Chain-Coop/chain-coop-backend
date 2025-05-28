import axios from 'axios';
import { generateAccount } from '../../utils/web3/generateAccount';
import { generateBtcAccount } from '../../utils/web3/generateAccountBTC';
import { contract } from '../../utils/web3/contract.2.0';
import { formatUnits, parseEther, parseUnits } from 'ethers';
import Web3Wallet from '../../models/web3Wallet';
import User from '../../models/user';
import {
  SupportedLISKStables,
  SupportedETHERLINKStables,
  SupportedBSCStables,
  SupportedPOLYGONStables,
} from '../../utils/web3/supportedStables';
import {
  CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2,
  CHAINCOOPSAVINGCONTRACT_ETHERLINK_TESTNET,
  CHAINCOOPSAVING_BSC_TESTNET,
  CHAINCOOPSAVING_POLYGON_TESTNET,
} from '../../constant/contract/ChainCoopSaving';
import BitcoinWallet, { IBitcoinWallet } from '../../models/bitcoinWallet';
import * as bitcoin from 'bitcoinjs-lib';
import * as tinysecp from 'tiny-secp256k1';
import { networks } from 'bitcoinjs-lib';

import { encrypt, decrypt } from '../encryption';
import ECPairFactory from 'ecpair';
import { sign } from 'crypto';

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
  return web3Wallet;
};

async function createUserBitcoinWallet(userId: string) {
  // Generate a new Bitcoin account
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

  // Save to database
  await wallet.save();

  return wallet;
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
    const tx = await con_tract.transfer(toAddress, parseUnits(amount, 6));

    await tx.wait();

    return tx.hash;
  } catch (error) {
    console.error('Error during token transfer:', error);
    throw new Error('Token transfer failed.');
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
    contractAddress = CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2;
  } else if (network === 'BSC') {
    contractAddress = CHAINCOOPSAVING_BSC_TESTNET;
  } else if (network === 'ETHERLINK') {
    contractAddress = CHAINCOOPSAVINGCONTRACT_ETHERLINK_TESTNET;
  } else if (network === 'GNOSIS') {
    contractAddress = CHAINCOOPSAVING_POLYGON_TESTNET;
  } else {
    throw new Error(`Invalid approval network: ${network}`);
  }

  const tx = await con_tract.approve(contractAddress, parseUnits(amount, 6));
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

export {
  transferStable,
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
};
