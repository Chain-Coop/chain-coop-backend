import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import {
  getUserWeb3Wallet,
  getTokenAddressSymbol,
} from '../../../services/web3/accountService';
import { createTransactionHistory } from '../../../services/web3/historyService';
import { decrypt } from '../../../services/encryption';
import { tokenAddress } from '../../../utils/web3/tokenaddress';

import {
  createSavingCircles,
  deposit,
  withdraw,
  getCircle,
  getMemberCircles,
  decommissionCircle,
  setTokenAllowed,
  getMemberBalances,
} from '../../../services/web3/Savingcircles/savingCirlesServices';
import { ethers } from 'ethers';

const createCircles = asyncHandler(async (req: Request, res: Response) => {
  const { members, depositAmount, token, depositInterval, maxDeposits } =
    req.body;
  //@ts-ignore
  const userId = req.user.userId;
  if (
    !members ||
    !depositAmount ||
    !token ||
    !depositInterval ||
    !maxDeposits
  ) {
    res.status(400).json({
      message:
        'Provide all required values: members, depositAmount, token, depositInterval, maxDeposits',
    });
    return;
  }
  const wallet = await getUserWeb3Wallet(userId);
  if (!wallet) {
    res.status(400).json({ message: 'Please activate wallet' });
    return;
  }
  const userPrivateKey = decrypt(wallet.encryptedKey);
  const tokenIdNum = parseInt(token, 10);
  if (isNaN(tokenIdNum)) {
    res.status(400).json({ message: 'Invalid tokenId' });
    return;
  }
  const tokenAddressToSaveWith = tokenAddress(tokenIdNum);
  const tx = await createSavingCircles(
    members,
    depositAmount,
    tokenAddressToSaveWith,
    userPrivateKey,
    depositInterval,
    maxDeposits
  );
  if (!tx) {
    res.status(400).json({ message: 'Failed to create a circle' });
    return;
  }
  const tokenSymbol = await getTokenAddressSymbol(tokenAddressToSaveWith);
  await createTransactionHistory(
    userId,
    parseFloat(depositAmount),
    'SAVE',
    tx.hash,
    tokenSymbol
  );
  res.status(200).json({ message: 'Success', data: tx.hash });
  return;
});

const getSavingCircle = asyncHandler(async (req: Request, res: Response) => {
  const circleId = req.params.id;
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (!circleId) {
      res
        .status(400)
        .json({ message: 'Provide all required values: circleId' });
      return;
    }
    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }
    const userPrivateKey = decrypt(wallet.encryptedKey);
    const circle = await getCircle(circleId, userPrivateKey);
    res.status(200).json({ message: 'Success', data: circle });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ message: `Internal server error: ${error.message}` });
  }
});

const depositToCircle = asyncHandler(async (req: Request, res: Response) => {
  const { circleId, amount } = req.body;
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (!circleId || !amount) {
      res
        .status(400)
        .json({ message: 'Provide all required values: circleId, amount' });
      return;
    }

    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }
    const userPrivateKey = decrypt(wallet.encryptedKey);
    const circle = await getCircle(circleId, userPrivateKey);
    const token = circle[4];

    const tx = await deposit(token, circleId, amount, userPrivateKey);
    if (!tx) {
      res.status(400).json({ message: 'Failed to deposit in circle' });
      return;
    }
    const tokenSymbol = await getTokenAddressSymbol(token);
    await createTransactionHistory(
      userId,
      parseFloat(amount),
      'SAVE',
      tx.hash,
      tokenSymbol
    );
    res.status(200).json({ message: 'Success', data: tx.hash });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ message: `Internal server error: ${error.message}` });
  }
});

const withdrawFromCircle = asyncHandler(async (req: Request, res: Response) => {
  const { circleId } = req.body;
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (!circleId) {
      res
        .status(400)
        .json({ message: 'Provide all required values: circleId' });
      return;
    }

    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }
    const userPrivateKey = decrypt(wallet.encryptedKey);
    const circle = await getCircle(circleId, userPrivateKey);
    const tokenAddressToSaveWith = circle[4];
    const amount = circle[3] * circle[1].length;
    const withdrawAmount = (amount * 10 ** -18).toString();

    const tx = await withdraw(circleId, userPrivateKey);
    if (!tx) {
      res.status(400).json({ message: 'Failed to withdraw from circle ' });
      return;
    }
    const tokenSymbol = await getTokenAddressSymbol(tokenAddressToSaveWith);
    await createTransactionHistory(
      userId,
      parseFloat(withdrawAmount),
      'WITHDRAW',
      tx.hash,
      tokenSymbol
    );

    res.status(200).json({ message: 'Success', data: tx.hash });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ message: `Internal server error: ${error.message}` });
  }
});

const setSavingTokenAllowed = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, allowed } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const tokenIdNum = parseInt(token, 10);
      if (isNaN(tokenIdNum)) {
        res.status(400).json({ message: 'Invalid tokenId' });
        return;
      }
      const tokenAddressToSaveWith = tokenAddress(tokenIdNum);
      const tx = await setTokenAllowed(
        tokenAddressToSaveWith,
        allowed,
        userPrivateKey
      );
      if (!tx) {
        res.status(400).json({ message: 'Failed to set allowed tokens ' });
        return;
      }
      res.status(200).json({ message: 'Success', data: tx.hash });
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ message: `Internal server error: ${error.message}` });
    }
  }
);

const decommissionSavingCircle = asyncHandler(
  async (req: Request, res: Response) => {
    const { circleId } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);

      const tx = await decommissionCircle(circleId, userPrivateKey);
      if (!tx) {
        res.status(400).json({ message: 'Failed to decommission circle ' });
        return;
      }

      res.status(200).json({ message: 'Success', data: tx.hash });
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ message: `Internal server error: ${error.message}` });
    }
  }
);

const getSavingMemberCircles = asyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const circles = await getMemberCircles(userPrivateKey);
      res.status(200).json({ message: 'Success', data: circles });
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ message: `Internal server error: ${error.message}` });
    }
  }
);

const getSavingMemberBalances = asyncHandler(
  async (req: Request, res: Response) => {
    const circleId = req.params.id;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const [members, balances] = await getMemberBalances(
        circleId,
        userPrivateKey
      );
      res.status(200).json({
        message: 'Success',
        data: members.map((member: string, index: number) => ({
          member,
          balance: balances[index].toString(),
        })),
      });
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ message: `Internal server error: ${error.message}` });
    }
  }
);

export {
  createCircles,
  depositToCircle,
  withdrawFromCircle,
  setSavingTokenAllowed,
  getSavingMemberBalances,
  getSavingMemberCircles,
  getSavingCircle,
  decommissionSavingCircle,
};
