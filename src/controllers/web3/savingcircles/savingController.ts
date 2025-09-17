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
  extractCircleIdFromReceipt,
} from '../../../services/web3/Savingcircles/savingCirlesServices';
import { Circle } from '../../../models/web3/groupSaving';
import { ethers } from 'ethers';
import User, { UserDocument } from '../../../models/authModel';
import { get } from 'axios';
import mongoose from 'mongoose';

const createCircles = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    depositAmount,
    token,
    depositInterval,
    maxDeposits,
    network,
  } = req.body;
  //@ts-ignore
  const userId = req.user.userId;
  if (
    !depositAmount ||
    !token ||
    !depositInterval ||
    !maxDeposits ||
    !network
  ) {
    res.status(400).json({
      message:
        'Provide all required values: members, depositAmount, token, depositInterval, maxDeposits,network',
    });
    return;
  }
  const tokenIdNum = parseInt(token, 10);
  if (isNaN(tokenIdNum)) {
    res.status(400).json({ message: 'Invalid tokenId' });
    return;
  }
  const tokenAddressToSaveWith = tokenAddress(tokenIdNum, network);
  const circle = new Circle({
    owner: userId,
    members: [userId],
    title,
    description,
    depositAmount,
    token: tokenAddressToSaveWith,
    depositInterval,
    maxDeposits,
    status: 'pending',
    network,
  });
  await circle.save();
  res.status(200).json({ message: 'Success', data: circle });
  return;
});

const addMemberToCircle = asyncHandler(async (req: Request, res: Response) => {
  const { circleId, memberEmail } = req.body;
  //@ts-ignore
  const userId = req.user.userId;
  if (!circleId || !memberEmail) {
    res.status(400).json({
      message: 'Provide all required values: circleId, memberId',
    });
    return;
  }
  try {
    const memberId = await User.findOne({ email: memberEmail }).then((user) => {
      if (!user) {
        res.status(404).json({ message: 'Member not found' });
        return;
      }
      return user._id as string;
    });
    const circle = await Circle.findById(circleId);
    if (!circle) {
      res.status(404).json({ message: 'Circle not found' });
      return;
    }
    if (circle.members.includes(new mongoose.Types.ObjectId(memberId))) {
      res.status(400).json({ message: 'Member already in circle' });
      return;
    }
    if (circle.isOnChain) {
      res
        .status(400)
        .json({ message: 'Cannot add members to on-chain circle' });
      return;
    }
    if (circle.owner.toString() !== userId) {
      res.status(403).json({ message: 'Only owner can add members' });
      return;
    }
    circle.members.push(new mongoose.Types.ObjectId(memberId));
    await circle.save();
    res
      .status(200)
      .json({ message: 'Member added successfully', data: circle });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
});
const deleteMemberFromCircle = asyncHandler(
  async (req: Request, res: Response) => {
    const { circleId, memberEmail } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    if (!circleId || !memberEmail) {
      res.status(400).json({
        message: 'Provide all required values: circleId, memberId',
      });
      return;
    }
    try {
      const memberId = await User.findOne({ email: memberEmail }).then(
        (user) => {
          if (!user) {
            res.status(404).json({ message: 'Member not found' });
            return;
          }
          return user._id as string;
        }
      );
      const circle = await Circle.findById(circleId);
      if (!circle) {
        res.status(404).json({ message: 'Circle not found' });
        return;
      }
      if (!circle.members.includes(new mongoose.Types.ObjectId(memberId))) {
        res.status(400).json({ message: 'Member not in circle' });
        return;
      }
      if (circle.isOnChain) {
        res
          .status(400)
          .json({ message: 'Cannot remove members from on-chain circle' });
        return;
      }
      if (circle.owner.toString() !== userId) {
        res.status(403).json({ message: 'Only owner can remove members' });
        return;
      }
      circle.members = circle.members.filter(
        (member) => member.toString() !== memberId?.toString()
      );
      await circle.save();
      res
        .status(200)
        .json({ message: 'Member removed successfully', data: circle });
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
  }
);

const activateCircle = asyncHandler(async (req: Request, res: Response) => {
  const { circleId } = req.body;
  //@ts-ignore
  const userId = req.user.userId;
  if (!circleId) {
    res.status(400).json({ message: 'Provide all required values: circleId' });
    return;
  }
  try {
    const circle = await Circle.findById(circleId);
    if (!circle) {
      res.status(404).json({ message: 'Circle not found' });
      return;
    }
    if (circle.isOnChain) {
      res.status(400).json({ message: 'Circle is already on-chain' });
      return;
    }
    if (circle.owner.toString() !== userId) {
      res.status(403).json({ message: 'Only owner can activate circle' });
      return;
    }
    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }
    const memberWalletAddresses = await Promise.all(
      circle.members.map(async (member) => {
        const userWallet = await getUserWeb3Wallet(member.toString());
        return userWallet.address;
      })
    );
    const userPrivateKey = decrypt(wallet.encryptedKey);
    const tx = await createSavingCircles(
      memberWalletAddresses,
      Number(circle.depositAmount),
      circle.token,
      userPrivateKey,
      circle.depositInterval,
      circle.maxDeposits,
      circle.network
    );
    if (!tx) {
      res.status(400).json({ message: 'Failed to activate circle' });
      return;
    }

    circle.isOnChain = true;
    circle.transactionHash = tx.hash;
    circle.contractCircleId = await extractCircleIdFromReceipt(tx);
    circle.status = 'active';
    circle.circleStart = new Date();
    await circle.save();
    res.status(200).json({ message: 'Success', data: circle });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ message: `Internal server error: ${error.message}` });
  }
});

