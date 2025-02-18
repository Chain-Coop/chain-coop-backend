import { ethers,Contract } from "ethers";
import { LISKRPC_TESTNET } from "../../constant/rpcs";
import erc20abi from "../../constant/abi/abi.json"
import savingabi from "../../constant/abi/ChainCoopSaving.2.0.json"
import { Signer } from "../../utils/web3/createSingner";
import { CHAINCOOPSAVINGCONTRACT_LISK_TESTNET,CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2 } from "../../constant/contract/ChainCoopSaving";
import erc20WithPermit from "../../constant/abi/abiPermit.json"


export const Provider = new ethers.JsonRpcProvider(LISKRPC_TESTNET)

const contract =async(tokenAddress:string,privateKey?:string):Promise<ethers.Contract>=>{
    const signerOrProvider = privateKey ? await Signer(privateKey) : Provider;
    
    const contract = new Contract(tokenAddress,erc20abi,signerOrProvider);
    return contract
}

//ChainCoop Saving Contract
const chainCoopSavingcontract =async(privateKey?:string):Promise<ethers.Contract>=>{
    const signerOrProvider = privateKey ? await Signer(privateKey) : Provider;
    
    const contract = new Contract(CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2,savingabi.abi,signerOrProvider);
    return contract
}

//With permit
const contractWithPermit =async(tokenAddress:string,privateKey?:string):Promise<ethers.Contract>=>{
    const signerOrProvider = privateKey ? await Signer(privateKey) : Provider;
    const contract = new Contract(tokenAddress,erc20WithPermit,signerOrProvider)
    return contract   

}
//get addressfrom private key
const userAddress = async(private_key:string):Promise<string>=>{
    const userWallet = new ethers.Wallet(private_key);
    const userAddress = userWallet.address;
    return userAddress
}

//get noonce
const getNonce =async(tokenAddress:string,privateKey:string):Promise<number>=>{ 
    const contract = await contractWithPermit(tokenAddress,privateKey) 
    const userWallet = new ethers.Wallet(privateKey);
    const nonce = await contract.nonces(userWallet.address)
  
  return nonce;
    }
    // Sign Permit
    const signPermit = async (
        tokenAddress: string,
        privateKey: string,
        spender: string,
        value: bigint,
        deadline: number
    ): Promise<{ v: number; r: string; s: string }> => {
        const userWallet = new ethers.Wallet(privateKey);
        const contract = await contractWithPermit(tokenAddress);
    
        // Get domain separator
        const name = await contract.name();
        const version = "1";
        const chainId = (await Provider.getNetwork()).chainId;
        const domain = {
            name,
            version,
            chainId,
            verifyingContract: tokenAddress,
        };
    
        // Define permit type
        const types = {
            Permit: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        };
    
        // Get nonce
        const nonce = await getNonce(tokenAddress, privateKey);
    
        // Define message
        const message = {
            owner: userWallet.address,
            spender,
            value,
            nonce,
            deadline,
        };
    
        // Sign the permit message
        const signature = await userWallet.signTypedData(domain, types, message);
        const { v, r, s } = ethers.Signature.from(signature);
    
        return { v, r, s };
    };  
    
    // Submit Permit and Transfer
const submitPermitAndTransfer = async (
    tokenAddress: string,
    relayerPrivateKey: string,
    userAddress: string,
    recipient: string,
    value: bigint,
    deadline: number,
    permitSignature: { v: number; r: string; s: string }
): Promise<string> => {
    const relayerWallet = new ethers.Wallet(relayerPrivateKey, Provider);
    const contract = await contractWithPermit(tokenAddress, relayerPrivateKey);

    // Submit permit
    const permitTx = await contract.permit(
        userAddress,
        recipient,
        value,
        deadline,
        permitSignature.v,
        permitSignature.r,
        permitSignature.s
    );
    await permitTx.wait();

    // Submit transferFrom
    const transferTx = await contract.transferFrom(userAddress, recipient, value);
    await transferTx.wait();

    return transferTx.hash;
};
export {contract,chainCoopSavingcontract,signPermit,submitPermitAndTransfer,userAddress}