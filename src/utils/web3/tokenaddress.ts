import { SupportedLISKStables } from "./supportedStables";


type Token = { USDC: string } | { LISK: string } |{ WUSDC: string };

const tokenAddress = (tokenId: number): string => {
 
  if (tokenId < 1 || tokenId > SupportedLISKStables.length) {
    throw new Error(`Invalid tokenId: ${tokenId}`);
  }

  
  const token: Token = SupportedLISKStables[tokenId - 1];

  
  const tokenKey = Object.keys(token)[0];

 
  return token[tokenKey as keyof Token];
};


export {tokenAddress}