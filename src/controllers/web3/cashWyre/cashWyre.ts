import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, NotFoundError } from '../../../errors';
import CashwyreService from '../../../services/web3/Cashwyre/cashWyre';
import {
  getUserWeb3Wallet,
  getBitcoinAddress,
} from '../../../services/web3/accountService';
import {
  transferStable,
  transferBitcoin,
} from '../../../services/web3/accountService';
import { decrypt } from '../../../services/encryption';
import CashwyreTransaction, {
  CashwyreTransactionStatus,
  CashwyreTransactionType,
  ICashwyreTransaction,
} from '../../../models/web3/cashWyreTransactions';
import { tokenAddress } from '../../../utils/web3/tokenaddress';

class CashwyreController {
  /**
   * Get onramp quote
   * @route POST /api/cashwyre/onramp/quote
   */
  async getOnrampQuote(req: Request, res: Response) {
    try {
      const { amount, crypto, network } = req.body;

      if (!amount || !crypto || !network) {
        throw new BadRequestError('Amount, crypto, and network are required');
      }

      const reference = uuidv4();
      const data = await CashwyreService.getOnrampQuote(
        amount,
        crypto,
        network,
        reference
      );

      return res.status(200).json({
        success: true,
        message: 'Onramp quote fetched successfully',
        data,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get onramp quote',
      });
    }
  }

  /**
   * Confirm onramp quote
   * @route POST /api/cashwyre/onramp/confirm
   */
  async confirmOnrampQuote(req: Request, res: Response) {
    try {
      const { amount, crypto, network, reference, transactionReference } =
        req.body;
      //@ts-ignore
      const userId = req.user.userId;

      if (!reference || !transactionReference) {
        throw new BadRequestError(
          'Reference, transaction reference are required'
        );
      }
      const wallet = await getUserWeb3Wallet(userId);
      const bitcoinWallet = await getBitcoinAddress(userId);
      if (!wallet) {
        res.status(400).json({ message: 'Please activate wallet' });
        return;
      }
      if (!bitcoinWallet) {
        res.status(400).json({ message: 'Please activate Bitcoin wallet' });
      }
      let userAddress;
      if (network === 'BTC') {
        userAddress = bitcoinWallet;
      } else {
        userAddress = wallet.address;
      }

      const confirmationData: any = await CashwyreService.confirmOnrampQuote(
        reference,
        transactionReference,
        userAddress
      );

      let data;
      console.log(confirmationData.data);

      if (confirmationData) {
        data = await CashwyreService.createOnrampTransaction(
          userId,
          reference,
          transactionReference,
          amount,
          confirmationData.data.amountInCryptoAsset || 0,
          crypto,
          network,
          confirmationData.data.cryptoRate || 0,
          userAddress,
          confirmationData.data.bankName || '',
          confirmationData.data.accountName || '',
          confirmationData.data.accountNumber || '',
          confirmationData.data.bankCode || ''
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Onramp quote confirmed successfully',
        data,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to confirm onramp quote',
      });
    }
  }

  /**
   * Get offramp quote
   * @route POST /api/cashwyre/offramp/quote
   */
  async getOfframpQuote(req: Request, res: Response) {
    try {
      const { amount, crypto, network } = req.body;

      if (!amount || !crypto || !network) {
        throw new BadRequestError('Amount, crypto, and network are required');
      }

      const reference = uuidv4();
      const quoteData = await CashwyreService.getOfframpQuote(
        amount,
        crypto,
        network,
        reference
      );

      return res.status(200).json({
        success: true,
        message: 'Offramp quote fetched successfully',
        data: {
          ...quoteData,
          reference,
        },
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get offramp quote',
      });
    }
  }

  /**
   * Confirm offramp quote
   * @route POST /api/cashwyre/offramp/confirm
   */
  async confirmOfframpQuote(req: Request, res: Response) {
    try {
      const {
        reference,
        transactionReference,
        accountNumber,
        accountName,
        bankCode,
        tokenId,
        network,
      } = req.body;

      if (
        !reference ||
        !transactionReference ||
        !accountNumber ||
        !accountName ||
        !bankCode
      ) {
        throw new BadRequestError(
          'Reference, transaction reference, account number, account name,bank code are required'
        );
      }
      //@ts-ignore
      const userId = req.user.userId;

      const confirmationData: any = await CashwyreService.confirmOfframpQuote(
        reference,
        transactionReference,
        accountNumber,
        accountName,
        bankCode
      );

      let data;

      const tokenIdNum = parseInt(tokenId, 10);
      if (isNaN(tokenIdNum)) {
        res.status(400).json({ message: 'Invalid tokenId' });
        return;
      }
      const tokenAddressToSaveWith = tokenAddress(tokenIdNum, network);

      if (confirmationData) {
        data = await CashwyreService.createOfframpTransaction(
          userId,
          reference,
          transactionReference,
          confirmationData.data.amountInLocalCurrency || 0,
          confirmationData.data.amountInCryptoAsset || 0,
          confirmationData.data.cryptoAsset || '',
          confirmationData.data.cryptoAssetNetwork || '',
          confirmationData.data.cryptoRate || 0,
          confirmationData.data.bankName || '',
          confirmationData.data.accountName || '',
          confirmationData.data.accountNumber || '',
          confirmationData.data.bankCode || '',
          tokenAddressToSaveWith || 'Bitcoin Transaction',
          confirmationData.data.cryptoAssetAddress || ''
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Offramp quote confirmed successfully',
        data,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to confirm offramp quote',
      });
    }
  }

