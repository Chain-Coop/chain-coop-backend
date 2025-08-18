import { ethers, Contract } from 'ethers';
import {
  LISK_RPC,
  ETHERLINK_RPC,
  BSC_RPC,
  POLYGON_RPC,
} from '../../constant/rpcs';
import erc20abi from '../../constant/abi/abi.json';
import savingabi from '../../constant/abi/ChainCoopSaving.2.0.json';
import { Signer } from '../../utils/web3/createSingner';
import {
  CHAINCOOPSAVING_BSC,
  CHAINCOOPSAVINGCONTRACT_LISK,
  CHAINCOOPSAVINGCONTRACT_ETHERLINK,
  CHAINCOOPSAVING_POLYGON,
} from '../../constant/contract/ChainCoopSaving';
import erc20WithPermit from '../../constant/abi/abiPermit.json';

const contract = async (
  tokenAddress: string,
  network: string,
  privateKey?: string
): Promise<ethers.Contract> => {
  let provider;
  if (network === 'LISK') {
    provider = new ethers.JsonRpcProvider(LISK_RPC);
  } else if (network === 'BSC') {
    provider = new ethers.JsonRpcProvider(BSC_RPC);
  } else if (network === 'ETHERLINK') {
    provider = new ethers.JsonRpcProvider(ETHERLINK_RPC);
  } else if (network === 'POLYGON') {
    provider = new ethers.JsonRpcProvider(POLYGON_RPC);
  } else {
    throw new Error(`Invalid contract network: ${network}`);
  }
  const signerOrProvider = privateKey
    ? await Signer(privateKey, provider)
    : provider;

  const contract = new Contract(tokenAddress, erc20abi.abi, signerOrProvider);
  return contract;
};

//ChainCoop Saving Contract
const chainCoopSavingcontract = async (
  network: string,
  privateKey?: string
): Promise<ethers.Contract> => {
  let provider;
  let contractAddress;

  if (network === 'LISK') {
    contractAddress = CHAINCOOPSAVINGCONTRACT_LISK;
    provider = new ethers.JsonRpcProvider(LISK_RPC);
  } else if (network === 'BSC') {
    contractAddress = CHAINCOOPSAVING_BSC;
    provider = new ethers.JsonRpcProvider(BSC_RPC);
  } else if (network === 'ETHERLINK') {
    contractAddress = CHAINCOOPSAVINGCONTRACT_ETHERLINK;
    provider = new ethers.JsonRpcProvider(ETHERLINK_RPC);
  } else if (network === 'POLYGON') {
    contractAddress = CHAINCOOPSAVING_POLYGON;
    provider = new ethers.JsonRpcProvider(POLYGON_RPC);
  } else {
    throw new Error(`Invalid execution network: ${network}`);
  }
  const signerOrProvider = privateKey
    ? await Signer(privateKey, provider)
    : provider;
  const contract = new Contract(
    contractAddress,
    savingabi.abi,
    signerOrProvider
  );
  return contract;
};

//With permit
const contractWithPermit = async (
  tokenAddress: string,
  network: string,
  privateKey?: string
): Promise<ethers.Contract> => {
  let provider;
  if (network === 'LISK') {
    provider = new ethers.JsonRpcProvider(LISK_RPC);
  } else if (network === 'BSC') {
    provider = new ethers.JsonRpcProvider(BSC_RPC);
  } else if (network === 'ETHERLINK') {
    provider = new ethers.JsonRpcProvider(ETHERLINK_RPC);
  } else if (network === 'POLYGON') {
    provider = new ethers.JsonRpcProvider(POLYGON_RPC);
  } else {
    throw new Error(`Invalid contract network: ${network}`);
  }
  const signerOrProvider = privateKey
    ? await Signer(privateKey, provider)
    : provider;
  const contract = new Contract(
    tokenAddress,
    erc20WithPermit.abi,
    signerOrProvider
  );
  return contract;
};

//get nonce - FIXED: Added network parameter
const getNonce = async (
  tokenAddress: string,
  userAddress: string,
  network: string
): Promise<number> => {
  const contract = await contractWithPermit(tokenAddress, network);
  const nonce = await contract.nonces(userAddress);
  return Number(nonce);
};

// Sign Permit - FIXED: Major corrections
const signPermit = async (
  tokenAddress: string,
  relayerPrivateKey: string,
  userPrivateKey: string,
  value: string,
  network: string
): Promise<any> => {
  try {
    let provider;
    let spender;

    // Get network configuration
    if (network === 'LISK') {
      provider = new ethers.JsonRpcProvider(LISK_RPC);
      spender = CHAINCOOPSAVINGCONTRACT_LISK;
    } else if (network === 'BSC') {
      provider = new ethers.JsonRpcProvider(BSC_RPC);
      spender = CHAINCOOPSAVING_BSC;
    } else if (network === 'ETHERLINK') {
      provider = new ethers.JsonRpcProvider(ETHERLINK_RPC);
      spender = CHAINCOOPSAVINGCONTRACT_ETHERLINK;
    } else if (network === 'POLYGON') {
      provider = new ethers.JsonRpcProvider(POLYGON_RPC);
      spender = CHAINCOOPSAVING_POLYGON;
    } else {
      throw new Error(`Invalid contract network: ${network}`);
    }

    // FIXED: Create wallets with providers
    const userWallet = new ethers.Wallet(userPrivateKey, provider);
    const relayerWallet = new ethers.Wallet(relayerPrivateKey, provider);

    // FIXED: Get contract with relayer wallet for execution
    const contract = await contractWithPermit(
      tokenAddress,
      network,
      relayerPrivateKey
    );

    // Get token details
    const name = await contract.name();
    const version = '1'; // Most ERC20 tokens use version 1
    const chainId = (await provider.getNetwork()).chainId;

    // EIP-712 domain
    const domain = {
      name,
      version,
      chainId: Number(chainId),
      verifyingContract: tokenAddress,
    };

    // EIP-712 types
    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    // Get user's current nonce
    const nonce = await getNonce(tokenAddress, userWallet.address, network);
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const parsedValue = ethers.parseUnits(value, 6);

    // FIXED: Correct message structure
    const message = {
      owner: userWallet.address,
      spender: spender,
      value: parsedValue.toString(), // Convert to string for signing
      nonce: nonce,
      deadline: deadline,
    };

    // FIXED: User wallet signs the permit (not relayer)
    const signature = await userWallet.signTypedData(domain, types, message);
    const { v, r, s } = ethers.Signature.from(signature);

    // FIXED: Relayer executes the permit transaction
    const permitTx = await contract.permit(
      userWallet.address,
      spender,
      parsedValue,
      deadline,
      v,
      r,
      s
    );

    await permitTx.wait();
    console.log('Permit transaction successful:', permitTx.hash);
    return permitTx;
  } catch (error) {
    console.error('Error in signPermit:', error);
    throw new Error(
      `Failed to sign permit: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};

export { contract, chainCoopSavingcontract, signPermit, getNonce };
