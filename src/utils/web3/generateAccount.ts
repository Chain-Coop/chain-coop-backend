import { ethers } from "ethers";
interface Web3Account{
    address:string;
    privateKey:string;
    publicKey:string;
    
}

const generateAccount=():Web3Account=>{
    const account =  ethers.Wallet.createRandom()
   return {address:account.address,privateKey:account.privateKey,publicKey:account.publicKey};
  
}

export {generateAccount}