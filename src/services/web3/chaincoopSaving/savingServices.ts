import {chainCoopSavingcontract } from "../../../utils/web3/contract";
import { ethers, formatEther, parseEther } from "ethers";
import { approveTokenTransfer } from "../accountService";
import { CHAINCOOPSAVINGCONTRACT_LISK_TESTNET } from "../../../constant/contract/ChainCoopSaving";
import { getTokenAddressSymbol } from "../accountService";

//NB DURATION IS IN SECONDS
//lisk, usdc
const openPool = async(tokenAddressToSaveWith:string,initialSaveAmount:string,goalAmount:string,reasonForSaving:string,duration:number,userPrivateKey:string)=>{
    try{
        const approveTx = await approveTokenTransfer(tokenAddressToSaveWith,CHAINCOOPSAVINGCONTRACT_LISK_TESTNET,initialSaveAmount,userPrivateKey);
        if(!approveTx){
            throw Error("Failed to approve transfer")
        }
        const con_tract = await chainCoopSavingcontract(userPrivateKey);
        const tx = await con_tract.openSavingPool(tokenAddressToSaveWith,parseEther(initialSaveAmount),parseEther(goalAmount),reasonForSaving,duration)
        await tx.wait()
        return tx;
        
        
    }catch(error){
        console.log(`Error Opening a saving pool`,error);
        throw Error("Something went wrong please retry")
    }
   

}

const updatePoolAmount = async(poolId_bytes:string,amount:string,tokenAddressToSaveWith:string,userPrivateKey:string)=>{
    try{
        const approveTx = await approveTokenTransfer(tokenAddressToSaveWith,CHAINCOOPSAVINGCONTRACT_LISK_TESTNET,amount,userPrivateKey);
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

//Views Functions
const totalPoolCreated = async():Promise<number>=>{
    const con_tract = await chainCoopSavingcontract();
    const pools = await con_tract.getSavingPoolCount();
    return Number(pools)
}
interface SavingPool {
    saver: string;
    tokenToSaveWith: string;
    Reason: string;
    poolIndex: string; // bytes32 can be converted to a string
    goalAmount: string; // Convert BigInt to string for JSON compatibility
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
          goalAmount: formatEther(pool.goalAmount.toString()),
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
  

export {userPools,totalPoolCreated,withdrawFromPool,updatePoolAmount,openPool}