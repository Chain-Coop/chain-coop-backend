import { ethers, Contract } from 'ethers';
import savingcirclesabi from '../../constant/abi/SavingCircles.json';
import { Signer } from '../../utils/web3/createSingner';
import {
  SAVINGCIRCLESCONTRACT_BSC,
  SAVINGCIRCLESCONTRACT_POLYGON,
} from '../../constant/contract/SavingCircles';
import { BSC_RPC, POLYGON_RPC, LISK_RPC } from '../../constant/rpcs';

const savingcirclescontract = async (
  network: string,
  privateKey?: string
): Promise<ethers.Contract> => {
  if (!network) {
    throw new Error('Network is required to create a contract instance');
  }
  let Provider;
  let contractAddress;
  if (network === 'BSC') {
    Provider = new ethers.JsonRpcProvider(BSC_RPC);
    contractAddress = SAVINGCIRCLESCONTRACT_BSC;
  } else if (network === 'POLYGON') {
    Provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    contractAddress = SAVINGCIRCLESCONTRACT_POLYGON;
  } else {
    throw new Error('Unsupported network');
  }
  const signerOrProvider = privateKey
    ? await Signer(privateKey, Provider)
    : Provider;

  const contract = new Contract(
    contractAddress,
    savingcirclesabi.abi,
    signerOrProvider
  );
  return contract;
};

const userAddress = async (private_key: string): Promise<string> => {
  const userWallet = new ethers.Wallet(private_key);
  const userAddress = userWallet.address;
  return userAddress;
};

export { savingcirclescontract, userAddress };
