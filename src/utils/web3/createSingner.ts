import { ethers,Wallet } from "ethers";
import { Provider } from "./contract";


const Signer = async(privateKey:string):Promise<ethers.Signer>=>{
    const sig_ner = new ethers.Wallet(privateKey, Provider);
    return sig_ner;

}

export {Signer}
