import axios from 'axios';
import mongoose, { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CashwyreConfig } from '../../../../config/Cashwyre';
import { NotFoundError } from '../../../errors';
import CashwyreTransaction, {
  CashwyreTransactionType,
  CashwyreTransactionStatus,
  ICashwyreTransaction,
} from '../../../models/web3/cashWyreTransactions';
import {
  ILightningAddress,
  LightningAddress,
} from '../../../models/web3/cashwyre';
import { getUserDetails } from '../../authService';
import LndWallet, { ILndWallet } from '../../../models/web3/lnd/wallet';
// import GenerateCryproAddress, { IGenerateCryproAddress, NetworkType } from '../../../models/web3/cashwyre';

export enum NetworkType {
  BTC_LN = 'BTC_LN',
}

class CashwyreService {
  private axiosInstance: Axios.AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: CashwyreConfig.baseURL,
      headers: {
        Authorization: `bearer ${CashwyreConfig.secretKey}`,
      },
    });

    this.axiosInstance.interceptors.request.use((config) => {
      console.log('📤 [Request]');
      console.log('URL:', config.baseURL + config.url);
      console.log('Method:', config.method);
      console.log('Headers:', config.headers);
      console.log('Payload:', config.data);
      return config;
    });
  }

  async generateCryptoAddress(
    firstName: string,
    lastName: string,
    email: string,
    assetType: string,
    network: NetworkType,
    amount: number,
    requestId: string
  ) {
    try {
      const payload = {
        firstName,
        lastName,
        email,
        assetType,
        network,
        amount,
        businessCode: CashwyreConfig.BusinessCode,
        appId: CashwyreConfig.BusinessCode,
        requestId,
      };

      const data: any = await this.axiosInstance.post(
        '/CustomerCryptoAddress/createCryptoAddress',
        payload
      );

      if (!data) {
        throw new NotFoundError('Address was not generated');
      }

      return data?.data;
    } catch (error: any) {
      console.error(error.message);
      throw new Error(error.message);
    }
  }

  async generateLightningAddress(amount: number, userId: string) {
    try {
      const user = await getUserDetails(userId);
      const requestId = uuidv4();

      // Generate new Lightning address
      const { data } = await this.generateCryptoAddress(
        user!.firstName,
        user!.lastName,
        user!.email,
        'bitcoin',
        NetworkType.BTC_LN,
        amount,
        requestId
      );

      await this.createLightningAddress(
        userId,
        'bitcoin',
        amount,
        requestId,
        data!.address,
        data!.code,
        data!.status,
        data!.customerId
      );

      return data!.address;
    } catch (error: any) {
      console.error('Error generating Lightning address:', error.message);
      throw new Error('Failed to generate Lightning address');
    }
  }

  // Create Lightning address
  async createLightningAddress(
    userId: string,
    assetType: string,
    amount: number,
    requestId: string,
    address: string,
    code: string,
    status: string,
    customerId?: string
  ): Promise<ILightningAddress> {
    const wallet = await LndWallet.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!wallet) {
      const newWallet = new LndWallet({
        userId: new mongoose.Types.ObjectId(userId),
        balance: 0,
        lockedBalance: 0,
        lock: {
          amount: 0,
          maturityDate: new Date(),
          purpose: '',
          lockedAt: new Date(),
          lockId: '',
        },
      });
      await newWallet.save();
    }
    const lightningAddress = new LightningAddress({
      userId: new mongoose.Types.ObjectId(userId),
      assetType,
      amount,
      requestId,
      address,
      code,
      status,
      customerId,
    });

    return await lightningAddress.save();
  }

  // Get user's active lightning addresses
  async getUserActiveLightningAddresses(
    userId: string
  ): Promise<ILightningAddress[]> {
    return await LightningAddress.find({
      userId: new mongoose.Types.ObjectId(userId),
      expiresAt: { $gt: new Date() },
      status: 'active',
    }).sort({ createdAt: -1 });
  }

  // Get all user's lightning addresses (including expired)
  async getUserAllLightningAddresses(
    userId: string
  ): Promise<ILightningAddress[]> {
    return await LightningAddress.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });
  }

  async updateLightningBalance(address: string, amount: number) {
    try {
      const lightning = await LightningAddress.findOne({ address: address });

      if (!lightning) {
        throw new Error('Lightning details not found!');
      }

      lightning!.balance += amount;
      await lightning.save();

      return lightning;
    } catch (error) {
      console.error('Failed to update Lightning balance:', error);
      throw new Error('Failed to update Lightning wallet balance');
    }
  }

  async getOnrampQuote(
    amount: number,
    crypto: string,
    network: string,
    reference: string
  ) {
    try {
      const data: any = await this.axiosInstance.post(
        '/onrampofframp/getOnrampQuote',
        {
          AmountInLocalCurrency: amount,
          Currency: 'NGN',
          Country: 'NG',
          CryptoAsset: crypto,
          CryptoAssetNetwork: network,
          Reference: reference,
          BusinessCode: CashwyreConfig.BusinessCode,
          AppId: CashwyreConfig.AppId,
          FeeType: 'sender',
          RequestId: reference,
        }
      );
      if (!data) {
        throw new NotFoundError('Quote was not fetched');
      }
      return data?.data;
    } catch (error: any) {
      console.error(error.message);
      throw new Error(error.message);
    }
  }

  async confirmOnrampQuote(
    reference: string,
    transactionReference: string,
    cryptoAddress: string
  ) {
    try {
      const data = await this.axiosInstance.post(
        '/OnrampOfframp/confirmOnrampQuote',
        {
          appId: CashwyreConfig.AppId,
          requestId: reference,
          transactionReference,
          cryptoAddress,
        }
      );
      if (!data) {
        throw new NotFoundError('Quote not Confirmed');
      }
      return data.data;
    } catch (error: any) {
      console.error(error.message);
      throw new Error(error.message);
    }
  }

  async getOfframpQuote(
    amount: number,
    crypto: string,
    network: string,
    reference: string
  ) {
    try {
      const data: any = await this.axiosInstance.post(
        '/onrampofframp/getOfframpQuote',
        {
          AmountInCryptoAsset: amount,
          Currency: 'NGN',
          Country: 'NG',
          CryptoAsset: crypto,
          CryptoAssetNetwork: network,
          Reference: reference,
          BusinessCode: CashwyreConfig.BusinessCode,
          AppId: CashwyreConfig.AppId,
          RequestId: reference,
        }
      );
      if (!data) {
        throw new NotFoundError('Quote was not fetched');
      }
      return data?.data;
    } catch (error: any) {
      console.error(error.message);
      throw new Error(error.message);
    }
  }

  async confirmOfframpQuote(
    reference: string,
    transactionReference: string,
    accountNumber: string,
    accountName: string,
    bankCode: string
  ) {
    try {
      const data = await this.axiosInstance.post(
        '/OnrampOfframp/confirmOfframpQuote',
        {
          appId: CashwyreConfig.AppId,
          requestId: reference,
          transactionReference,
          accountNumber,
          accountName,
          bankCode,
        }
      );
      if (!data) {
        throw new NotFoundError('Quote not Confirmed');
      }
      return data.data;
    } catch (error: any) {
      console.error(error.message);
      throw new Error(error.message);
    }
  }

  async getSupportedBanks(requestId: string) {
    try {
      const data = await this.axiosInstance.post(
        '/CountryBank/getCountryBanks',
        {
          appId: CashwyreConfig.AppId,
          requestId,
          country: 'NG',
          businessCode: CashwyreConfig.BusinessCode,
          accountType: 'bank',
        }
      );
      if (!data) {
        throw new NotFoundError('Bank list was not gotten');
      }
      return data.data;
    } catch (error: any) {
      console.error(error.message);
      throw new Error(error.message);
    }
  }

  async confirmBankAccount(
    requestId: string,
    accountNumber: string,
    bankCode: string
  ) {
    try {
      const data = await this.axiosInstance.post('/Account/accountLookup', {
        appId: CashwyreConfig.AppId,
        requestId,
        accountNumber,
        bankCode,
        businessCode: CashwyreConfig.BusinessCode,
        country: 'NG',
      });
      if (!data) {
        throw new NotFoundError("Account wasn't confirmed");
      }
      return data.data;
    } catch (error: any) {
      console.error(error.message);
      throw new Error(error.message);
    }
  }

  async getStatus(reference: string, transactionReference: string) {
    try {
      const data = await this.axiosInstance.post('/onrampofframp/getStatus', {
        appId: CashwyreConfig.AppId,
        requestId: reference,
        transactionReference,
      });
      return data.data;
    } catch (error: any) {
      console.error(error.message);
      throw new Error(error.message);
    }
  }

  async createOnrampTransaction(
    userId: string,
    reference: string,
    transactionReference: string,
    amount: number,
    cryptoAmount: number,
    cryptoAsset: string,
    cryptoAssetNetwork: string,
    cryptoRate: number,
    userAddress: string,
    bankName: string,
    accountName: string,
    accountNumber: string,
    bankCode: string
  ): Promise<ICashwyreTransaction> {
    const transaction = new CashwyreTransaction({
      userId: new mongoose.Types.ObjectId(userId),
      transactionType: CashwyreTransactionType.ONRAMP,
      status: CashwyreTransactionStatus.NEW,
      reference,
      transactionReference,
      amount,
      cryptoAmount,
      cryptoAsset,
      cryptoAssetNetwork,
      cryptoRate,
      userAddress,
      bankName,
      accountName,
      accountNumber,
      bankCode,
    });

    return await transaction.save();
  }

  /**
   * Create a new offramp transaction record
   */
  async createOfframpTransaction(
    userId: string,
    reference: string,
    transactionReference: string,
    amount: number,
    cryptoAmount: number,
    cryptoAsset: string,
    cryptoAssetNetwork: string,
    cryptoRate: number,
    bankName: string,
    accountName: string,
    accountNumber: string,
    bankCode: string,
    tokenAddress: string,
    offrampAddress: string
  ): Promise<ICashwyreTransaction> {
    const transaction = new CashwyreTransaction({
      userId: new mongoose.Types.ObjectId(userId),
      transactionType: CashwyreTransactionType.OFFRAMP,
      status: CashwyreTransactionStatus.NEW,
      reference,
      transactionReference,
      amount,
      cryptoAmount,
      cryptoAsset,
      cryptoAssetNetwork,
      cryptoRate,
      bankName,
      accountName,
      accountNumber,
      bankCode,
      tokenAddress,
      offrampAddress,
    });

    return await transaction.save();
  }

  /**
   * Update transaction with blockchain transaction hash
   */
  async updateTransactionHash(
    reference: string,
    txHash: string
  ): Promise<ICashwyreTransaction> {
    const transaction = await CashwyreTransaction.findOneAndUpdate(
      { reference },
      { txHash, offrampTokensTransferred: true },
      { new: true }
    );

    if (!transaction) {
      throw new NotFoundError(
        `Transaction with reference ${reference} not found`
      );
    }

    return transaction;
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    reference: string,
    status: CashwyreTransactionStatus
  ): Promise<ICashwyreTransaction> {
    const transaction = await CashwyreTransaction.updateTransactionStatus(
      reference,
      status
    );

    if (!transaction) {
      throw new NotFoundError(
        `Transaction with reference ${reference} not found`
      );
    }

    return transaction;
  }

  /**
   * Get transaction by reference
   */
  async getTransactionByReference(
    reference: string
  ): Promise<ICashwyreTransaction> {
    const transaction = await CashwyreTransaction.findByReference(reference);

    if (!transaction) {
      throw new NotFoundError(
        `Transaction with reference ${reference} not found`
      );
    }

    return transaction;
  }

  /**
   * Get transaction by transaction reference
   */
  async getTransactionByTransactionReference(
    transactionReference: string
  ): Promise<ICashwyreTransaction> {
    const transaction = await CashwyreTransaction.findByTransactionReference(
      transactionReference
    );

    if (!transaction) {
      throw new NotFoundError(
        `Transaction with transaction reference ${transactionReference} not found`
      );
    }

    return transaction;
  }

  /**
   * Get user's transactions
   */
  async getUserTransactions(userId: string): Promise<ICashwyreTransaction[]> {
    return await CashwyreTransaction.findByUserId(
      new mongoose.Types.ObjectId(userId)
    );
  }

  /**
   * Get user's transactions by type
   */
  async getUserTransactionsByType(
    userId: string,
    type: CashwyreTransactionType
  ): Promise<ICashwyreTransaction[]> {
    return await CashwyreTransaction.find({
      userId: new mongoose.Types.ObjectId(userId),
      transactionType: type,
    }).sort({ createdAt: -1 });
  }

  /**
   * Get user's transactions by status
   */
  async getUserTransactionsByStatus(
    userId: string,
    status: CashwyreTransactionStatus
  ): Promise<ICashwyreTransaction[]> {
    return await CashwyreTransaction.find({
      userId: new mongoose.Types.ObjectId(userId),
      status,
    }).sort({ createdAt: -1 });
  }

  async sendCryptoAsset(
    userId: string,
    amount: number,
    address: string
  ): Promise<any> {
    try {
      const user = await getUserDetails(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const requestId = uuidv4();
      const payload = {
        amountInCryptoAsset: amount,
        description:
          'Sending Bitcoin on Lightning network from Chain Coop Wallet',
        assetType: 'bitcoin',
        network: NetworkType.BTC_LN,
        businessCode: CashwyreConfig.BusinessCode,
        appId: CashwyreConfig.AppId,
        requestId,
        address,
      };

      const data: any = await this.axiosInstance.post(
        '/sendCryptoAsset/sendCryptoAsset',
        payload
      );

      if (data.success === false) {
        throw new NotFoundError('Crypto asset was not sent');
      }

      return data.data;
    } catch (error: any) {
      console.error(error.message);
      throw new Error(error.message);
    }
  }
}
const CashwyreServices = new CashwyreService();
export default CashwyreServices;