  /**
   * Get transaction status
   * @route POST /api/cashwyre/status
   */
  async getTransactionStatus(req: Request, res: Response) {
    try {
      const { transactionId } = req.body;

      if (!transactionId) {
        throw new BadRequestError(
          'Reference and transaction reference are required'
        );
      }
      const transaction: ICashwyreTransaction | null =
        await CashwyreTransaction.findById(transactionId);

      if (!transaction) {
        throw new NotFoundError('Transaction cannot be fetched');
      }

      const statusData: any = await CashwyreService.getStatus(
        transaction.reference,
        transaction.transactionReference
      );

      if (statusData) {
        let transactionStatus;

        switch (statusData.data.status.toLowerCase()) {
          case 'processing':
            transactionStatus = CashwyreTransactionStatus.PROCESSING;
            break;
          case 'success':
            transactionStatus = CashwyreTransactionStatus.SUCCESS;
            break;
          case 'failed':
            transactionStatus = CashwyreTransactionStatus.FAILED;
            break;
          default:
            transactionStatus = CashwyreTransactionStatus.NEW;
        }

        await CashwyreService.updateTransactionStatus(
          transaction.reference,
          transactionStatus
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Transaction status fetched successfully',
        data: statusData,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get transaction status',
      });
    }
  }

  async getSupportedBanks(req: Request, res: Response) {
    try {
      const timestamp = Date.now().toString().slice(-10);
      const randomDigits = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      const requestId = randomDigits + timestamp;

      const banksData = await CashwyreService.getSupportedBanks(requestId);

      return res.status(200).json({
        success: true,
        message: 'Supported banks fetched successfully',
        data: banksData,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get supported banks',
      });
    }
  }

  async verifyBankAccount(req: Request, res: Response) {
    try {
      const { accountNumber, bankCode } = req.body;

      if (!accountNumber || !bankCode) {
        throw new BadRequestError('Account number and bank code are required');
      }

      // Generate a 13-digit numeric request ID in the format similar to 2882999910292
      const timestamp = Date.now().toString().slice(-10);
      const randomDigits = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      const requestId = randomDigits + timestamp;

      const accountData = await CashwyreService.confirmBankAccount(
        requestId,
        accountNumber,
        bankCode
      );

      return res.status(200).json({
        success: true,
        message: 'Bank account verified successfully',
        data: accountData,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to verify bank account',
      });
    }
  }

  async processOfframpTransfer(req: Request, res: Response) {
    try {
      const { transactionId, network } = req.body;

      if (!transactionId) {
        throw new BadRequestError('Insert transaction ID to process offramp');
      }

      // @ts-ignore
      const userId = req.user.userId;

      const transaction: ICashwyreTransaction | null =
        await CashwyreTransaction.findById(transactionId);

      if (!transaction) {
        throw new NotFoundError('Transaction cannot be fetched');
      }

      if (transaction.transactionType !== CashwyreTransactionType.OFFRAMP) {
        throw new BadRequestError('This is not an offramp transaction');
      }
      if (transaction.offrampTokensTransferred === true) {
        throw new BadRequestError('Tokens have already been transferred');
      }

      let txHash;
      if (network === 'BTC') {
        txHash = await transferBitcoin(
          userId,
          transaction.cryptoAmount,
          transaction.offrampAddress || ''
        );
      } else {
        const wallet = await getUserWeb3Wallet(userId);
        if (!wallet) {
          return res.status(400).json({
            success: false,
            message: 'Wallet not found or not activated',
          });
        }

        const userPrivateKey = decrypt(wallet.encryptedKey);

        // Process transfer
        txHash = await transferStable(
          userPrivateKey,
          transaction.cryptoAmount.toString(),
          transaction.offrampAddress || '',
          transaction.tokenAddress || '',
          network
        );
      }

      // Get user's wallet

      await CashwyreService.updateTransactionHash(
        transaction.reference,
        txHash
      );

      // Update transaction status with Cashwyre after transfer
      const statusData: any = await CashwyreService.getStatus(
        transaction.reference,
        transaction.transactionReference
      );

      if (statusData) {
        let transactionStatus;

        switch (statusData.data.status.toLowerCase()) {
          case 'processing':
            transactionStatus = CashwyreTransactionStatus.PROCESSING;
            break;
          case 'success':
            transactionStatus = CashwyreTransactionStatus.SUCCESS;
            break;
          case 'failed':
            transactionStatus = CashwyreTransactionStatus.FAILED;
            break;
          default:
            transactionStatus = CashwyreTransactionStatus.NEW;
        }

        await CashwyreService.updateTransactionStatus(
          transaction.reference,
          transactionStatus
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Offramp transfer completed successfully',
        data: {
          txHash,
          statusData,
        },
      });
    } catch (error: any) {
      console.error('Error processing offramp transfer:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to process offramp transfer',
      });
    }
  }

  async getUserTransactions(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.userId;

      const transactions = await CashwyreService.getUserTransactions(userId);

      return res.status(200).json({
        success: true,
        message: 'Transactions fetched successfully',
        data: transactions,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get transactions',
      });
    }
  }
}

export default new CashwyreController();
