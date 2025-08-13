import {
  SupportedETHERLINKStables,
  SupportedLISKStables,
  SupportedBSCStables,
  SupportedPOLYGONStables,
  SupportedTBSCStables,
  SupportedTPOLYGONStables,
} from './supportedStables';

type Token = { USDT: string } | { USDC: string };

const tokenAddress = (tokenId: number, network: string): string => {
  if (tokenId < 1 || tokenId > 2) {
    throw new Error(`Invalid token ID: ${tokenId}`);
  }

  let token: Token;
  if (network === 'LISK') {
    token = SupportedLISKStables[tokenId - 1];
  } else if (network === 'BSC') {
    token = SupportedBSCStables[tokenId - 1];
  } else if (network === 'ETHERLINK') {
    token = SupportedETHERLINKStables[tokenId - 1];
  } else if (network === 'POLYGON') {
    token = SupportedPOLYGONStables[tokenId - 1];
  } else if (network === 'TBSC') {
    token = SupportedTBSCStables[tokenId - 1];
  } else if (network === 'TPOLYGON') {
    token = SupportedTPOLYGONStables[tokenId - 1];
  } else {
    throw new Error(`Invalid token network: ${network}`);
  }

  const tokenKey = Object.keys(token)[0];

  return token[tokenKey as keyof Token];
};

export { tokenAddress };
