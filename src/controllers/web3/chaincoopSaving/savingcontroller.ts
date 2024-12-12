import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { getUserWeb3Wallet } from "../../../services/web3/accountService";
import { decrypt } from "../../../utils/web3/encryptordecrypt";
import {
  openPool,
  userPools,
  totalPoolCreated,
  withdrawFromPool,
  updatePoolAmount,
} from "../../../services/web3/chaincoopSaving./savingServices";
import { tokenAddress } from "../../../utils/web3/tokenaddress";

const openSavingPool = asyncHandler(async (req: Request, res: Response) => {
  const { tokenId, initialSaveAmount, goalAmount, reasonForSaving, duration } =
    req.body; //1 is for usdc , 2 for Lisk Token  -> duration is in seconds
  //@ts-ignore
  const userId = req.user.userId;
  try {
    if (!initialSaveAmount || !goalAmount || !reasonForSaving || !duration) {
      res
        .status(400)
        .json({
          message:
            "Provide all required values initialSaveAmount,goalAmount,reasonForSaving,duration",
        });
      return;
    }
    const tokenIdNum = parseInt(tokenId, 10);
    if (isNaN(tokenIdNum)) {
      res.status(400).json({ message: "Invalid tokenId" });
      return;
    }
    const tokenAddressToSaveWith = tokenAddress(tokenIdNum);
    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: "Please activate wallet" });
      return;
    }
    const userPrivateKey = decrypt(wallet.encryptedKey);
    const tx = await openPool(
      tokenAddressToSaveWith,
      initialSaveAmount,
      goalAmount,
      reasonForSaving,
      duration,
      userPrivateKey
    );
    if (!tx) {
      res.status(400).json({ message: "Failed to open a pool" });
      return;
    }
    res.status(200).json({ message: "Success", data: tx.hash });
    return;
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: `internal server error${error.message}` });
  }
});

const updatePoolWithAmount = asyncHandler(
  async (req: Request, res: Response) => {
    const { poolId_bytes, tokenAddressToSaveWith, amount } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!poolId_bytes || !tokenAddressToSaveWith || !amount) {
        res
          .status(400)
          .json({
            message:
              "Provide all required values poolId_bytes,tokenAddressToSaveWith,amount",
          });
        return;
      }

      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: "Please activate wallet" });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const tx = await updatePoolAmount(
        poolId_bytes,
        amount,
        tokenAddressToSaveWith,
        userPrivateKey
      );
      if (!tx) {
        res
          .status(400)
          .json({ message: `Failed to update a pool ${poolId_bytes}` });
        return;
      }
      res.status(200).json({ message: "Success", data: tx.hash });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);

const withdrawFromPoolByID = asyncHandler(
  async (req: Request, res: Response) => {
    const { poolId_bytes } = req.body;
    //@ts-ignore
    const userId = req.user.userId;
    try {
      if (!poolId_bytes) {
        res
          .status(400)
          .json({ message: "Provide all required values poolId_bytes" });
        return;
      }

      const wallet = await getUserWeb3Wallet(userId);
      if (!wallet) {
        res.status(400).json({ message: "Please activate wallet" });
        return;
      }
      const userPrivateKey = decrypt(wallet.encryptedKey);
      const tx = await withdrawFromPool(poolId_bytes, userPrivateKey);
      if (!tx) {
        res
          .status(400)
          .json({ message: `Failed to withdraw a pool ${poolId_bytes}` });
        return;
      }
      res.status(200).json({ message: "Success", data: tx.hash });
      return;
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({ message: `internal server error${error.message}` });
    }
  }
);

const allUserPools = asyncHandler(async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.user.userId;
  try {
    const wallet = await getUserWeb3Wallet(userId);
    if (!wallet) {
      res.status(400).json({ message: "Please activate wallet" });
      return;
    }

    const pools = await userPools(wallet.address);

    res.status(200).json({ message: "Success", data: pools });
    return;
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: `internal server error${error.message}` });
  }
});

const totalNumberPoolCreated = asyncHandler(
  async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user.userId;
    try {
      const totalpools = await totalPoolCreated();

      res.status(200).json({ message: "Success", data: totalpools });
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
  totalNumberPoolCreated,
  withdrawFromPoolByID,
  updatePoolWithAmount,
  allUserPools,
  openSavingPool,
};
