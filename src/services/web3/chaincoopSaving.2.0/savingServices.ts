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
    const approveTx = await signPermit(
      tokenAddressToSaveWith,
      process.env.RELAYER_PRIVATE_KEY!,
      userPrivateKey,
      initialSaveAmount,
      network
    );
    if (!approveTx) {
      throw Error('Failed to approve transfer');
    }
    const con_tract = await chainCoopSavingcontract(network);
    const data = con_tract.interface.encodeFunctionData('openSavingPool', [
      tokenAddressToSaveWith,
      parseUnits(initialSaveAmount, 6),
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
    const approveTx = await signPermit(
      tokenAddressToSaveWith,
      process.env.RELAYER_PRIVATE_KEY!,
      userPrivateKey,
      amount,
      network
    );
    if (!approveTx) {
      throw Error('Failed to approve transfer');
    }
    const con_tract = await chainCoopSavingcontract(network);
    const data = con_tract.interface.encodeFunctionData('updateSaving', [
      poolId_bytes,
      parseUnits(amount, 6),
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
    const data = con_tract.interface.encodeFunctionData('stopSaving', [
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
      amount: Number(formatUnits(contribution.amount.toString(), 6)), // Fixed: Convert to number
    }))
  );
  return formatedContributions;
};

interface SavingPool {
  saver: string;
  tokenToSaveWith: string;
  Reason: string;
  poolIndex: string;
  startDate: string; // bytes32 can be converted to a string
  locktype: number; // Convert BigInt to string for JSON compatibility
  Duration: string; // Convert BigInt to string
  amountSaved: string; // Convert BigInt to string
  isGoalAccomplished: boolean;
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

    // Map rawUserPools to a serializable format
    const formattedPools: SavingPool[] = await Promise.all(
      rawPools.map(async (pool: any) => ({
        saver: pool[0],
        tokenToSaveWith: pool[1],
        symbol: await getTokenAddressSymbol(pool[1], network),
        Reason: pool[2],
        poolIndex: pool[3],
        startDate: pool[4].toString(),
        locktype: Number(pool[7]), // Fixed: Convert to number
        Duration: pool[5].toString(),
        amountSaved: formatUnits(pool[6].toString(), 6),
        isGoalAccomplished: pool[8],
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
    const rawUserPools = await con_tract.poolSavingPool(poolId);
    const rawPools = JSON.parse(
      JSON.stringify(rawUserPools, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    
    // Map rawUserPools to a serializable format
    const formattedPool: SavingPool = {
      saver: rawPools[0],
      tokenToSaveWith: rawPools[1],
      Reason: rawPools[2],
      poolIndex: rawPools[3],
      startDate: rawPools[4].toString(),
      locktype: Number(rawPools[7]), // Fixed: Convert to number
      Duration: rawPools[5].toString(),
      amountSaved: formatUnits(rawPools[6].toString(), 6),
      isGoalAccomplished: rawPools[8],
      symbol: await getTokenAddressSymbol(rawPools[1], network),
    };
    return formattedPool;
  } catch (error) {
    console.error('Error fetching user pools:', error);
    throw new Error('Failed to fetch user pools');
  }
};

export {
  userPools,
  userPoolsByPoolId,
  totalPoolCreated,
  withdrawFromPool,
  updatePoolAmount,
  openPool,
  restartSaving,
  stopSaving,
  getUserContributions,
};