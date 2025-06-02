import {
  ethers,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  Wallet,
  Contract,
  TypedDataDomain,
} from 'ethers';
import {
  LISKRPC_TESTNET,
  ETHERLINK_TESTNET,
  BSC_TESTNET,
  POLYGON_TESTNET,
} from '../../../constant/rpcs';
import {
  FORWARDER_CONTRACT_BSC_TESTNET,
  FORWARDER_CONTRACT_ETHERLINK_TESTNET,
  FORWARDER_CONTRACT_POLYGON_TESTNET,
  FORWARDER_CONTRACT_LISK_TESTNET,
  CHAINCOOPSAVINGCONTRACT_ETHERLINK_TESTNET,
  CHAINCOOPSAVING_BSC_TESTNET,
  CHAINCOOPSAVING_POLYGON_TESTNET,
  CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2,
} from '../../../constant/contract/ChainCoopSaving';

import forwarderABI from '../../../constant/abi/Forwarder.json';

interface ForwardRequest {
  from: string;
  to: string;
  value: string;
  gas: number;
  nonce: string; // ✅ Required, not optional
  deadline: number;
  data: string;
  signature?: string;
}

const EIP712_DOMAIN_TYPE = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

const FORWARD_REQUEST_TYPE = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'gas', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint48' }, // ✅ Match contract type
  { name: 'data', type: 'bytes' },
];

