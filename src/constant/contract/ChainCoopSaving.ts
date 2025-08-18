import dotenv from 'dotenv';
dotenv.config();
export const CHAINCOOPSAVINGCONTRACT_LISK = process.env
  .CHAINCOOPSAVINGCONTRACT_LISK as string;
export const CHAINCOOPSAVINGCONTRACT_ETHERLINK = process.env
  .CHAINCOOPSAVINGCONTRACT_ETHERLINK as string;
export const CHAINCOOPSAVING_BSC = process.env.CHAINCOOPSAVING_BSC as string;
export const CHAINCOOPSAVING_POLYGON = process.env
  .CHAINCOOPSAVING_POLYGON as string;
export const FORWARDER_CONTRACT_LISK = process.env
  .FORWARDER_CONTRACT_LISK as string;
export const FORWARDER_CONTRACT_ETHERLINK = process.env
  .FORWARDER_CONTRACT_ETHERLINK as string;
export const FORWARDER_CONTRACT_BSC = process.env
  .FORWARDER_CONTRACT_BSC as string;
export const FORWARDER_CONTRACT_POLYGON = process.env
  .FORWARDER_CONTRACT_POLYGON as string;
