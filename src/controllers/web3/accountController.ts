import AsyncHandler from "express-async-handler";
import { Request,Response } from "express";
import { activateAccount,checkStableUserBalance,checkExistingWallet,getUserWeb3Wallet} from "../../services/web3/accountService";

const activate = AsyncHandler(async(req:Request,res:Response)=>{
     //@ts-ignore
    const userId = req.user.userId;
    try{
        if(!userId){
            res.status(401).json({message:"Unauthorized"});
            return
        }
        const exists = await checkExistingWallet(userId)
        if(exists){
            res.status(400).json({message:"Wallet Already Activated"});
            return
            }
        const account = await activateAccount(userId)
        res.json({message:"Account activated successfully"})

    }catch(error){
        console.log(error);
        res.status(500).json({message:"Internal Server Error"})

    }
})

const userDetails = AsyncHandler(async(req:Request,res:Response)=>{
    //@ts-ignore
    const userId = req.user.userId;
    try{
        const exists = await checkExistingWallet(userId)
        if(!exists){
            res.status(400).json({message:"No Wallet found"});
            return
            }
            const details= await getUserWeb3Wallet(userId)
            //remove encryptedKey
            const {encryptedKey,...user} = details

            res.json({data:user})
            }catch(error){
                console.log(error);
                res.status(500).json({message:"Internal Server Error"})
                }
})



export {activate,userDetails}