export async function signMetaTransaction(
  userPrivateKey: string,
  network: string,
  data: string,
  value: string = '0'
): Promise<{ forwardRequest: ForwardRequest; signature: string }> {
  let provider;
  let wallet;
  let forwarderContractAddress;
  let contractAddress;

  // Get network configuration
  if (network === 'LISK') {
    provider = new ethers.JsonRpcProvider(LISKRPC_TESTNET);
    wallet = new Wallet(userPrivateKey, provider);
    forwarderContractAddress = FORWARDER_CONTRACT_LISK_TESTNET;
    contractAddress = CHAINCOOPSAVINGCONTRACT_LISK_TESTNET_VERSION_2;
  } else if (network === 'ETHERLINK') {
    provider = new ethers.JsonRpcProvider(ETHERLINK_TESTNET);
    wallet = new Wallet(userPrivateKey, provider);
    forwarderContractAddress = FORWARDER_CONTRACT_ETHERLINK_TESTNET;
    contractAddress = CHAINCOOPSAVINGCONTRACT_ETHERLINK_TESTNET;
  } else if (network === 'BSC') {
    provider = new ethers.JsonRpcProvider(BSC_TESTNET);
    wallet = new Wallet(userPrivateKey, provider);
    forwarderContractAddress = FORWARDER_CONTRACT_BSC_TESTNET;
    contractAddress = CHAINCOOPSAVING_BSC_TESTNET;
  } else if (network === 'POLYGON') {
    provider = new ethers.JsonRpcProvider(POLYGON_TESTNET);
    wallet = new Wallet(userPrivateKey, provider);
    forwarderContractAddress = FORWARDER_CONTRACT_POLYGON_TESTNET;
    contractAddress = CHAINCOOPSAVING_POLYGON_TESTNET;
  } else {
    throw new Error('Unsupported network');
  }

  const forwarderContract = new Contract(
    forwarderContractAddress,
    forwarderABI.abi,
    provider
  );

  try {
    const nonce = await forwarderContract.nonces(wallet.address);

    // ✅ Ensure deadline fits in uint48 and is reasonable
    const currentTime = Math.floor(Date.now() / 1000);
    const deadline = currentTime + 3600; // 1 hour from now

    // Validate deadline fits in uint48 (max value: 2^48 - 1)
    const maxUint48 = 2 ** 48 - 1;
    if (BigInt(deadline) > maxUint48) {
      throw new Error('Deadline exceeds uint48 maximum value');
    }

    // ✅ Proper gas estimation with buffer
    let gasEstimate;
    try {
      gasEstimate = await provider.estimateGas({
        from: wallet.address,
        to: contractAddress,
        data,
        value: value,
      });
      // Add 20% buffer to gas estimate
      gasEstimate = (gasEstimate * BigInt(120)) / BigInt(100);
    } catch (error) {
      gasEstimate = BigInt(500000); // Fallback gas limit
    }

    const forwardRequest: ForwardRequest = {
      from: wallet.address,
      to: contractAddress,
      value,
      gas: Number(gasEstimate),
      nonce: nonce.toString(),
      deadline,
      data,
    };

    // Get chain ID
    const networkInfo = await provider.getNetwork();
    const chainId = networkInfo.chainId;

    const domainData = {
      name: 'ChainCoopForwarder',
      version: '1',
      chainId: Number(chainId),
      verifyingContract: forwarderContractAddress,
    };

    const types = {
      ForwardRequest: FORWARD_REQUEST_TYPE,
    };

    // ✅ Sign the typed data
    const signature = await wallet.signTypedData(
      domainData,
      types,
      forwardRequest
    );

    const signedForwardRequest: ForwardRequest = {
      ...forwardRequest,
      signature,
    };

    return { forwardRequest: signedForwardRequest, signature };
  } catch (error) {
    console.error('Error signing meta transaction:', error);
    throw new Error(
      `Failed to sign meta transaction: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

export async function executeMetaTransaction(
  forwardRequest: ForwardRequest,
  signature: string,
  network: string
): Promise<any> {
  let provider;
  let relayerWallet;
  let forwarderContractAddress;

  // Get network configuration
  if (network === 'LISK') {
    provider = new ethers.JsonRpcProvider(LISKRPC_TESTNET);
    forwarderContractAddress = FORWARDER_CONTRACT_LISK_TESTNET;
  } else if (network === 'ETHERLINK') {
    provider = new ethers.JsonRpcProvider(ETHERLINK_TESTNET);
    forwarderContractAddress = FORWARDER_CONTRACT_ETHERLINK_TESTNET;
  } else if (network === 'BSC') {
    provider = new ethers.JsonRpcProvider(BSC_TESTNET);
    forwarderContractAddress = FORWARDER_CONTRACT_BSC_TESTNET;
  } else if (network === 'POLYGON') {
    provider = new ethers.JsonRpcProvider(POLYGON_TESTNET);
    forwarderContractAddress = FORWARDER_CONTRACT_POLYGON_TESTNET;
  } else {
    throw new Error('Unsupported network');
  }

  const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
  if (!relayerPrivateKey) {
    throw new Error('Relayer private key not found in environment variables');
  }
  relayerWallet = new Wallet(relayerPrivateKey, provider);

  const forwarderContract = new Contract(
    forwarderContractAddress,
    forwarderABI.abi,
    relayerWallet
  );

  try {
    // ✅ Verify the request is valid
    const isValidSignature = await forwarderContract.verify(forwardRequest);

    if (!isValidSignature) {
      throw new Error('Invalid signature for meta transaction');
    }

    // ✅ Check if deadline hasn't expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (forwardRequest.deadline < currentTime) {
      throw new Error('Transaction deadline has expired');
    }

    // ✅ Execute with proper value and gas
    const gasLimit = BigInt(forwardRequest.gas) + BigInt(100000); // Add buffer for forwarder overhead

    const txResponse = await forwarderContract.execute(forwardRequest, {
      gasLimit: gasLimit,
      value: forwardRequest.value, // ✅ Include value if required
    });

    // ✅ Wait for confirmation
    const receipt = await txResponse.wait();

    return txResponse;
  } catch (error) {
    // ✅ Better error handling
    if (error instanceof Error) {
      if (error.message.includes('ERC2771ForwarderInvalidSigner')) {
        throw new Error('Invalid signer - signature verification failed');
      } else if (error.message.includes('ERC2771ForwarderExpiredRequest')) {
        throw new Error('Request has expired');
      } else if (error.message.includes('ERC2771ForwarderMismatchedValue')) {
        throw new Error('Value mismatch between request and transaction');
      } else if (error.message.includes('ERC2771UntrustfulTarget')) {
        throw new Error('Target contract does not trust this forwarder');
      }
    }

    throw new Error(
      `Failed to execute meta transaction: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
