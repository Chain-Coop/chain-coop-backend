import { generateAccount } from "../../utils/web3/generateAccount";

/***
 * TODO import web3 wallet account model
 */

const activateAccount = async(userId:string)=>{
    const {address,privateKey,publicKey} =  generateAccount()
    //add address,keys to the model

}

const checkUserUsdcBalance = async(publicKey:string)=>{
    

}