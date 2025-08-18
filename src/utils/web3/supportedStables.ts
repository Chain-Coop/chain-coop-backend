import dotenv from 'dotenv';
dotenv.config();
export const SupportedLISKStables = [
  { USDT: process.env.SupportedLISKStables_USDT as string },
  { USDC: process.env.SupportedLISKStables_USDC as string },
];
export const SupportedETHERLINKStables = [
  { USDT: process.env.SupportedETHERLINKStables_USDT as string },
  { USDC: process.env.SupportedETHERLINKStables_USDC as string },
];
export const SupportedBSCStables = [
  { USDT: process.env.SupportedBSCStables_USDT as string },
  { USDC: process.env.SupportedBSCStables_USDC as string },
];
export const SupportedPOLYGONStables = [
  { USDT: process.env.SupportedPOLYGONStables_USDT as string },
  { USDC: process.env.SupportedPOLYGONStables_USDC as string },
];
