import { ethers, Contract } from 'ethers';
import { LISKRPC_TESTNET } from '../../constant/rpcs';
import savingcirclesabi from '../../constant/abi/SavingCircles.json';
import { Signer } from '../../utils/web3/createSingner';
import { SAVINGCIRCLESCONTRACT_LISK_TESTNET } from '../../constant/contract/SavingCircles';

export const Provider = new ethers.JsonRpcProvider(LISKRPC_TESTNET);

const savingcirclescontract = async (
  privateKey?: string
): Promise<ethers.Contract> => {
  const signerOrProvider = privateKey ? await Signer(privateKey) : Provider;

  const contract = new Contract(
    SAVINGCIRCLESCONTRACT_LISK_TESTNET,
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

export { savingcirclescontract ,userAddress};
