import { generateAccount } from "../../utils/web3/generateAccount";
import { contract } from "../../utils/web3/contract";
import { parseEther } from "ethers";

/***
 * TODO import web3 wallet account model
 */

const activateAccount = async(userId:string)=>{
    const {address,privateKey,publicKey} =  generateAccount()
    //add address,keys to the model

}

const checkStableUserBalance = async(publicKey:string,tokenAddress:string):Promise<number>=>{
    const con_tract = await contract(tokenAddress)
    const balance = await con_tract.balanceOf(publicKey)
    return balance;
}

const transferStable = async (
    userPrivateKey: string,
    amount: string,
    toAddress: string,
    tokenAddress: string
): Promise<string> => {
    try {
      
        const con_tract = await contract(tokenAddress, userPrivateKey);

       
        const tx = await con_tract.transfer(toAddress, parseEther(amount));

        
        await tx.wait();

        
        return tx.hash;
    } catch (error) {
        console.error("Error during token transfer:", error);
        throw new Error("Token transfer failed.");
    }
};


export {transferStable,activateAccount,checkStableUserBalance}