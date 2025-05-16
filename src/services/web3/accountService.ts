import { generateAccount } from '../../utils/web3/generateAccount';
import { contract } from '../../utils/web3/contract.2.0';
import { parseEther, parseUnits } from 'ethers';
import Web3Wallet from '../../models/web3Wallet';
import User from '../../models/user';
import {
  SupportedLISKStables,
  SupportedETHERLINKStables,
  SupportedBSCStables,
  SupportedGNOSISStables,
} from '../../utils/web3/supportedStables';
import {
  CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2,
  CHAINCOOPSAVINGCONTRACT_ETHERLINK_TESTNET,
  CHAINCOOPSAVING_BSC_TESTNET,
  CHAINCOOPSAVING_GNOSIS_TESTNET,
} from '../../constant/contract/ChainCoopSaving';

import { encrypt, decrypt } from '../encryption';
export interface TokenBalance {
  tokenAddress: string;
  balance: number;
  tokenSymbol: string;
}

const activateAccount = async (userId: string) => {
  const user = User.findById(userId);
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
//check existing user wallet
const checkExistingWallet = async (userId: string): Promise<boolean> => {
  const existingWallet = await Web3Wallet.findOne({ user: userId });
  return existingWallet!!;
};

//get use wallet
const getUserWeb3Wallet = async (userId: string) => {
  const wallet = await Web3Wallet.findOne({ user: userId });
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
  } else if (network === 'GNOSIS') {
    stables = SupportedGNOSISStables;
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
const getTokenAddressSymbol = async (tokenAddress: string, network: string) => {
  const con_tract = await contract(tokenAddress, network);
  const symbol = await con_tract.symbol();

  return symbol;
};
const userAddress = async (userId: string): Promise<string> => {
  const wallet = await Web3Wallet.findOne({ user: userId });
  return wallet.address;
};

const transferStable = async (
  userPrivateKey: string,
  amount: string,
  toAddress: string,
  tokenAddress: string,
  network: string
): Promise<string> => {
  try {
    const con_tract = await contract(tokenAddress, userPrivateKey, network);

    const tx = await con_tract.transfer(toAddress, parseEther(amount));

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
    contractAddress = CHAINCOOPSAVING_GNOSIS_TESTNET;
  } else {
    throw new Error(`Invalid approval network: ${network}`);
  }

  const tx = await con_tract.approve(contractAddress, parseUnits(amount, 6));
  console.log('Transaction hash:', tx);
  await tx.wait(1);
  return tx;
};

export {
  transferStable,
  activateAccount,
  checkStableUserBalance,
  userWeb3WalletDetails,
  checkExistingWallet,
  userAddress,
  approveTokenTransfer,
  getUserWeb3Wallet,
  getTokenAddressSymbol,
  totalUserTokenBalance,
  userTokensBalance,
};
