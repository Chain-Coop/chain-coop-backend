// import { ethers, Contract } from 'ethers';
// import { LISKRPC_TESTNET, ETHERLINK_TESTNET } from '../../constant/rpcs';
// import erc20abi from '../../constant/abi/abi.json';
// import savingabi from '../../constant/abi/ChainCoopSaving.json';
// import { Signer } from '../../utils/web3/createSingner';
// import {
//   CHAINCOOPSAVING_BSC_TESTNET,
//   CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2,
//   CHAINCOOPSAVINGCONTRACT_ETHERLINK_TESTNET,
// } from '../../constant/contract/ChainCoopSaving';

// export const Provider = new ethers.JsonRpcProvider(ETHERLINK_TESTNET);

// const contract = async (
//   tokenAddress: string,
//   privateKey?: string
// ): Promise<ethers.Contract> => {
//   const signerOrProvider = privateKey ? await Signer(privateKey) : Provider;

//   const contract = new Contract(tokenAddress, erc20abi.abi, signerOrProvider);
//   return contract;
// };

// //ChainCoop Saving Contract
// const chainCoopSavingcontract = async (
//   privateKey?: string
// ): Promise<ethers.Contract> => {
//   const signerOrProvider = privateKey ? await Signer(privateKey) : Provider;

//   const contract = new Contract(
//     CHAINCOOPSAVINGCONTRACT_ETHERLINK_TESTNET,
//     savingabi.abi,
//     signerOrProvider
//   );
//   return contract;
// };

// export { contract, chainCoopSavingcontract };
