import { chainCoopSavingcontract } from '../../../utils/web3/contract.2.0';

const addSupportedTokenAddress = async (
  newToken: string,
  adminPrivateKey: string,
  network: string
) => {
  const con_tract = await chainCoopSavingcontract(network, adminPrivateKey);
  const tx = await con_tract.setAllowedTokens(newToken);
  await tx.wait();
  return tx;
};
//change admin address only the previous owner can this
const transferOwnership = async (
  newAdminAddress: string,
  adminPrivateKey: string,
  network: string
) => {
  const con_tract = await chainCoopSavingcontract(network, adminPrivateKey);
  const tx = await con_tract.transferOwnership(newAdminAddress);
  await tx.wait();
  return tx;
};

//set An address thats takes the fees only the admin can do this
const setAddressForFeeCollection = async (
  newFeeAddress: string,
  adminPrivateKey: string,
  network: string
) => {
  const con_tract = await chainCoopSavingcontract(network, adminPrivateKey);
  const tx = await con_tract.setChainCoopAddress(newFeeAddress);
  await tx.wait();
  return tx;
};
const flagRemoveTokens = async (
  tokenAddress: string,
  adminPrivateKey: string,
  network: string
) => {
  const con_tract = await chainCoopSavingcontract(adminPrivateKey, network);
  const tx = await con_tract.removeAllowedTokens(tokenAddress);
  await tx.wait();
  return tx;
};

export {
  addSupportedTokenAddress,
  transferOwnership,
  flagRemoveTokens,
  setAddressForFeeCollection,
};
