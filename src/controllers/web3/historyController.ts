import AsyncHandler from "express-async-handler";
import { getWeb3UserHistory } from "../../services/web3/historyService";
import { Request,Response } from "express";
const userTxHistory = AsyncHandler(async(req:Request,res:Response)=>{
    //@ts-ignore
    const userId = req.user.userId;
   
    try{
        const history = await getWeb3UserHistory(userId)
        res.status(200).json({message:"success",data:history})
            
            }catch(error){
                console.log(error);
                res.status(500).json({message:"Internal Server Error"})
                }
})

export {userTxHistory}