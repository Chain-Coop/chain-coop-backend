import { ethers, Contract } from 'ethers';
import { LISKRPC_TESTNET } from '../../constant/rpcs';
import savingcirclesabi from '../../constant/abi/SavingCircles.json';
import { Signer } from '../../utils/web3/createSingner';
import {
  SAVINGCIRCLESCONTRACT_BSC_TESTNET,
  SAVINGCIRCLESCONTRACT_POLYGON_TESTNET,
} from '../../constant/contract/SavingCircles';
import { BSC_TESTNET, POLYGON_TESTNET } from '../../constant/rpcs';

const savingcirclescontract = async (
  network: string,
  privateKey?: string
): Promise<ethers.Contract> => {
  if (!network) {
    throw new Error('Network is required to create a contract instance');
  }
  let Provider;
  let contractAddress;
  if (network === 'TBSC') {
    Provider = new ethers.JsonRpcProvider(BSC_TESTNET);
    contractAddress = SAVINGCIRCLESCONTRACT_BSC_TESTNET;
  } else if (network === 'TPOLYGON') {
    Provider = new ethers.JsonRpcProvider(POLYGON_TESTNET);
    contractAddress = SAVINGCIRCLESCONTRACT_POLYGON_TESTNET;
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
