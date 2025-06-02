import asyncHandler from 'express-async-handler';
import {
  addSupportedTokenAddress,
  flagRemoveTokens,
  transferOwnership,
  setAddressForFeeCollection,
} from '../../../services/web3/chaincoopSaving.2.0/managementService';
import { Request, Response } from 'express';
import { getUserWeb3Wallet } from '../../../services/web3/accountService';

import { decrypt } from '../../../services/encryption';

const allowStableTokenAddressfForSaving = asyncHandler(
  async (req: Request, res: Response) => {
    const { stableTokenAddress, network } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!stableTokenAddress) {
        res.status(400).json({ message: 'stableTokenAddress missing in body' });
        return;
      }
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const tx = await addSupportedTokenAddress(
        stableTokenAddress,
        userPrivateKey,
        network
      );
      if (!tx) {
        res.status(400).json({ message: 'Failed to add token' });
        return;
      }
      res.status(200).json({ message: 'Success', data: tx.hash });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);

const unlistStableTokenAddressfForSaving = asyncHandler(
  async (req: Request, res: Response) => {
    const { stableTokenAddress, network } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!stableTokenAddress) {
        res.status(400).json({ message: 'stableTokenAddress missing in body' });
        return;
      }
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const tx = await flagRemoveTokens(
        stableTokenAddress,
        userPrivateKey,
        network
      );
      if (!tx) {
        res.status(400).json({ message: 'Failed to remove token' });
        return;
      }
      res.status(200).json({ message: 'Success', data: tx.hash });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);

const changeSavingContractOwnership = asyncHandler(
  async (req: Request, res: Response) => {
    const { newAdminAddress, network } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!newAdminAddress) {
        res.status(400).json({ message: 'newAdminAddress missing in body' });
        return;
      }
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const tx = await transferOwnership(
        newAdminAddress,
        userPrivateKey,
        network
      );
      if (!tx) {
        res.status(400).json({ message: 'Failed to change owner' });
        return;
      }
      res.status(200).json({ message: 'Success', data: tx.hash });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);

const setFeeCollectionAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const { feeCollectionAddress, network } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!feeCollectionAddress) {
        res
          .status(400)
          .json({ message: 'feeCollectionAddress missing in body' });
        return;
      }
      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const tx = await setAddressForFeeCollection(
        feeCollectionAddress,
        userPrivateKey,
        network
      );
      if (!tx) {
        res.status(400).json({ message: 'Failed to set address' });
        return;
      }
      res.status(200).json({ message: 'Success', data: tx.hash });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);

export {
  setFeeCollectionAddress,
  changeSavingContractOwnership,
  unlistStableTokenAddressfForSaving,
  allowStableTokenAddressfForSaving,
};
