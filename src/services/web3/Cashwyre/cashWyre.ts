import axios from 'axios';
import mongoose from 'mongoose';
import { CashwyreConfig } from '../../../../config/Cashwyre';
import { NotFoundError } from '../../../errors';
import CashwyreTransaction, {
  CashwyreTransactionType,
  CashwyreTransactionStatus,
  ICashwyreTransaction,
} from '../../../models/web3/cashWyreTransactions';

class CashwyreService {
  private axiosInstance: Axios.AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: CashwyreConfig.baseURL,
      headers: {
        Authorization: `bearer ${CashwyreConfig.secretKey}`,
      },
    });

    // this.axiosInstance.interceptors.request.use((config) => {
    //   console.log('📤 [Request]');
    //   console.log('URL:', config.baseURL + config.url);
    //   console.log('Method:', config.method);
    //   console.log('Headers:', config.headers);
    //   console.log('Payload:', config.data);
    //   return config;
    // });
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
}
const CashwyreServices = new CashwyreService();
export default CashwyreServices;
