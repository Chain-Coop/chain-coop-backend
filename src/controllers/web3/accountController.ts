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
} from '../../services/web3/accountService';

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

export { activateWeb3Wallet, activateBitcoinWallet, userDetails };
