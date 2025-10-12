import {
  ethers,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
} from 'ethers';
import { approveTokenTransfer } from '../accountService';
import { getTokenAddressSymbol } from '../accountService';
import {
  chainCoopSavingcontract,
  contract,
  signPermit,
} from '../../../utils/web3/contract.2.0';
import {
  signMetaTransaction,
  executeMetaTransaction,
} from '../MetaTransaction/metaTransaction';

//NB DURATION IS IN SECONDS
//lisk, usdc
//openSavingPool(address _tokenTosaveWith,uint256 _savedAmount,string calldata _reason,LockingType _locktype,uint256 _duration)
const openPool = async (
  tokenAddressToSaveWith: string,
  initialSaveAmount: string,
  reasonForSaving: string,
  lockType: number,
  duration: number,
  userPrivateKey: string,
  network: string
) => {
  try {
    const approveTx = await approveTokenTransfer(
      tokenAddressToSaveWith,
      initialSaveAmount,
      userPrivateKey,
      network
    );
    if (!approveTx) {
      throw Error('Failed to approve transfer');
    }
    const tokenContract = await contract(tokenAddressToSaveWith, network);
    const con_tract = await chainCoopSavingcontract(network);
    const data = con_tract.interface.encodeFunctionData('openSavingPool', [
      tokenAddressToSaveWith,
      parseUnits(initialSaveAmount, await tokenContract.decimals()),
      reasonForSaving,
      lockType,
      duration,
    ]);
    const { forwardRequest, signature } = await signMetaTransaction(
      userPrivateKey,
      network,
      data
    );
    const tx = await executeMetaTransaction(forwardRequest, signature, network);
    await tx.wait(1);
    console.log('Saving Pool Created', tx);
    return tx;
  } catch (error) {
    console.log(`Error Opening a saving pool`, error);
    throw Error('Something went wrong please retry');
  }
};

const updatePoolAmount = async (
  poolId_bytes: string,
  amount: string,
  tokenAddressToSaveWith: string,
  userPrivateKey: string,
  network: string
) => {
  try {
    const approveTx = await approveTokenTransfer(
      tokenAddressToSaveWith,
      amount,
      userPrivateKey,
      network
    );
    if (!approveTx) {
      throw Error('Failed to approve transfer');
    }
    const tokenContract = await contract(tokenAddressToSaveWith, network);
    const con_tract = await chainCoopSavingcontract(network);
    const data = con_tract.interface.encodeFunctionData('updateSaving', [
      poolId_bytes,
      parseUnits(amount, await tokenContract.decimals()),
    ]);
    const { forwardRequest, signature } = await signMetaTransaction(
      userPrivateKey,
      network,
      data
    );
    const tx = await executeMetaTransaction(forwardRequest, signature, network);
    await tx.wait(1);
    return tx;
  } catch (error) {
    console.log(error);
    throw Error('Something went wrong please retry');
  }
};

const withdrawFromPool = async (
  poolId_bytes: string,
  userPrivateKey: string,
  network: string
) => {
  try {
    const con_tract = await chainCoopSavingcontract(network);
    const data = con_tract.interface.encodeFunctionData('withdraw', [
      poolId_bytes,
    ]);
    const { forwardRequest, signature } = await signMetaTransaction(
      userPrivateKey,
      network,
      data
    );
    const tx = await executeMetaTransaction(forwardRequest, signature, network);
    await tx.wait(1);
    return tx;
  } catch (error) {
    console.log('Error withdrawing from pool:', error);
    throw Error('Something went wrong please retry');
  }
};

//stopSaving - Updated to use meta transaction
const stopSaving = async (
  poolId: string,
  userPrivateKey: string,
  network: string
) => {
  try {
    const con_tract = await chainCoopSavingcontract(network);
    const data = con_tract.interface.encodeFunctionData('stopSaving', [poolId]);
    const { forwardRequest, signature } = await signMetaTransaction(
      userPrivateKey,
      network,
      data
    );
    const tx = await executeMetaTransaction(forwardRequest, signature, network);
    await tx.wait(1);
    return tx;
  } catch (error: any) {
    console.log('Error stopping saving:', error);
    throw Error(error.message ? error.message : 'Failed to stop Saving!');
  }
};

//restartSaving - Updated to use meta transaction
const restartSaving = async (
  poolId: string,
  userPrivateKey: string,
  network: string
) => {
  try {
    const con_tract = await chainCoopSavingcontract(network);
    const data = con_tract.interface.encodeFunctionData('restartSaving', [
      poolId,
    ]);
    const { forwardRequest, signature } = await signMetaTransaction(
      userPrivateKey,
      network,
      data
    );
    const tx = await executeMetaTransaction(forwardRequest, signature, network);
    await tx.wait(1);
    return tx;
  } catch (error: any) {
    console.log('Error restarting saving:', error);
    throw Error(error.message ? error.message : 'Failed to restart Saving!');
  }
};

const enableAaveForPool = async (
  poolId: string,
  userPrivateKey: string,
  network: string
) => {
  try {
    const con_tract = await chainCoopSavingcontract(network);
    const data = con_tract.interface.encodeFunctionData('enableAaveForPool', [
      poolId,
    ]);
    const { forwardRequest, signature } = await signMetaTransaction(
      userPrivateKey,
      network,
      data
    );
    const tx = await executeMetaTransaction(forwardRequest, signature, network);
    await tx.wait(1);
    console.log('Aave enabled for pool:', poolId);
    return tx;
  } catch (error: any) {
    console.log('Error enabling Aave for pool:', error);
    throw Error(error.message ? error.message : 'Failed to enable Aave!');
  }
};

