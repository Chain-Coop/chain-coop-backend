import { generateAccount } from "../../utils/web3/generateAccount";
import { contract } from "../../utils/web3/contract";
import { parseEther } from "ethers";
import Web3Wallet from "../../models/web3Wallet";
import User from "../../models/user";

const activateAccount = async(userId:string)=>{
    const user = User.findById(userId);
    if (!user){
        throw new Error("User not found");
    }
    const {address,privateKey,publicKey} =  generateAccount()
    /***
     * TODO
     *  //generate algorithm to encrypt purivate key
     */
   
    const web3Wallet = new Web3Wallet({
        user: userId,
        encryptedKey: privateKey,
        publicKey: publicKey,
        address: address,
      });
    
      await web3Wallet.save();
      return web3Wallet;

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

//get user account details
const  userWeb3WalletDetails=async(userId: string)=> {
    try {
      
      const wallets = await Web3Wallet.find({ user: userId })
        .select("-encryptedKey") 
        .populate("user", "email phoneNumber"); // Optionally include specific user fields
  
      if (!wallets || wallets.length === 0) {
        throw new Error("No wallets found for this user");
      }
  
    
      return wallets;
    } catch (error:any) {
      throw new Error(`Error fetching wallet details: ${error.message}`);
    }
  }

export {transferStable,activateAccount,checkStableUserBalance,userWeb3WalletDetails}