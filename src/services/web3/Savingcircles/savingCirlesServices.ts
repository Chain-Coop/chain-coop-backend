import {
  ethers,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  BigNumberish,
} from 'ethers';
import { approveTokenTransfer } from '../accountService';
import { SAVINGCIRCLESCONTRACT_LISK_TESTNET } from '../../../constant/contract/SavingCircles';
import { getTokenAddressSymbol } from '../accountService';
import {
  savingcirclescontract,
  userAddress,
} from '../../../utils/web3/savingContract';

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
  _maxDeposits: number
) => {
  try {
    const contract = await savingcirclescontract(userPrivateKey);
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

    console.log('Creating circle with data:', circle);
    const tx = await contract.create(circle);
    console.log('Transaction sent:', tx.hash);
    await tx.wait(1);
    console.log('Transaction confirmed');
    return tx;
  } catch (error: any) {
    console.error(`Error Opening a saving circle:`, error.message || error);
    throw new Error('Something went wrong, please retry.');
  }
};

const deposit = async (
  _token: string,
  _id: string,
  _value: string,
  userPrivateKey: string
) => {
  try {
    const approveTx = await approveTokenTransfer(
      _token,
      SAVINGCIRCLESCONTRACT_LISK_TESTNET,
      _value,
      userPrivateKey
    );
    if (!approveTx) {
      throw Error('Failed to approve transfer');
    }
    console.log('Allowance done');
    const contract = await savingcirclescontract(userPrivateKey);

    const tx = await contract.deposit(parseUnits(_id, 0), parseEther(_value));
    await tx.wait(1);
    return tx;
  } catch (error) {
    console.error('Error making deposit:', error);
    throw new Error('Deposit failed, please retry.');
  }
};

const depositFor = async (
  _id: number,
  _value: number,
  _member: string,
  userPrivateKey: string
) => {
  try {
    const contract = await savingcirclescontract(userPrivateKey);
    const tx = await contract.depositFor(
      _id,
      parseEther(_value.toString()),
      _member
    );
    await tx.wait(1);
    return tx;
  } catch (error) {
    console.error('Error making deposit for another member:', error);
    throw new Error('Deposit failed, please retry.');
  }
};

const withdraw = async (_id: string, userPrivateKey: string) => {
  try {
    const contract = await savingcirclescontract(userPrivateKey);

    const tx = await contract.withdraw(parseUnits(_id, 0));
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error withdrawing funds:', error);
    throw new Error('Withdrawal failed, please retry.');
  }
};
const withdrawFor = async (
  _id: number,
  _member: string,
  userPrivateKey: string
) => {
  try {
    const contract = await savingcirclescontract(userPrivateKey);
    const tx = await contract.withdrawFor(_id, _member);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error withdrawing for another member:', error);
    throw new Error('Withdrawal failed, please retry.');
  }
};
const getCircle = async (_id: string, userPrivateKey: string) => {
  try {
    const contract = await savingcirclescontract(userPrivateKey);
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
const getMemberCircles = async (userPrivateKey: string) => {
  try {
    const contract = await savingcirclescontract(userPrivateKey);
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
const decommissionCircle = async (_id: string, userPrivateKey: string) => {
  try {
    const contract = await savingcirclescontract(userPrivateKey);
    const tx = await contract.decommission(parseUnits(_id, 0));
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error decommissioning circle:', error);
    throw new Error('Decommission failed, please retry.');
  }
};

const isTokenAllowed = async (_token: string, userPrivateKey: string) => {
  try {
    const contract = await savingcirclescontract(userPrivateKey);
    const allowed = await contract.isTokenAllowed(_token);
    return allowed;
  } catch (error) {
    console.error('Error checking token allowance:', error);
    throw new Error('Could not fetch token allowance status.');
  }
};

const setTokenAllowed = async (
  _token: string,
  _allowed: boolean,
  userPrivateKey: string
) => {
  try {
    const contract = await savingcirclescontract(userPrivateKey);
    const tx = await contract.setTokenAllowed(_token, _allowed);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error setting token allowance:', error);
    throw new Error('Failed to update token allowance.');
  }
};

const getMemberBalances = async (_id: string, userPrivateKey: string) => {
  try {
    const contract = await savingcirclescontract(userPrivateKey);
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
  deposit,
  depositFor,
  withdraw,
  withdrawFor,
  getCircle,
  getMemberCircles,
  decommissionCircle,
  isTokenAllowed,
  setTokenAllowed,
  getMemberBalances,
};
