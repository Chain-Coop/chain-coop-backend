import { ethers,Contract } from "ethers";
import { LISKRPC_TESTNET } from "../../constant/rpcs";
import erc20abi from "../../constant/abi/abi.json"
import { Signer } from "../../utils/web3/createSingner";

export const Provider = new ethers.JsonRpcProvider(LISKRPC_TESTNET)

const contract =async(tokenAddress:string,privateKey?:string):Promise<ethers.Contract>=>{
    const signerOrProvider = privateKey ? await Signer(privateKey) : Provider;
    
    const contract = new Contract(tokenAddress,erc20abi,signerOrProvider);
    return contract
}

export {contract}