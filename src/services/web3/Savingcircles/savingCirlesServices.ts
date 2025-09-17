import {
  ethers,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  BigNumberish,
} from 'ethers';
import { approveTokenTransfer } from '../accountService';
import {
  SAVINGCIRCLESCONTRACT_BSC,
  SAVINGCIRCLESCONTRACT_POLYGON,
} from '../../../constant/contract/SavingCircles';
import { BSC_RPC, POLYGON_RPC } from '../../../constant/rpcs';
import { getTokenAddressSymbol } from '../accountService';
import {
  savingcirclescontract,
  userAddress,
} from '../../../utils/web3/savingContract';
import CircleAbi from '../../../constant/abi/SavingCircles.json';
const iface = new ethers.Interface(CircleAbi.abi);

interface Circle {
  owner: string;
  members: string[];
  currentIndex: number;
  depositAmount: ethers.BigNumberish;
  token: string;
  depositInterval: number;
  circleStart: number;
  maxDeposits: number;
}
const createSavingCircles = async (
  _members: string[],
  _depositAmount: number,
  _token: string,
  userPrivateKey: string,
  _depositInterval: number,
  _maxDeposits: number,
  network: string
) => {
  try {
    const contract = await savingcirclescontract(network, userPrivateKey);
    const circle: Circle = {
      owner: await userAddress(userPrivateKey),
      members: _members,
      currentIndex: 0,
      depositAmount: parseEther(_depositAmount.toString()),
      token: _token,
      depositInterval: _depositInterval,
      circleStart: Math.floor(Date.now() / 1000),
      maxDeposits: _maxDeposits,
    };

    const tx = await contract.create(circle);
    const receipt = await tx.wait(1);
    console.log('Transaction confirmed');
    return receipt;
  } catch (error: any) {
    console.error(`Error Opening a saving circle:`, error.message || error);
    throw new Error('Something went wrong, please retry.');
  }
};

const deposit = async (
  _token: string,
  _id: string,
  _value: string,
  userPrivateKey: string,
  network: string
) => {
  try {
    const approveTx = await approveTokenTransfer(
      _token,
      _value,
      userPrivateKey,
      network
    );
    if (!approveTx) {
      throw Error('Failed to approve transfer');
    }
    console.log('Allowance done');
    const contract = await savingcirclescontract(network, userPrivateKey);

    const tx = await contract.deposit(parseUnits(_id, 0), parseEther(_value));
    await tx.wait(1);
    return tx;
  } catch (error) {
    console.error('Error making deposit:', error);
    throw new Error('Deposit failed, please retry.');
  }
};

const withdraw = async (
  _id: string,
  userPrivateKey: string,
  network: string
) => {
  try {
    const contract = await savingcirclescontract(network, userPrivateKey);

    const tx = await contract.withdraw(parseUnits(_id, 0));
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error withdrawing funds:', error);
    throw new Error('Withdrawal failed, please retry.');
  }
};

const getCircle = async (
  _id: string,
  userPrivateKey: string,
  network: string
) => {
  try {
    const contract = await savingcirclescontract(network, userPrivateKey);
    const circleId = ethers.parseUnits(_id, 0);
    const circle = await contract.getCircle(circleId);
    const formattedCircle = JSON.parse(
      JSON.stringify(circle, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return formattedCircle;
  } catch (error) {
    console.error('Error fetching circle info:', error);
    throw new Error('Could not fetch circle details.');
  }
};
const getMemberCircles = async (userPrivateKey: string, network: string) => {
  try {
    const contract = await savingcirclescontract(network, userPrivateKey);
    const address = await userAddress(userPrivateKey);
    const circles = await contract.getMemberCircles(address);
    const formattedCircle = JSON.parse(
      JSON.stringify(circles, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    return formattedCircle;
  } catch (error) {
    console.error('Error fetching member circles:', error);
    throw new Error('Could not fetch member circles.');
  }
};
const decommissionCircle = async (
  _id: string,
  userPrivateKey: string,
  network: string
) => {
  try {
    const contract = await savingcirclescontract(network, userPrivateKey);
    const tx = await contract.decommission(parseUnits(_id, 0));
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error decommissioning circle:', error);
    throw new Error('Decommission failed, please retry.');
  }
};

const isTokenAllowed = async (
  _token: string,
  userPrivateKey: string,
  network: string
) => {
  try {
    const contract = await savingcirclescontract(network, userPrivateKey);
    const allowed = await contract.isTokenAllowed(_token);
    return allowed;
  } catch (error) {
    console.error('Error checking token allowance:', error);
    throw new Error('Could not fetch token allowance status.');
  }
};

const extractCircleIdFromReceipt = (receipt: any) => {
  try {
    for (const log of receipt.logs) {
      if (log.fragment && log.fragment.name === 'CircleCreated') {
        // The logs are already parsed, so just access args directly
        const circleId = log.args._id || log.args[0]; // Try both _id and index 0
        return circleId.toString();
      }
    }

    throw new Error('CircleCreated event not found');
  } catch (err) {
    console.error('Error extracting circle ID:', err);
    throw err;
  }
};

const setTokenAllowed = async (
  _token: string,
  _allowed: boolean,
  userPrivateKey: string,
  network: string
) => {
  try {
    const contract = await savingcirclescontract(network, userPrivateKey);
    const tx = await contract.setTokenAllowed(_token, _allowed);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error setting token allowance:', error);
    throw new Error('Failed to update token allowance.');
  }
};

const getMemberBalances = async (
  _id: string,
  userPrivateKey: string,
  network: string
) => {
  try {
    const contract = await savingcirclescontract(network, userPrivateKey);
    const circleId = ethers.parseUnits(_id, 0);
    const [members, balances] = await contract.getMemberBalances(circleId);

    return [members, balances];
    // return members.map((member: string, index: number) => ({
    //   member,
    //   balance: balances[index].toString(),
    // }));
  } catch (error) {
    console.error(`Error fetching member balances:`, error);
    throw new Error('Something went wrong, please retry');
  }
};

export {
  createSavingCircles,
  extractCircleIdFromReceipt,
  deposit,
  withdraw,
  getCircle,
  getMemberCircles,
  decommissionCircle,
  isTokenAllowed,
  setTokenAllowed,
  getMemberBalances,
};
