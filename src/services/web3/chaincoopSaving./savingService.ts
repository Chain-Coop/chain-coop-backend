import { contract,chainCoopSavingcontract } from "../../../utils/web3/contract";

const addSupportedTokenAddress=async(newToken:string,adminPrivateKey:string)=>{
    const con_tract = await chainCoopSavingcontract(adminPrivateKey);
    const tx = await con_tract.setAllowedTokens(newToken)
    await tx.wait();
    return tx;
}