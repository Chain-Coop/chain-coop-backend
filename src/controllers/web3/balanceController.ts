import AsyncHandler from "express-async-handler";
import { Request,Response } from "express";
import { activateAccount,checkStableUserBalance,userAddress,checkExistingWallet, getUserWeb3Wallet, totalUserTokenBalance, userTokensBalance } from "../../services/web3/accountService";
import { tokenAddress } from "../../utils/web3/tokenaddress";


const userTokenBalance = AsyncHandler(async(req:Request,res:Response)=>{
    //@ts-ignore
    const userId = req.user.userId;
    const { tokenId } = req.params; //1 is for usdc , 2 for Lisk Token
    try{
        if(!userId){
            res.status(401).json({message:"Unauthorized"});
            return
            }
            const tokenIdNum = parseInt(tokenId, 10);
    if (isNaN(tokenIdNum)) {
       res.status(400).json({ message: "Invalid tokenId" });
       return
    }
    const exist = await checkExistingWallet(userId)
    if(!exist){
        res.status(400).json({message:"Wallet not activated"})
        return
        }
           const token_address = tokenAddress(tokenIdNum)
    const userPublicKey = await userAddress(userId);
    console.log("user public key",userPublicKey)

            const balance = await checkStableUserBalance(userPublicKey,token_address)
            res.json({message:"Balance fetched successfully",data:balance})
            }catch(error){
                console.log(error);
                res.status(500).json({message:"Internal Server Error"})
                }
})

const usertokensAmount = AsyncHandler(async(req:Request,res:Response)=>{
    //@ts-ignore
    const userId = req.user.userId;
    try{
        const exists = await checkExistingWallet(userId)
        if(!exists){
            res.status(400).json({message:"No Wallet found"});
            return
            }
            const details= await getUserWeb3Wallet(userId)
            //get address
            const tokensbalance = await userTokensBalance(details.address)

            

            res.json({message:"Success",data:tokensbalance})
            }catch(error){
                console.log(error);
                res.status(500).json({message:"Internal Server Error"})
                }
})
const totalUserWalletBalance = AsyncHandler(async(req:Request,res:Response)=>{
    //@ts-ignore
    const userId = req.user.userId;
    try{
        const exists = await checkExistingWallet(userId)
        if(!exists){
            res.status(400).json({message:"No Wallet found"});
            return
            }
            const details= await getUserWeb3Wallet(userId)
            //get address
            const totalbalance = await totalUserTokenBalance(details.address)

            

            res.json({message:"Success",data:totalbalance})
            }catch(error){
                console.log(error);
                res.status(500).json({message:"Internal Server Error"})
                }
})
export {userTokenBalance,usertokensAmount,totalUserWalletBalance}