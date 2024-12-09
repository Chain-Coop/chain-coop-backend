import { ethers } from "ethers";
interface Web3Account{
    address:string;
    private:string;
    publicKey:string;
    
}

const generateAccount=():Web3Account=>{
    const account =  ethers.Wallet.createRandom()
   return {address:account.address,private:account.privateKey,publicKey:account.publicKey};
  
}

export {generateAccount}