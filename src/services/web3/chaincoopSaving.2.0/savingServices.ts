import {chainCoopSavingcontract } from "../../../utils/web3/contract";
import { ethers, formatEther, parseEther } from "ethers";
import { approveTokenTransfer } from "../accountService";
import { CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2 } from "../../../constant/contract/ChainCoopSaving";
import { getTokenAddressSymbol } from "../accountService";

//NB DURATION IS IN SECONDS
//lisk, usdc

const openPool = async(tokenAddressToSaveWith:string,initialSaveAmount:string,reasonForSaving:string,
  lockType:number,duration:number,userPrivateKey:string)=>{
    try{
        const approveTx = await approveTokenTransfer(tokenAddressToSaveWith,CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2,initialSaveAmount,userPrivateKey);
        if(!approveTx){
            throw Error("Failed to approve transfer")
        }
        const con_tract = await chainCoopSavingcontract(userPrivateKey);
        const tx = await con_tract.openSavingPool(tokenAddressToSaveWith,parseEther(initialSaveAmount),reasonForSaving,lockType,duration)
        await tx.wait()
        return tx;
        
        
    }catch(error){
        console.log(`Error Opening a saving pool`,error);
        throw Error("Something went wrong please retry")
    }
   

}

const updatePoolAmount = async(poolId_bytes:string,amount:string,tokenAddressToSaveWith:string,userPrivateKey:string)=>{
    try{
        const approveTx = await approveTokenTransfer(tokenAddressToSaveWith,CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2,amount,userPrivateKey);
        if(!approveTx){
            throw Error("Failed to approve transfer")
        }
        const con_tract = await chainCoopSavingcontract(userPrivateKey);
        const tx  = await con_tract.updateSaving(poolId_bytes,parseEther(amount))
        await tx.wait()
        return tx

    }catch(error){
        console.log(error)
        throw Error("Something went wrong please retry")

    }
   

}
const withdrawFromPool = async(poolId_bytes:string,userPrivateKey:string)=>{
    const con_tract = await chainCoopSavingcontract(userPrivateKey);
    const tx = await con_tract.withdraw(poolId_bytes);
    await tx.wait()
    return tx;


}
//stopSaving 
const stopSaving = async(poolId:string,userPrivateKey:string)=>{
  try{
    const con_tract = await chainCoopSavingcontract(userPrivateKey);
    const tx = await con_tract.stopSaving(poolId);
    await tx.wait()
    return tx;
    }catch(error:any){
      console.log(error)
      throw Error(error.message? error.message:"Failed to stop Saving!")
      }

}
//restartSaving
const restartSaving = async(poolId:string,userPrivateKey:string)=>{
  try{
    const con_tract = await chainCoopSavingcontract(userPrivateKey);
    const tx = await con_tract.restartSaving(poolId);
    await tx.wait()
    return tx;
    }catch(error:any){
      console.log(error)
      throw Error(error.message? error.message:"Failed to restart Saving!")
      }
      }

//Views Functions
const totalPoolCreated = async():Promise<number>=>{
    const con_tract = await chainCoopSavingcontract();
    const pools = await con_tract.getSavingPoolCount();
    return Number(pools)
}
//getUserContributions
interface Contributions{
  tokenAddress: string;
  amount: number;
}
const getUserContributions = async(userAddress:string):Promise<Contributions[]>=>{
  const con_tract = await chainCoopSavingcontract();
  const contributions = await con_tract.getUserContributions(userAddress);
  
  const formatedContributions:Contributions[] = await Promise.all(contributions.map(async(contribution:any)=>
  
  ({
    tokenAddress: contribution.tokenAddress,
    amount: formatEther(contribution.amount.toString()),
  })))
  return formatedContributions;
  }


  
interface SavingPool {
    saver: string;
    tokenToSaveWith: string;
    Reason: string;
    poolIndex: string; // bytes32 can be converted to a string
    locktype: number; // Convert BigInt to string for JSON compatibility
    Duration: string; // Convert BigInt to string
    amountSaved: string; // Convert BigInt to string
    isGoalAccomplished: boolean;
    symbol:string // not part of the returned map
  }

const userPools = async (userAddress: string): Promise<SavingPool[]> => {
    try {
      const con_tract = await chainCoopSavingcontract();
      const rawUserPools = await con_tract.getSavingPoolBySaver(userAddress);
  
      // Map rawUserPools to a serializable format
      const formattedPools: SavingPool[] = await Promise.all(
        rawUserPools.map(async (pool: any) => ({
          saver: pool.saver,
          tokenToSaveWith: pool.tokenToSaveWith,
          symbol: await getTokenAddressSymbol(pool.tokenToSaveWith), 
          Reason: pool.Reason,
          poolIndex: pool.poolIndex,
          //goalAmount: formatEther(pool.goalAmount.toString()),
          locktype: pool.locktype,
          Duration: pool.Duration.toString(),
          amountSaved: formatEther(pool.amountSaved.toString()),
          isGoalAccomplished: pool.isGoalAccomplished,
        }))
      );
  
      return formattedPools;
    } catch (error) {
      console.error('Error fetching user pools:', error);
      throw new Error('Failed to fetch user pools');
    }
  };
  

export {userPools,totalPoolCreated,withdrawFromPool,updatePoolAmount,openPool,restartSaving,stopSaving,getUserContributions}