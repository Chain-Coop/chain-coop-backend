import { ethers, Provider } from 'ethers';

const Signer = async (
  privateKey: string,
  Provider: Provider
): Promise<ethers.Signer> => {
  const sig_ner = new ethers.Wallet(privateKey, Provider);
  return sig_ner;
};

export { Signer };
