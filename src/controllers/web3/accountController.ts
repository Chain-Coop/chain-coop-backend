import AsyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import {
  activateAccount,
  checkStableUserBalance,
  checkExistingWallet,
  getUserWeb3Wallet,
  createUserBitcoinWallet,
  getBitcoinAddress,
  checkExistingBitcoinWallet,
  transferStable,
  transferBitcoin,
} from '../../services/web3/accountService';
import Web3Wallet, { Web3WalletDocument } from '../../models/web3Wallet';
import { decrypt } from '../../services/encryption';
import transaction from '../../models/web3/lnd/transaction';
import { tokenAddress } from '../../utils/web3/tokenaddress';

const activateWeb3Wallet = AsyncHandler(async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const exists = await checkExistingWallet(userId);
    if (exists) {
      res.status(400).json({ message: 'Wallet Already Activated' });
      return;
    }
    await activateAccount(userId);
    res.json({ message: 'Account activated successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
const activateBitcoinWallet = AsyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const exists = await checkExistingBitcoinWallet(userId);
      if (exists) {
        res.status(400).json({ message: 'Wallet Already Activated' });
        return;
      }
      await createUserBitcoinWallet(userId);

      res.json({ message: 'Account activated successfully' });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
);

const userDetails = AsyncHandler(async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  try {
    const exists = await checkExistingWallet(userId);
    if (!exists) {
      res.status(400).json({ message: 'No Wallet found' });
      return;
    }
    const details = await getUserWeb3Wallet(userId);
    const detailsBTC = await getBitcoinAddress(userId);
    //remove encryptedKey
    const { encryptedKey, publicKey, ...user } = details;

    res.json({
      data: {
        ...user,
        btcAddress: detailsBTC,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

const withdraw = AsyncHandler(async (req: Request, res: Response) => {
  try {
    const { amount, address, tokenId, network } = req.body;

    if (!amount || !address || !tokenId || !network) {
      res.status(400).json({
        message: 'input amount, adddress,tokenID,network',
      });
      return;
    }
    //@ts-ignore
    const user = req.user.userId;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const wallet = await getUserWeb3Wallet(user);
    if (!wallet) {
      res.status(400).json({ message: 'Wallet not found for this user' });
      return;
    }
    const userPrivateKey = decrypt(wallet.encryptedKey);
    const tokenIdNum = parseInt(tokenId, 10);
    if (isNaN(tokenIdNum)) {
      res.status(400).json({ message: 'Invalid tokenId' });
      return;
    }
    const tokenAddressToSaveWith = tokenAddress(tokenIdNum, network);

    const data = await transferStable(
      userPrivateKey,
      amount,
      address,
      tokenAddressToSaveWith,
      network
    );
    res.status(200).json({
      status: 'success',
      message: 'Token has been transferred successfully',
      data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

const withdrawBitcoin = AsyncHandler(async (req: Request, res: Response) => {
  const { amount, address } = req.body;
  if (!amount || !address) {
    res.status(400).json({
      message: 'amount and address is not defined ',
    });
  }
  //@ts-ignore
  const userId = req.user.userId;
  if (!userId) {
    res.status(401).json({
      message: 'Unauthorized',
    });
  }

  const data = await transferBitcoin(userId, amount, address);
  res.status(200).json({
    status: 'success',
    message: 'Bitcoin successfully sent ',
    data,
  });
});

export {
  activateWeb3Wallet,
  activateBitcoinWallet,
  userDetails,
  withdraw,
  withdrawBitcoin,
};
