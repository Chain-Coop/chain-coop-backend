import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, NotFoundError } from '../../../errors';
import CashwyreService, {
  NetworkType,
} from '../../../services/web3/Cashwyre/cashWyre';
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
import { getUserDetails } from '../../../services/authService';
import { StatusCodes } from 'http-status-codes';
import { CashwyreConfig } from '../../../../config/Cashwyre';

interface CashwyreRates {
  success: boolean;
  message: string;
  data: {
    cryptoAssetInfo: {
      currency: string;
      symbol: string;
      rate: number;
    };
    currencyInfo: {
      currency: string;
      symbol: string;
      rate: number;
    };
  };
}

class CashwyreController {
  /**
   * Generate crypto address
   * @route POST /api/cashwyre/create-address
   */
  async generateCryptoAddress(req: Request, res: Response) {
    try {
      const { amount, assetType, network } = req.body;
      // @ts-ignore
      const userId = req.user.userId;

      if (!assetType || !network) {
        throw new BadRequestError('Asset type, and network are required');
      }
      if (!Object.values(NetworkType).includes(network)) {
        throw new BadRequestError('Invalid network type. Must be BTC_LN');
      }

      const user = await getUserDetails(userId);
      const requestId = uuidv4();

      if (network === NetworkType.BTC_LN) {
        if (!amount) {
          throw new BadRequestError(
            'Amount is required for Lightning Network addresses'
          );
        }

        // Generate new Lightning address
        const { data } = await CashwyreService.generateCryptoAddress(
          user!.firstName,
          user!.lastName,
          user!.email,
          assetType,
          network,
          amount,
          requestId
        );

        const savedAddress = await CashwyreService.createLightningAddress(
          userId,
          assetType,
          amount,
          requestId,
          data!.address,
          data!.code,
          data!.status,
          data!.customerId
        );

        return res.status(StatusCodes.OK).json({
          success: true,
          message:
            'Lightning Network address has been successfully created (valid for 1 hour)',
          data: {
            address: data!.address,
            status: data!.status,
            assetType,
            network: 'BTC_LN',
            amount,
            expiresAt: savedAddress.expiresAt,
          },
        });
      }
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to create crypto address',
      });
    }
  }

  /**
   * Get user's lightning addresses
   * @route GET /api/cashwyre/lightning-addresses
   */
  async getUserLightningAddresses(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.userId;
      const { active } = req.query;

      let addresses;
      if (active === 'true') {
        addresses = await CashwyreService.getUserActiveLightningAddresses(
          userId
        );
      } else {
        addresses = await CashwyreService.getUserAllLightningAddresses(userId);
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Lightning addresses retrieved successfully',
        data: addresses,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to retrieve lightning addresses',
      });
    }
  }

  async sendLightningPayment(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.userId;
      const { amount, lightningAddress } = req.body;
      if (!amount || !lightningAddress) {
        throw new BadRequestError('Amount and lightning address are required');
      }
      const lightningPayment = await CashwyreService.sendCryptoAsset(
        userId,
        amount,
        lightningAddress
      );
      if (!lightningPayment) {
        throw new NotFoundError('Failed to send lightning payment');
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Lightning payment sent successfully',
        data: lightningPayment,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to send lightning payment',
      });
    }
  }

  /**
   * Get onramp quote
   * @route POST /api/cashwyre/onramp/quote
   */
  async getOnrampQuote(req: Request, res: Response) {
    try {
      const { amount, crypto, network } = req.body;
      if (crypto !== 'bitcoin') {
        const rates = (await CashwyreService.getCryptoRate(
          uuidv4(),
          crypto
        )) as CashwyreRates;
        if (amount < rates.data.currencyInfo.rate * 11.5) {
          throw new BadRequestError(
            `Minimum amount for ${crypto} onramp is ${
              rates.data.currencyInfo.rate * 11.5
            }`
          );
        }
      }

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
        data: { ...data, fees: CashwyreConfig.Fees },
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
      const {
        amount,
        amountInCrypto,
        crypto,
        network,
        reference,
        transactionReference,
      } = req.body;
      //@ts-ignore
      const userId = req.user.userId;

      if (!reference || !transactionReference) {
        throw new BadRequestError(
          'Reference, transaction reference are required'
        );
      }

      let userAddress;
      if (network === 'BTC') {
        const bitcoinWallet = await getBitcoinAddress(userId);
        userAddress = bitcoinWallet;
      } else if (network === 'BTC_LN') {
        const lightningAddress = await CashwyreService.generateLightningAddress(
          amountInCrypto,
          userId
        );
        if (!lightningAddress) {
          throw new NotFoundError('Lightning address not found for user');
        }
        userAddress = lightningAddress;
      } else {
        const wallet = await getUserWeb3Wallet(userId);
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
          confirmationData.data.bankCode || '',
          CashwyreConfig.Fees
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
      let tokenAddressToSaveWith = null;
      if (network !== 'BTC_LN' && network !== 'BTC') {
        const tokenIdNum = parseInt(tokenId, 10);
        if (isNaN(tokenIdNum)) {
          res.status(400).json({ message: 'Invalid tokenId' });
          return;
        }
        tokenAddressToSaveWith = tokenAddress(tokenIdNum, network);
      }

      let data;

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

  async getCryptoRates(req: Request, res: Response) {
    try {
      const { cryptoAsset } = req.query;
      if (!cryptoAsset) {
        throw new BadRequestError('Crypto asset is required');
      }
      const reference = uuidv4();
      const ratesData = await CashwyreService.getCryptoRate(
        reference,
        cryptoAsset as string
      );
      return res.status(200).json({
        success: true,
        message: 'Crypto rates fetched successfully',
        data: ratesData,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get crypto rates',
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
      } else if (network === 'BTC_LN') {
        const lightningPayment = await CashwyreService.sendCryptoAsset(
          userId,
          transaction.cryptoAmount,
          transaction.offrampAddress || ''
        );
        txHash = lightningPayment.reference;
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