//Views Functions
const totalPoolCreated = async (network: string): Promise<number> => {
  const con_tract = await chainCoopSavingcontract(network);
  const pools = await con_tract.getSavingPoolCount();
  return Number(pools);
};

//getUserContributions
interface Contributions {
  tokenAddress: string;
  amount: number;
  aaveBalance: number; // New field for Aave balance
}

const getUserContributions = async (
  userAddress: string,
  network: string
): Promise<Contributions[]> => {
  const con_tract = await chainCoopSavingcontract(network);
  const contributions = await con_tract.getUserContributions(userAddress);

  const formatedContributions: Contributions[] = await Promise.all(
    contributions.map(async (contribution: any) => ({
      tokenAddress: contribution.tokenAddress,
      amount: Number(formatUnits(contribution.amount.toString(), 6)),
      aaveBalance: Number(formatUnits(contribution.aaveBalance.toString(), 6)), // New field
    }))
  );
  return formatedContributions;
};

interface SavingPool {
  saver: string;
  tokenToSaveWith: string;
  Reason: string;
  poolIndex: string;
  startDate: string;
  locktype: number;
  Duration: string;
  amountSaved: string;
  aaveDepositAmount: string; // New field for Aave deposit amount
  isGoalAccomplished: boolean;
  isStoped: boolean;
  aaveEnabled: boolean; // New field for Aave status
  symbol: string; // not part of the returned map
}

const userPools = async (
  userAddress: string,
  network: string
): Promise<SavingPool[]> => {
  try {
    const con_tract = await chainCoopSavingcontract(network);
    const rawUserPools = await con_tract.getSavingPoolBySaver(userAddress);
    const rawPools = JSON.parse(
      JSON.stringify(rawUserPools, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    // Map rawUserPools to a serializable format with updated structure
    const formattedPools: SavingPool[] = await Promise.all(
      rawPools.map(async (pool: any) => ({
        saver: pool[0],
        tokenToSaveWith: pool[1],
        symbol: await getTokenAddressSymbol(pool[1], network),
        Reason: pool[2],
        poolIndex: pool[3],
        startDate: pool[4].toString(),
        Duration: pool[5].toString(),
        amountSaved: formatUnits(
          pool[6].toString(),
          network === 'BSC' ? 18 : 6
        ),
        aaveDepositAmount: formatUnits(
          pool[7].toString(),
          network === 'BSC' ? 18 : 6
        ), // New field
        locktype: Number(pool[8]),
        isGoalAccomplished: pool[9],
        isStoped: pool[10],
        aaveEnabled: pool[11], // New field
      }))
    );

    return formattedPools;
  } catch (error) {
    console.error('Error fetching user pools:', error);
    throw new Error('Failed to fetch user pools');
  }
};

const userPoolsByPoolId = async (
  poolId: string,
  network: string
): Promise<SavingPool> => {
  try {
    const con_tract = await chainCoopSavingcontract(network);
    const rawUserPools = await con_tract.getSavingPoolByIndex(poolId);
    const rawPools = JSON.parse(
      JSON.stringify(rawUserPools, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    // Map rawUserPools to a serializable format with updated structure
    const formattedPool: SavingPool = {
      saver: rawPools[0],
      tokenToSaveWith: rawPools[1],
      Reason: rawPools[2],
      poolIndex: rawPools[3],
      startDate: rawPools[4].toString(),
      Duration: rawPools[5].toString(),
      amountSaved: formatUnits(
        rawPools[6].toString(),
        network === 'BSC' ? 18 : 6
      ),
      aaveDepositAmount: formatUnits(
        rawPools[7].toString(),
        network === 'BSC' ? 18 : 6
      ), // New field
      locktype: Number(rawPools[8]),
      isGoalAccomplished: rawPools[9],
      isStoped: rawPools[10],
      aaveEnabled: rawPools[11], // New field
      symbol: await getTokenAddressSymbol(rawPools[1], network),
    };
    return formattedPool;
  } catch (error) {
    console.error('Error fetching user pools:', error);
    throw new Error('Failed to fetch user pools');
  }
};

const getPoolAaveBalance = async (
  poolId: string,
  network: string
): Promise<string> => {
  try {
    const con_tract = await chainCoopSavingcontract(network);
    const aaveBalance = await con_tract.getPoolAaveBalance(poolId);
    return formatUnits(aaveBalance.toString(), network === 'BSC' ? 18 : 6);
  } catch (error) {
    console.error('Error fetching pool Aave balance:', error);
    throw new Error('Failed to fetch pool Aave balance');
  }
};

const getPoolYield = async (
  poolId: string,
  network: string
): Promise<string> => {
  try {
    const con_tract = await chainCoopSavingcontract(network);
    const yield_ = await con_tract.getPoolYield(poolId);
    return formatUnits(yield_.toString(), network === 'BSC' ? 18 : 6);
  } catch (error) {
    console.error('Error fetching pool yield:', error);
    throw new Error('Failed to fetch pool yield');
  }
};
const isAaveConfigured = async (
  tokenAddress: string,
  network: string
): Promise<boolean> => {
  try {
    const con_tract = await chainCoopSavingcontract(network);
    return await con_tract.isAaveConfigured(tokenAddress);
  } catch (error) {
    console.error('Error checking Aave configuration:', error);
    throw new Error('Failed to check Aave configuration');
  }
};

export {
  userPools,
  enableAaveForPool,
  getPoolAaveBalance,
  getPoolYield,
  isAaveConfigured,
  userPoolsByPoolId,
  totalPoolCreated,
  withdrawFromPool,
  updatePoolAmount,
  openPool,
  restartSaving,
  stopSaving,
  getUserContributions,
};