import { ethers, formatEther, formatUnits, parseEther, parseUnits } from 'ethers';
import { approveTokenTransfer } from '../accountService';
import {
  CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2,
  CHAINCOOPSAVINGCONTRACT_ETHERLINK_TESTNET,
} from '../../../constant/contract/ChainCoopSaving';
import { getTokenAddressSymbol } from '../accountService';
import {
  signPermit,
  submitPermitAndTransfer,
  chainCoopSavingcontract,
} from '../../../utils/web3/contract.2.0';

//NB DURATION IS IN SECONDS
//lisk, usdc
//openSavingPool(address _tokenTosaveWith,uint256 _savedAmount,string calldata _reason,LockingType _locktype,uint256 _duration)
const openPool = async (
  tokenAddressToSaveWith: string,
  initialSaveAmount: string,
  reasonForSaving: string,
  lockType: number,
  duration: number,
  userPrivateKey: string
) => {
  try {
    const approveTx = await approveTokenTransfer(
      tokenAddressToSaveWith,
      CHAINCOOPSAVINGCONTRACT_ETHERLINK_TESTNET,
      initialSaveAmount,
      userPrivateKey
    );
    if (!approveTx) {
      throw Error('Failed to approve transfer');
    }
    const con_tract = await chainCoopSavingcontract(userPrivateKey);
    const tx = await con_tract.openSavingPool(
      tokenAddressToSaveWith,
      parseUnits(initialSaveAmount,6),
      reasonForSaving,
      lockType,
      duration
    );
    await tx.wait();
    return tx;
  } catch (error) {
    console.log(`Error Opening a saving pool`, error);
    throw Error('Something went wrong please retry');
  }
};
//updateSaving(bytes32 _poolId,uint256 _amount)

const updatePoolAmount = async (
  poolId_bytes: string,
  amount: string,
  tokenAddressToSaveWith: string,
  userPrivateKey: string
) => {
  try {
    const approveTx = await approveTokenTransfer(
      tokenAddressToSaveWith,
      CHAINCOOPSAVINGCONTRACT_ETHERLINK_TESTNET,
      amount,
      userPrivateKey
    );
    if (!approveTx) {
      throw Error('Failed to approve transfer');
    }
    const con_tract = await chainCoopSavingcontract(userPrivateKey);
    const tx = await con_tract.updateSaving(poolId_bytes, parseUnits(amount,6));
    await tx.wait();
    return tx;
  } catch (error) {
    console.log(error);
    throw Error('Something went wrong please retry');
  }
};
const withdrawFromPool = async (
  poolId_bytes: string,
  userPrivateKey: string
) => {
  const con_tract = await chainCoopSavingcontract(userPrivateKey);
  const tx = await con_tract.withdraw(poolId_bytes);
  await tx.wait();
  return tx;
};
//stopSaving
const stopSaving = async (poolId: string, userPrivateKey: string) => {
  try {
    const con_tract = await chainCoopSavingcontract(userPrivateKey);
    const tx = await con_tract.stopSaving(poolId);
    await tx.wait();
    return tx;
  } catch (error: any) {
    console.log(error);
    throw Error(error.message ? error.message : 'Failed to stop Saving!');
  }
};
//restartSaving
const restartSaving = async (poolId: string, userPrivateKey: string) => {
  try {
    const con_tract = await chainCoopSavingcontract(userPrivateKey);
    const tx = await con_tract.restartSaving(poolId);
    await tx.wait();
    return tx;
  } catch (error: any) {
    console.log(error);
    throw Error(error.message ? error.message : 'Failed to restart Saving!');
  }
};

//Views Functions
const totalPoolCreated = async (): Promise<number> => {
  const con_tract = await chainCoopSavingcontract();
  const pools = await con_tract.getSavingPoolCount();
  return Number(pools);
};
//getUserContributions
interface Contributions {
  tokenAddress: string;
  amount: number;
}
const getUserContributions = async (
  userAddress: string
): Promise<Contributions[]> => {
  const con_tract = await chainCoopSavingcontract();
  const contributions = await con_tract.getUserContributions(userAddress);

  const formatedContributions: Contributions[] = await Promise.all(
    contributions.map(async (contribution: any) => ({
      tokenAddress: contribution.tokenAddress,
      amount: formatEther(contribution.amount.toString()),
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

const userPools = async (userAddress: string): Promise<SavingPool[]> => {
  try {
    const con_tract = await chainCoopSavingcontract();
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
        symbol: await getTokenAddressSymbol(pool[1]),
        Reason: pool[2],
        poolIndex: pool[3],
        startDate: pool[4].toString(),
        locktype: pool[7],
        Duration: pool[5].toString(),
        amountSaved: formatUnits(pool[6].toString(),6),
        isGoalAccomplished: pool[8],
      }))
    );

    return formattedPools;
  } catch (error) {
    console.error('Error fetching user pools:', error);
    throw new Error('Failed to fetch user pools');
  }
};
const userPoolsByPoolId = async (poolId: string): Promise<SavingPool> => {
  try {
    const con_tract = await chainCoopSavingcontract();
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
      locktype: rawPools[7],
      Duration: rawPools[5].toString(),
      amountSaved: formatEther(rawPools[6].toString()),
      isGoalAccomplished: rawPools[8],
      symbol: await getTokenAddressSymbol(rawPools[1]),
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
