import {
  SupportedETHERLINKStables,
  SupportedLISKStables,
} from './supportedStables';

type Token = { USDT: string } | { USDC: string } | { WETH: string };

const tokenAddress = (tokenId: number): string => {
  if (tokenId < 1 || tokenId > SupportedETHERLINKStables.length) {
    throw new Error(`Invalid tokenId: ${tokenId}`);
  }

  const token: Token = SupportedETHERLINKStables[tokenId - 1];

  const tokenKey = Object.keys(token)[0];

  return token[tokenKey as keyof Token];
};

export { tokenAddress };
