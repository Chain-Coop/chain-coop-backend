import AsyncHandler from "express-async-handler";
import { Request,Response } from "express";
import { activateAccount,checkStableUserBalance,checkExistingWallet } from "../../services/web3/accountService";

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
        res.json({message:"Account activated successfully",account})

    }catch(error){
        console.log(error);
        res.status(500).json({message:"Internal Server Error"})

    }
})

// const userBalance = AsyncHandler(async(req:Request,res:Response)=>{
//     //@ts-ignore
//     const userId = req.user.userId;
//     try{
//         if(!userId){
//             res.status(401).json({message:"Unauthorized"});
//             return
//             }
//             const balance = await checkStableUserBalance(userId)
//             res.json({message:"Balance fetched successfully",data:balance})
//             }catch(error){
//                 console.log(error);
//                 res.status(500).json({message:"Internal Server Error"})
//                 }
// })

export {activate}