const getSavingCircle = asyncHandler(async (req: Request, res: Response) => {
  const circleId = req.params.id;
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (!circleId) {
      res.status(400).json({ message: 'Provide circleId' });
      return;
    }
    const circle = await Circle.findById(circleId);
    if (!circle) {
      res.status(404).json({ message: 'Circle not found' });
      return;
    }
    if (!circle.members.toString().includes(userId)) {
      res.status(403).json({ message: 'You are not a member of this circle' });
      return;
    }
    res.status(200).json({ message: 'Success', data: circle });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ message: `Internal server error: ${error.message}` });
  }
});

const getCircleDetails = asyncHandler(async (req: Request, res: Response) => {
  const circleId = req.params.id;
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (!circleId) {
      res.status(400).json({ message: 'Provide circleId' });
      return;
    }

    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }

    const userPrivateKey = decrypt(wallet.encryptedKey);
    const circleDetails = await Circle.findById(circleId);
    if (!circleDetails) {
      res.status(404).json({ message: 'Circle not found in database' });
      return;
    }
    if (!circleDetails.members.toString().includes(userId)) {
      res.status(403).json({ message: 'You are not a member of this circle' });
      return;
    }

    const circle = await getCircle(
      circleId,
      userPrivateKey,
      circleDetails.network
    );
    res.status(200).json({ message: 'Success', data: circle });
  } catch (error: any) {
    console.error(error);
    res
      .status(500)
      .json({ message: `Internal server error: ${error.message}` });
  }
});

const getCirclesbyMember = asyncHandler(async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  try {
    const circles = await Circle.find({ members: userId });
    if (!circles || circles.length === 0) {
      res.status(404).json({ message: 'No circles found for this member' });
      return;
    }
    res.status(200).json({ message: 'Success', data: circles });
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
    const circle = await Circle.findById(circleId);
    if (!circle) {
      res.status(404).json({ message: 'Circle not found' });
      return;
    }
    if (!circle.members.toString().includes(userId)) {
      res.status(403).json({ message: 'You are not a member of this circle' });
      return;
    }
    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }
    const userPrivateKey = decrypt(wallet.encryptedKey);
    if (!circle.contractCircleId) {
      res.status(400).json({ message: 'Circle has been sent onchain' });
      return;
    }

    const tx = await deposit(
      circle.token,
      circle.contractCircleId,
      amount,
      userPrivateKey,
      circle.network
    );
    if (!tx) {
      res.status(400).json({ message: 'Failed to deposit in circle' });
      return;
    }
    const tokenSymbol = await getTokenAddressSymbol(
      circle.token,
      circle.network
    );
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
    const circle = await Circle.findById(circleId);
    if (!circle) {
      res.status(404).json({ message: 'Circle not found' });
      return;
    }
    if (!circle.members.toString().includes(userId)) {
      res.status(403).json({ message: 'You are not a member of this circle' });
      return;
    }
    if (!circle.contractCircleId) {
      res.status(400).json({ message: 'Circle has been sent onchain' });
      return;
    }

    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: 'Please activate wallet' });
      return;
    }
    const userPrivateKey = decrypt(wallet.encryptedKey);
    const tokenAddressToSaveWith = circle.token;

    const tx = await withdraw(
      circle.contractCircleId,
      userPrivateKey,
      circle.network
    );
    if (!tx) {
      res.status(400).json({ message: 'Failed to withdraw from circle ' });
      return;
    }
    const tokenSymbol = await getTokenAddressSymbol(
      tokenAddressToSaveWith,
      circle.network
    );
    const result = await getCircle(
      circle.contractCircleId,
      userPrivateKey,
      circle.network
    );
    const amount = result[3] * result[1].length;
    const withdrawAmount = ethers.formatEther(amount);

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
    const { token, allowed, network } = req.body;
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
      const tokenAddressToSaveWith = tokenAddress(tokenIdNum, network);
      const tx = await setTokenAllowed(
        tokenAddressToSaveWith,
        allowed,
        userPrivateKey,
        network
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
      if (!circleId) {
        res.status(400).json({ message: 'Input a Circle ID' });
        return;
      }
      const circle = await Circle.findById(circleId);
      if (!circle) {
        res.status(404).json({ message: 'Circle not found' });
        return;
      }
      if (circle.owner.toString() !== userId) {
        res.status(403).json({
          message: 'Unauthorized you are not the owner of this circle',
        });
      }
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      if (!circle.contractCircleId) {
        res.status(400).json({ message: 'Circle has been sent onchain' });
        return;
      }

      const tx = await decommissionCircle(
        circle.contractCircleId,
        userPrivateKey,
        circle.network
      );
      if (!tx) {
        res.status(400).json({ message: 'Failed to decommission circle ' });
        return;
      }
      circle.status = 'decommissioned';
      await circle.save();

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
    const { network } = req.query as { network: string };
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const circles = await getMemberCircles(userPrivateKey, network);
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
    const { network } = req.query as { network: string };
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
        userPrivateKey,
        network
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
  addMemberToCircle,
  deleteMemberFromCircle,
  activateCircle,
  depositToCircle,
  withdrawFromCircle,
  setSavingTokenAllowed,
  getSavingMemberBalances,
  getSavingMemberCircles,
  getSavingCircle,
  getCircleDetails,
  getCirclesbyMember,
  decommissionSavingCircle,
};
