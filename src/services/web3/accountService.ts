import { generateAccount } from "../../utils/web3/generateAccount";
import { contract } from "../../utils/web3/contract";
import { parseEther } from "ethers";
import Web3Wallet from "../../models/web3Wallet";
import User from "../../models/user";
import { encrypt,decrypt } from "../../utils/web3/encryptordecrypt";

const activateAccount = async(userId:string)=>{
    const user = User.findById(userId);
    if (!user){
        throw new Error("User not found");
    }
    
    const {address,privateKey,publicKey} =  generateAccount()
  
   
    const web3Wallet = new Web3Wallet({
        user: userId,
        encryptedKey: encrypt(privateKey),
        publicKey: publicKey,
        address: address,
      });
    
      await web3Wallet.save();
      return web3Wallet;

}
//check existing user wallet
const checkExistingWallet = async (userId: string):Promise<boolean> => {
  const existingWallet = await Web3Wallet.findOne({ user: userId });
  return existingWallet!!
}

//publickey is the address
const checkStableUserBalance = async(publicKey:string,tokenAddress:string):Promise<{bal:number,symbol:string}>=>{
    const con_tract = await contract(tokenAddress)
    const balance = await con_tract.balanceOf(publicKey)
    //token symbol
    const tokenSymbol = await con_tract.symbol()
    //token decimal
    const tokenDecimal = await con_tract.decimals()
    const adjustedBalance = Number(balance.toString()) / (10 ** Number(tokenDecimal));
    return {bal:adjustedBalance,symbol:tokenSymbol};
}

const userAddress = async(userId:string):Promise<string>=>{
  const wallet = await Web3Wallet.findOne({user:userId});
  return wallet.address;
}

const transferStable = async (
    userPrivateKey: string,
    amount: string,
    toAddress: string,
    tokenAddress: string
): Promise<string> => {
    try {
      
        const con_tract = await contract(tokenAddress, decrypt(userPrivateKey));

       
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

  //approve token transfer
  const approveTokenTransfer = async(tokenAddress:string,toContractAddress:string,amount:string,userPrivateKey:string)=>{
    const con_tract = await contract(tokenAddress, decrypt(userPrivateKey));
    const tx = await con_tract.approve(toContractAddress,parseEther(amount));
    await tx.wait();
    return tx;

  }

export {transferStable,activateAccount,checkStableUserBalance,userWeb3WalletDetails,checkExistingWallet,userAddress,approveTokenTransfer}