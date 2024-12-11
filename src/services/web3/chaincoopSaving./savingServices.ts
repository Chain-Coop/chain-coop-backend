import {chainCoopSavingcontract } from "../../../utils/web3/contract";
import { ethers, parseEther } from "ethers";
import { approveTokenTransfer } from "../accountService";
import { CHAINCOOPSAVINGCONTRACT_LISK_TESTNET } from "../../../constant/contract/ChainCoopSaving";

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
        console.log(error);
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
    return pools



}

const userPools = async(userAddress:string)=>{
    const con_tract = await chainCoopSavingcontract();
    const userPools = await con_tract.getSavingPoolBySaver(userAddress);
    return userPools;

}

export {userPools,totalPoolCreated,withdrawFromPool,updatePoolAmount,openPool}