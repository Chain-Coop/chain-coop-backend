import Web3History from "../../models/web3History";

const createTransactionHistory = async(userId:string,amount:number,transactionType:string,txHash:string,tokenSymbol:string)=>{

    const history = new Web3History({
        user:userId,
        transactionType:transactionType,
        amount:amount,
        Token:tokenSymbol,
        TxHash:txHash
              

    })
    await history.save();
    return history;
    

}
//get user history
const getWeb3UserHistory = async(userId:string)=>{
    const history = await Web3History.find({user:userId}).sort({createdAt:-1});
    return history;
    }
export {createTransactionHistory,getWeb3UserHistory}