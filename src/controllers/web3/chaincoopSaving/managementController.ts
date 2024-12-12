import asyncHandler from "express-async-handler";
import { addSupportedTokenAddress,flagRemoveTokens,transferOwnership,setAddressForFeeCollection } from "../../../services/web3/chaincoopSaving./managementService";
import { Request, Response } from "express";

const AllowStableTokenAddressfForSaving =asyncHandler(async(req:Request,res:Response)=>{

})